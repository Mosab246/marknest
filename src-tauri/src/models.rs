use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkWithRelations {
    pub id: String,
    pub url: String,
    pub title: Option<String>,
    pub author_name: Option<String>,
    pub author_handle: Option<String>,
    pub content: Option<String>,
    pub notes: Option<String>,
    pub summary: Option<String>,
    pub source: Option<String>,
    pub canonical_url: Option<String>,
    pub captured_title: Option<String>,
    pub captured_author: Option<String>,
    pub captured_description: Option<String>,
    pub captured_text: Option<String>,
    pub selected_text: Option<String>,
    pub site_name: Option<String>,
    pub favicon_url: Option<String>,
    pub image_url: Option<String>,
    pub video_url: Option<String>,
    pub tweet_id: Option<String>,
    pub capture_status: Option<String>,
    pub captured_at: Option<String>,
    pub capture_quality: Option<String>,
    pub capture_warning: Option<String>,
    pub posted_at: Option<String>,
    pub recaptured_at: Option<String>,
    #[serde(default)]
    pub highlight_count: i64,
    #[serde(rename = "type")]
    pub bookmark_type: String,
    pub status: String,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub folder_id: Option<String>,
    pub folder_name: Option<String>,
    pub tags: Vec<Tag>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureInput {
    pub url: String,
    pub canonical_url: Option<String>,
    pub title: Option<String>,
    pub captured_title: Option<String>,
    pub captured_author: Option<String>,
    pub captured_description: Option<String>,
    pub captured_text: Option<String>,
    pub selected_text: Option<String>,
    pub site_name: Option<String>,
    pub favicon_url: Option<String>,
    pub image_url: Option<String>,
    #[serde(alias = "videoUrl")]
    pub video_url: Option<String>,
    pub tweet_id: Option<String>,
    pub author_handle: Option<String>,
    pub source: Option<String>,
    #[serde(rename = "type")]
    pub bookmark_type: Option<String>,
    pub notes: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<String>,
    pub folder_name: Option<String>,
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
    pub capture_status: Option<String>,
    pub posted_at: Option<String>,
    #[serde(default)]
    pub highlight_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Highlight {
    pub id: String,
    pub bookmark_id: String,
    pub text: String,
    pub note: Option<String>,
    pub source: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureResult {
    pub bookmark: BookmarkWithRelations,
    pub updated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlight_added: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightInput {
    pub bookmark_id: String,
    pub text: String,
    pub note: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateHighlightInput {
    pub id: String,
    pub text: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureBridgeStatus {
    pub running: bool,
    pub port: u16,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkInput {
    pub url: String,
    pub title: Option<String>,
    pub author_name: Option<String>,
    pub author_handle: Option<String>,
    pub content: Option<String>,
    pub notes: Option<String>,
    pub summary: Option<String>,
    #[serde(rename = "type")]
    pub bookmark_type: String,
    pub status: String,
    pub is_favorite: bool,
    pub folder_name: Option<String>,
    pub tags_input: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBookmarkInput {
    pub id: String,
    pub url: String,
    pub title: Option<String>,
    pub author_name: Option<String>,
    pub author_handle: Option<String>,
    pub content: Option<String>,
    pub notes: Option<String>,
    pub summary: Option<String>,
    #[serde(rename = "type")]
    pub bookmark_type: String,
    pub status: String,
    pub is_favorite: bool,
    pub folder_name: Option<String>,
    pub tags_input: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkQuery {
    pub search: Option<String>,
    pub search_scope: Option<String>,
    pub folder_id: Option<String>,
    pub tag_id: Option<String>,
    pub bookmark_type: Option<String>,
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
    pub is_archived: Option<bool>,
    pub sort: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    pub exported_at: String,
    pub bookmarks: Vec<BookmarkWithRelations>,
    pub folders: Vec<Folder>,
    pub tags: Vec<Tag>,
    pub highlights: Vec<Highlight>,
}

pub fn validate_bookmark_type(t: &str) -> Result<(), String> {
    match t {
        "tweet" | "thread" | "article" | "video" | "other" => Ok(()),
        _ => Err(format!("Invalid type: {t}")),
    }
}

pub fn validate_status(s: &str) -> Result<(), String> {
    match s {
        "unread" | "read" | "archived" => Ok(()),
        _ => Err(format!("Invalid status: {s}")),
    }
}

pub fn validate_url(url: &str) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL is required".into());
    }
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return Err("URL must start with http:// or https://".into());
    }
    Ok(())
}
