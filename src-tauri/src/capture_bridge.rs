use std::sync::{Arc, Mutex};

use serde::Serialize;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use crate::db::{self, DbState};
use crate::models::CaptureInput;

pub const DEFAULT_PORT: u16 = 4763;

#[derive(Clone)]
pub struct CaptureBridgeState {
    pub running: Arc<Mutex<bool>>,
    pub port: u16,
    pub last_error: Arc<Mutex<Option<String>>>,
}

impl CaptureBridgeState {
    pub fn new(port: u16) -> Self {
        Self {
            running: Arc::new(Mutex::new(false)),
            port,
            last_error: Arc::new(Mutex::new(None)),
        }
    }

    pub fn status(&self) -> crate::models::CaptureBridgeStatus {
        let running = *self.running.lock().unwrap();
        let last_error = self.last_error.lock().unwrap().clone();
        crate::models::CaptureBridgeStatus {
            running,
            port: self.port,
            last_error,
        }
    }
}

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
    port: u16,
}

#[derive(Serialize)]
struct CaptureResponse {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    updated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    highlight_added: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn cors_headers(origin: Option<&str>) -> Vec<Header> {
    let allow_origin = origin.unwrap_or("*");
    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], allow_origin.as_bytes())
            .unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], b"GET, POST, OPTIONS").unwrap(),
        Header::from_bytes(
            &b"Access-Control-Allow-Headers"[..],
            b"Content-Type",
        )
        .unwrap(),
        Header::from_bytes(&b"Content-Type"[..], b"application/json").unwrap(),
    ]
}

fn json_response(
    status: StatusCode,
    body: &str,
    origin: Option<&str>,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let mut res = Response::from_string(body).with_status_code(status);
    for h in cors_headers(origin) {
        res = res.with_header(h);
    }
    res
}

fn handle_request(mut request: Request, db: &Arc<DbState>, port: u16) {
    let method = request.method().clone();
    let origin: Option<String> = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Origin"))
        .map(|h| h.value.to_string());
    let origin_ref = origin.as_deref();

    let path = request.url().to_string();
    let path_only = path.split('?').next().unwrap_or(&path);

    if method == Method::Options {
        let _ = request.respond(json_response(StatusCode(204), "", origin_ref));
        return;
    }

    if method == Method::Get && path_only == "/api/health" {
        let body = serde_json::to_string(&HealthResponse { ok: true, port }).unwrap_or_default();
        let _ = request.respond(json_response(StatusCode(200), &body, origin_ref));
        return;
    }

    if method == Method::Post && path_only == "/api/capture" {
        let mut body = String::new();
        if let Err(e) = request.as_reader().read_to_string(&mut body) {
            let resp = CaptureResponse {
                ok: false,
                id: None,
                updated: None,
                highlight_added: None,
                result: None,
                error: Some(format!("Failed to read body: {e}")),
            };
            let json = serde_json::to_string(&resp).unwrap_or_default();
            let _ = request.respond(json_response(StatusCode(400), &json, origin_ref));
            return;
        }

        match serde_json::from_str::<CaptureInput>(&body) {
            Ok(input) => match db::create_or_update_bookmark_from_capture(db, input) {
                Ok(result) => {
                    let resp = CaptureResponse {
                        ok: true,
                        id: Some(result.bookmark.id),
                        updated: Some(result.updated),
                        highlight_added: result.highlight_added,
                        result: result.result,
                        error: None,
                    };
                    let json = serde_json::to_string(&resp).unwrap_or_default();
                    let _ = request.respond(json_response(StatusCode(200), &json, origin_ref));
                }
                Err(e) => {
                    let resp = CaptureResponse {
                        ok: false,
                        id: None,
                        updated: None,
                        highlight_added: None,
                        result: None,
                        error: Some(e.to_string()),
                    };
                    let json = serde_json::to_string(&resp).unwrap_or_default();
                    let _ = request.respond(json_response(StatusCode(400), &json, origin_ref));
                }
            },
            Err(e) => {
                let resp = CaptureResponse {
                    ok: false,
                    id: None,
                    updated: None,
                    highlight_added: None,
                    result: None,
                    error: Some(format!("Invalid JSON: {e}")),
                };
                let json = serde_json::to_string(&resp).unwrap_or_default();
                let _ = request.respond(json_response(StatusCode(400), &json, origin_ref));
            }
        }
        return;
    }

    let resp = CaptureResponse {
        ok: false,
        id: None,
        updated: None,
        highlight_added: None,
        result: None,
        error: Some("Not found".into()),
    };
    let json = serde_json::to_string(&resp).unwrap_or_default();
    let _ = request.respond(json_response(StatusCode(404), &json, origin_ref));
}

pub fn start(
    db: Arc<DbState>,
    bridge_state: CaptureBridgeState,
) -> Result<(), String> {
    let addr = format!("127.0.0.1:{}", bridge_state.port);
    let server = Server::http(&addr).map_err(|e| {
        format!(
            "Capture bridge could not bind to {addr}. Is port {} in use? ({e})",
            bridge_state.port
        )
    })?;

    {
        let mut running = bridge_state.running.lock().unwrap();
        *running = true;
    }
    *bridge_state.last_error.lock().unwrap() = None;

    let port = bridge_state.port;
    let running_flag = bridge_state.running.clone();

    std::thread::spawn(move || {
        log::info!("Capture bridge listening on http://127.0.0.1:{port}");
        for request in server.incoming_requests() {
            handle_request(request, &db, port);
        }
        let mut running = running_flag.lock().unwrap();
        *running = false;
    });

    Ok(())
}
