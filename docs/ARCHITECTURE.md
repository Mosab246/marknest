# Architecture

MarkNest is a **local-first** desktop application. All library data stays on your machine. There is no MarkNest cloud backend.

## Components

| Layer | Technology | Role |
| ----- | ------------ | ---- |
| Desktop shell | [Tauri 2](https://tauri.app/) | Window, system tray, native dialogs, autostart |
| Frontend | React + TypeScript + Vite | Library UI, settings, detail views |
| Backend | Rust (`marknest_lib`) | SQLite access, migrations, Tauri commands |
| Persistence | SQLite (`rusqlite`, bundled) | Bookmarks, tags, folders, FTS index, highlights |
| Capture bridge | `tiny_http` on `127.0.0.1:4763` | Accepts saves from the optional Chrome extension |
| Browser capture | Chrome extension (MV3) | Reads page DOM locally; POSTs JSON to the bridge |

The **core app** runs without the extension: you can create, edit, search, and export bookmarks manually.

The **extension is optional** but is the primary way to save content while browsing.

## High-level data flow

```text
┌─────────────────┐     POST /api/capture      ┌──────────────────┐
│ Chrome          │ ─────────────────────────► │ Capture bridge   │
│ extension       │     (127.0.0.1:4763)       │ (Rust / tiny_http)│
└─────────────────┘                            └────────┬─────────┘
                                                        │
                                                        ▼
┌─────────────────┐     Tauri invoke commands  ┌──────────────────┐
│ React UI        │ ◄────────────────────────► │ Rust backend     │
│ (Library, etc.) │                            │ db.rs, fts, etc. │
└─────────────────┘                            └────────┬─────────┘
                                                        │
                                                        ▼
                                               ┌──────────────────┐
                                               │ marknest.db      │
                                               │ (app data dir)   │
                                               └──────────────────┘
```

### Bridge API

| Endpoint | Method | Purpose |
| -------- | ------ | ------- |
| `/api/health` | GET | `{ "ok": true, "port": 4763 }` when the app is running |
| `/api/capture` | POST | JSON body → create or update bookmark from capture payload |

The bridge binds to **loopback only** (`127.0.0.1`), not the LAN.

### Desktop ↔ Rust

The UI calls Tauri commands defined in `src-tauri/src/commands.rs` (bookmarks, tags, folders, export, settings, highlights, bridge status, backup). State is managed in `lib.rs` setup: database, bridge, app settings, and (on desktop) system tray.

### Extension ↔ bridge

`extension/sharedCapture.js` extracts page metadata and text in the content script, then `background.js` / `popup.js` POST to the bridge. No MarkNest-hosted API is involved.

## Frontend structure

- `src/App.tsx` — shell entry
- `src/components/AppShell.tsx` — layout (sidebar, list, detail)
- `src/views/LibraryView.tsx`, `SettingsView.tsx` — main screens
- `src/lib/api.ts` — Tauri invoke wrappers
- `src/components/ui/` — shadcn-style primitives

## Backend structure

- `db.rs` — CRUD, capture ingest, export
- `migration.rs` — schema versions
- `fts.rs` — full-text search index
- `highlights.rs` — per-bookmark highlights
- `capture_bridge.rs` — HTTP server thread
- `tray.rs` — tray menu and window visibility (desktop)
- `app_settings.rs` — `settings.json` in app data dir

## Persistence layout

On each OS, Tauri uses identifier `com.marknest.app`:

- **`marknest.db`** — SQLite library
- **`settings.json`** — tray, startup, UI preferences

Paths are documented in [README.md](../README.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Security and privacy

See [SECURITY.md](../SECURITY.md) and [PRIVACY.md](../PRIVACY.md) for bridge trust model, extension permissions, and optional external embeds (e.g. X tweet player iframes).

## Related docs

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [RELEASE.md](RELEASE.md)
- [SMOKE_CAPTURE.md](SMOKE_CAPTURE.md)
- [SMOKE_DESKTOP.md](SMOKE_DESKTOP.md)
