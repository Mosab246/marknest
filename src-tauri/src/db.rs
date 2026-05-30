use std::path::PathBuf;
use std::sync::Mutex;

use chrono::Utc;
use rusqlite::{params, Connection};
use thiserror::Error;
use uuid::Uuid;

use crate::capture_quality;
use crate::fts;
use crate::highlights;
use crate::migration;
use crate::models::{
    validate_bookmark_type, validate_status, validate_url, BookmarkInput, BookmarkQuery,
    BookmarkWithRelations, CaptureInput, CaptureResult, ExportPayload, Folder, Highlight,
    HighlightInput, Tag, UpdateBookmarkInput, UpdateHighlightInput,
};
use crate::url_utils::{
    default_bookmark_type, detect_source, extract_handle_from_tweet_url, extract_tweet_id,
    normalize_url,
};

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("{0}")]
    Validation(String),
    #[error("Bookmark not found")]
    NotFound,
}

pub struct DbState {
    pub conn: Mutex<Connection>,
    pub path: PathBuf,
}

impl DbState {
    pub fn new(db_path: PathBuf) -> Result<Self, DbError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                DbError::Validation(format!("Failed to create data directory: {e}"))
            })?;
        }
        let conn = Connection::open(&db_path)?;
        init_schema(&conn)?;
        migration::run_migrations(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
            path: db_path,
        })
    }

    pub fn db_path(&self) -> PathBuf {
        self.path.clone()
    }
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn init_schema(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO schema_version (version) VALUES (1);

        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            author_name TEXT,
            author_handle TEXT,
            content TEXT,
            notes TEXT,
            summary TEXT,
            type TEXT NOT NULL,
            status TEXT NOT NULL,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            folder_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS bookmark_tags (
            bookmark_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (bookmark_id, tag_id),
            FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_bookmarks_updated_at ON bookmarks(updated_at);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_is_archived ON bookmarks(is_archived);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_is_favorite ON bookmarks(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_id ON bookmarks(folder_id);
        "#,
    )?;
    Ok(())
}

fn escape_like(term: &str) -> String {
    term.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

pub fn normalize_tag_names(input: &str) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for part in input.split(',') {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }
        let key = trimmed.to_lowercase();
        if seen.insert(key.clone()) {
            out.push(key);
        }
    }
    out
}

fn get_or_create_folder(conn: &Connection, name: &str) -> Result<Option<String>, DbError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM folders WHERE name = ?1 COLLATE NOCASE",
        [trimmed],
        |row| row.get(0),
    ).ok();
    if let Some(id) = existing {
        return Ok(Some(id));
    }
    let id = Uuid::new_v4().to_string();
    let now = now_iso();
    conn.execute(
        "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, trimmed, now, now],
    )?;
    Ok(Some(id))
}

fn get_or_create_tag(conn: &Connection, name: &str) -> Result<String, DbError> {
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
        [name],
        |row| row.get(0),
    ).ok();
    if let Some(id) = existing {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    let now = now_iso();
    conn.execute(
        "INSERT INTO tags (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, name, now, now],
    )?;
    Ok(id)
}

fn sync_bookmark_tags(
    conn: &Connection,
    bookmark_id: &str,
    tags_input: Option<&str>,
) -> Result<(), DbError> {
    conn.execute(
        "DELETE FROM bookmark_tags WHERE bookmark_id = ?1",
        [bookmark_id],
    )?;
    if let Some(input) = tags_input {
        for tag_name in normalize_tag_names(input) {
            let tag_id = get_or_create_tag(conn, &tag_name)?;
            conn.execute(
                "INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?1, ?2)",
                params![bookmark_id, tag_id],
            )?;
        }
    }
    Ok(())
}

fn load_tags_for_bookmark(conn: &Connection, bookmark_id: &str) -> Result<Vec<Tag>, DbError> {
    let mut stmt = conn.prepare(
        r#"SELECT t.id, t.name, t.created_at, t.updated_at
           FROM tags t
           INNER JOIN bookmark_tags bt ON bt.tag_id = t.id
           WHERE bt.bookmark_id = ?1
           ORDER BY t.name ASC"#,
    )?;
    let tags = stmt
        .query_map([bookmark_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(tags)
}

fn row_to_bookmark_with_relations(
    conn: &Connection,
    row: &rusqlite::Row<'_>,
) -> Result<BookmarkWithRelations, DbError> {
    let id: String = row.get("id")?;
    let folder_name: Option<String> = row.get("folder_name").ok();
    let tags = load_tags_for_bookmark(conn, &id)?;
    Ok(BookmarkWithRelations {
        id,
        url: row.get("url")?,
        title: row.get("title")?,
        author_name: row.get("author_name")?,
        author_handle: row.get("author_handle")?,
        content: row.get("content")?,
        notes: row.get("notes")?,
        summary: row.get("summary")?,
        source: row.get("source").ok(),
        canonical_url: row.get("canonical_url").ok(),
        captured_title: row.get("captured_title").ok(),
        captured_author: row.get("captured_author").ok(),
        captured_description: row.get("captured_description").ok(),
        captured_text: row.get("captured_text").ok(),
        selected_text: row.get("selected_text").ok(),
        site_name: row.get("site_name").ok(),
        favicon_url: row.get("favicon_url").ok(),
        image_url: row.get("image_url").ok(),
        video_url: row.get("video_url").ok(),
        tweet_id: row.get("tweet_id").ok(),
        capture_status: row.get("capture_status").ok(),
        captured_at: row.get("captured_at").ok(),
        capture_quality: row.get("capture_quality").ok(),
        capture_warning: row.get("capture_warning").ok(),
        posted_at: row.get("posted_at").ok(),
        recaptured_at: row.get("recaptured_at").ok(),
        highlight_count: row.get::<_, i64>("highlight_count").unwrap_or(0),
        bookmark_type: row.get("type")?,
        status: row.get("status")?,
        is_favorite: row.get::<_, i32>("is_favorite")? != 0,
        is_archived: row.get::<_, i32>("is_archived")? != 0,
        folder_id: row.get("folder_id")?,
        folder_name,
        tags,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const BOOKMARK_SELECT: &str = r#"
    SELECT b.id, b.url, b.title, b.author_name, b.author_handle, b.content, b.notes, b.summary,
           b.source, b.canonical_url, b.captured_title, b.captured_author, b.captured_description,
           b.captured_text, b.selected_text, b.site_name, b.favicon_url, b.image_url, b.video_url,
           b.tweet_id, b.capture_status, b.captured_at,
           b.capture_quality, b.capture_warning, b.posted_at, b.recaptured_at,
           (SELECT COUNT(*) FROM highlights h WHERE h.bookmark_id = b.id) AS highlight_count,
           b.type, b.status, b.is_favorite, b.is_archived, b.folder_id, f.name AS folder_name,
           b.created_at, b.updated_at
    FROM bookmarks b
    LEFT JOIN folders f ON f.id = b.folder_id
"#;

pub fn create_bookmark(state: &DbState, input: BookmarkInput) -> Result<BookmarkWithRelations, DbError> {
    validate_url(&input.url).map_err(DbError::Validation)?;
    validate_bookmark_type(&input.bookmark_type).map_err(DbError::Validation)?;
    validate_status(&input.status).map_err(DbError::Validation)?;

    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let id = Uuid::new_v4().to_string();
    let now = now_iso();
    let folder_id = match &input.folder_name {
        Some(n) => get_or_create_folder(&conn, n)?,
        None => None,
    };

    conn.execute(
        r#"INSERT INTO bookmarks (
            id, url, title, author_name, author_handle, content, notes, summary,
            type, status, is_favorite, is_archived, folder_id, created_at, updated_at
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,0,?12,?13,?14)"#,
        params![
            id,
            input.url.trim(),
            input.title,
            input.author_name,
            input.author_handle,
            input.content,
            input.notes,
            input.summary,
            input.bookmark_type,
            input.status,
            input.is_favorite as i32,
            folder_id,
            now,
            now,
        ],
    )?;
    sync_bookmark_tags(&conn, &id, input.tags_input.as_deref())?;
    fts::index_bookmark(&conn, &id)?;
    drop(conn);
    get_bookmark(state, &id)
}

fn legacy_search_condition() -> String {
    r#"(
        b.url LIKE ? ESCAPE '\'
        OR b.title LIKE ? ESCAPE '\'
        OR b.author_name LIKE ? ESCAPE '\'
        OR b.author_handle LIKE ? ESCAPE '\'
        OR b.content LIKE ? ESCAPE '\'
        OR b.notes LIKE ? ESCAPE '\'
        OR b.summary LIKE ? ESCAPE '\'
        OR b.captured_title LIKE ? ESCAPE '\'
        OR b.captured_author LIKE ? ESCAPE '\'
        OR b.captured_description LIKE ? ESCAPE '\'
        OR b.captured_text LIKE ? ESCAPE '\'
        OR b.selected_text LIKE ? ESCAPE '\'
        OR b.site_name LIKE ? ESCAPE '\'
        OR b.canonical_url LIKE ? ESCAPE '\'
        OR b.source LIKE ? ESCAPE '\'
        OR b.tweet_id LIKE ? ESCAPE '\'
        OR EXISTS (
            SELECT 1 FROM bookmark_tags bt2
            INNER JOIN tags t ON t.id = bt2.tag_id
            WHERE bt2.bookmark_id = b.id AND t.name LIKE ? ESCAPE '\'
        )
        OR EXISTS (
            SELECT 1 FROM folders f2
            WHERE f2.id = b.folder_id AND f2.name LIKE ? ESCAPE '\'
        )
    )"#
    .to_string()
}

fn tweet_display_title(author_name: &Option<String>, author_handle: &Option<String>) -> String {
    if let Some(n) = author_name.as_ref().filter(|s| !s.trim().is_empty()) {
        return format!("{} on X", n.trim());
    }
    if let Some(h) = author_handle.as_ref().filter(|s| !s.trim().is_empty()) {
        let handle = h.trim().trim_start_matches('@');
        return format!("@{handle} on X");
    }
    "Post on X".to_string()
}

fn is_auto_tweet_title(title: &Option<String>) -> bool {
    title
        .as_ref()
        .map(|t| t.trim().ends_with(" on X") || t.trim() == "Post on X")
        .unwrap_or(true)
}

fn text_quality_score(s: &Option<String>) -> usize {
    s.as_ref().map(|t| t.trim().len()).unwrap_or(0)
}

fn pick_better_text(existing: &Option<String>, new_val: &Option<String>) -> Option<String> {
    if text_quality_score(new_val) > text_quality_score(existing) {
        return new_val.clone();
    }
    existing.clone()
}

fn merge_tags_input(existing: &[Tag], new_input: Option<&str>) -> Option<String> {
    let mut names: Vec<String> = existing.iter().map(|t| t.name.clone()).collect();
    if let Some(input) = new_input {
        for name in normalize_tag_names(input) {
            if !names.iter().any(|n| n.eq_ignore_ascii_case(&name)) {
                names.push(name);
            }
        }
    }
    if names.is_empty() {
        None
    } else {
        Some(names.join(", "))
    }
}

fn find_existing_bookmark_id(
    conn: &Connection,
    url: &str,
    tweet_id: &Option<String>,
) -> Result<Option<String>, DbError> {
    if let Some(tid) = tweet_id.as_ref().filter(|s| !s.is_empty()) {
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM bookmarks WHERE tweet_id = ?1 LIMIT 1",
                [tid],
                |row| row.get(0),
            )
            .ok();
        if existing.is_some() {
            return Ok(existing);
        }
    }

    let normalized = normalize_url(url);
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM bookmarks WHERE url = ?1 OR url = ?2 LIMIT 1",
            params![url, normalized],
            |row| row.get(0),
        )
        .ok();
    Ok(existing)
}

pub fn create_or_update_bookmark_from_capture(
    state: &DbState,
    input: CaptureInput,
) -> Result<CaptureResult, DbError> {
    let selected_text = input.selected_text.clone();
    let highlight_note = input.highlight_note.clone();

    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let url = normalize_url(&input.url);
    validate_url(&url).map_err(DbError::Validation)?;

    let tweet_id = input
        .tweet_id
        .clone()
        .or_else(|| extract_tweet_id(&url));

    if let Some(existing_id) = find_existing_bookmark_id(&conn, &url, &tweet_id)? {
        drop(conn);
        let result = update_bookmark_from_capture(state, &existing_id, input)?;
        return finish_capture_result(state, result, selected_text, highlight_note);
    }
    drop(conn);
    let bookmark = insert_bookmark_from_capture(state, input)?;
    let result = CaptureResult {
        bookmark,
        updated: false,
        highlight_added: None,
        result: Some("created".to_string()),
    };
    finish_capture_result(state, result, selected_text, highlight_note)
}

fn pick_posted_at(existing: &Option<String>, input: &Option<String>) -> Option<String> {
    if input.as_ref().is_some_and(|s| !s.trim().is_empty()) {
        input.clone()
    } else {
        existing.clone()
    }
}

fn finish_capture_result(
    state: &DbState,
    mut result: CaptureResult,
    selected_text: Option<String>,
    highlight_note: Option<String>,
) -> Result<CaptureResult, DbError> {
    if result.result.is_none() {
        result.result = Some(if result.updated {
            "updated_existing".to_string()
        } else {
            "created".to_string()
        });
    }

    if let Some(sel) = selected_text
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
        match highlights::try_create_highlight(
            &conn,
            &result.bookmark.id,
            sel,
            highlight_note,
            Some("extension".to_string()),
        )? {
            highlights::HighlightCreateOutcome::Created(_) => {
                result.highlight_added = Some(true);
                result.result = Some("highlight_added".to_string());
            }
            highlights::HighlightCreateOutcome::AlreadyExists => {
                result.result = Some("highlight_already_exists".to_string());
            }
        }
        fts::index_bookmark(&conn, &result.bookmark.id)?;
        drop(conn);
        result.bookmark = get_bookmark(state, &result.bookmark.id)?;
    }
    Ok(result)
}

fn insert_bookmark_from_capture(
    state: &DbState,
    input: CaptureInput,
) -> Result<BookmarkWithRelations, DbError> {
    let url = normalize_url(&input.url);
    validate_url(&url).map_err(DbError::Validation)?;

    let source = input
        .source
        .clone()
        .unwrap_or_else(|| detect_source(&url).to_string());

    let tweet_id = input
        .tweet_id
        .clone()
        .or_else(|| extract_tweet_id(&url));

    let author_handle = input.author_handle.clone().or_else(|| {
        if source == "x" {
            extract_handle_from_tweet_url(&url)
        } else {
            None
        }
    });

    let bookmark_type = input
        .bookmark_type
        .clone()
        .unwrap_or_else(|| default_bookmark_type(&url, &source).to_string());
    validate_bookmark_type(&bookmark_type).map_err(DbError::Validation)?;

    let status = input
        .status
        .clone()
        .unwrap_or_else(|| "unread".to_string());
    validate_status(&status).map_err(DbError::Validation)?;

    let is_favorite = input.is_favorite.unwrap_or(false);
    let now = now_iso();

    let author_name = input.captured_author.clone();
    let title: Option<String> = if source == "x" && tweet_id.is_some() {
        Some(
            input
                .title
                .clone()
                .filter(|t| !t.trim().is_empty())
                .unwrap_or_else(|| tweet_display_title(&author_name, &author_handle)),
        )
    } else {
        input.title.clone().or(input.captured_title.clone())
    };

    let capture_status = input
        .capture_status
        .clone()
        .unwrap_or_else(|| "captured".to_string());
    let assessment =
        capture_quality::classify_capture(&input.captured_text, &Some(capture_status.clone()));
    let posted_at = pick_posted_at(&None, &input.posted_at);

    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let id = Uuid::new_v4().to_string();
    let folder_id = match &input.folder_name {
        Some(n) => get_or_create_folder(&conn, n)?,
        None => None,
    };

    conn.execute(
        r#"INSERT INTO bookmarks (
            id, url, title, author_name, author_handle, content, notes, summary,
            source, canonical_url, captured_title, captured_author, captured_description,
            captured_text, selected_text, site_name, favicon_url, image_url, video_url,
            tweet_id, capture_status, captured_at,
            capture_quality, capture_warning, posted_at, recaptured_at,
            type, status, is_favorite, is_archived, folder_id, created_at, updated_at
        ) VALUES (
            ?1,?2,?3,?4,?5,NULL,?6,?7,
            ?8,?9,?10,?11,?12,
            ?13,?14,?15,?16,?17,?18,
            ?19,?20,?21,
            ?22,?23,?24,?25,
            ?26,?27,?28,0,?29,?30,?31
        )"#,
        params![
            id,
            url,
            title,
            author_name,
            author_handle,
            input.notes,
            input.summary,
            source,
            input.canonical_url,
            input.captured_title,
            input.captured_author,
            input.captured_description,
            input.captured_text,
            input.selected_text,
            input.site_name,
            input.favicon_url,
            input.image_url,
            input.video_url,
            tweet_id,
            capture_status,
            now,
            assessment.quality,
            assessment.warning,
            posted_at,
            None::<String>,
            bookmark_type,
            status,
            is_favorite as i32,
            folder_id,
            now,
            now,
        ],
    )?;
    sync_bookmark_tags(&conn, &id, input.tags.as_deref())?;
    fts::index_bookmark(&conn, &id)?;
    drop(conn);
    get_bookmark(state, &id)
}

fn update_bookmark_from_capture(
    state: &DbState,
    existing_id: &str,
    input: CaptureInput,
) -> Result<CaptureResult, DbError> {
    let existing = get_bookmark(state, existing_id)?;
    let url = normalize_url(&input.url);
    validate_url(&url).map_err(DbError::Validation)?;

    let source = input
        .source
        .clone()
        .unwrap_or_else(|| detect_source(&url).to_string());

    let tweet_id = input
        .tweet_id
        .clone()
        .or_else(|| extract_tweet_id(&url))
        .or(existing.tweet_id.clone());

    let author_handle = input
        .author_handle
        .clone()
        .or(existing.author_handle.clone());

    let author_name = input
        .captured_author
        .clone()
        .or(existing.author_name.clone())
        .or(existing.captured_author.clone());

    let bookmark_type = input
        .bookmark_type
        .clone()
        .unwrap_or(existing.bookmark_type.clone());
    validate_bookmark_type(&bookmark_type).map_err(DbError::Validation)?;

    let title: Option<String> = if source == "x" && tweet_id.is_some() {
        if is_auto_tweet_title(&existing.title) {
            Some(
                input
                    .title
                    .clone()
                    .filter(|t| !t.trim().is_empty())
                    .unwrap_or_else(|| tweet_display_title(&author_name, &author_handle)),
            )
        } else {
            existing.title.clone()
        }
    } else {
        input.title.clone().or(existing.title.clone())
    };

    let notes = if input
        .notes
        .as_ref()
        .map(|n| !n.trim().is_empty())
        .unwrap_or(false)
    {
        input.notes.clone()
    } else {
        existing.notes.clone()
    };

    let captured_text = pick_better_text(&existing.captured_text, &input.captured_text);
    let selected_text = pick_better_text(&existing.selected_text, &input.selected_text);
    let captured_description =
        pick_better_text(&existing.captured_description, &input.captured_description);
    let video_url = capture_quality::pick_video_url(&input.video_url, &existing.video_url);
    let image_url = capture_quality::pick_poster_image_url(
        &input.image_url,
        &existing.image_url,
        &video_url,
    );
    let canonical_url = input
        .canonical_url
        .clone()
        .or(existing.canonical_url.clone());
    let capture_status = input
        .capture_status
        .clone()
        .or(existing.capture_status.clone())
        .unwrap_or_else(|| "captured".to_string());
    let assessment =
        capture_quality::classify_capture(&captured_text, &Some(capture_status.clone()));
    let posted_at = pick_posted_at(&existing.posted_at, &input.posted_at);
    let recaptured_at = if capture_quality::text_improved(&existing.captured_text, &captured_text)
        || capture_quality::video_improved(&existing.video_url, &video_url)
    {
        Some(now_iso())
    } else {
        existing.recaptured_at.clone()
    };

    let is_favorite = if input.is_favorite.unwrap_or(false) {
        true
    } else {
        existing.is_favorite
    };

    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let folder_id = match &input.folder_name {
        Some(n) if !n.trim().is_empty() => get_or_create_folder(&conn, n)?,
        _ => existing.folder_id.clone(),
    };
    let now = now_iso();

    conn.execute(
        r#"UPDATE bookmarks SET
            url = ?2, title = ?3, author_name = ?4, author_handle = ?5,
            notes = ?6, summary = COALESCE(?7, summary),
            source = ?8, canonical_url = ?9,
            captured_title = COALESCE(?10, captured_title),
            captured_author = COALESCE(?11, captured_author),
            captured_description = ?12,
            captured_text = ?13, selected_text = ?14,
            site_name = COALESCE(?15, site_name),
            favicon_url = COALESCE(?16, favicon_url),
            image_url = ?17, video_url = ?18, tweet_id = COALESCE(?19, tweet_id),
            capture_status = ?20, captured_at = ?21,
            capture_quality = ?22, capture_warning = ?23, posted_at = ?24, recaptured_at = ?25,
            type = ?26, is_favorite = ?27, folder_id = ?28, updated_at = ?29
        WHERE id = ?1"#,
        params![
            existing_id,
            url,
            title,
            author_name,
            author_handle,
            notes,
            input.summary,
            source,
            canonical_url,
            input.captured_title,
            input.captured_author,
            captured_description,
            captured_text,
            selected_text,
            input.site_name,
            input.favicon_url,
            image_url,
            video_url,
            tweet_id,
            capture_status,
            now,
            assessment.quality,
            assessment.warning,
            posted_at,
            recaptured_at,
            bookmark_type,
            is_favorite as i32,
            folder_id,
            now,
        ],
    )?;

    let merged_tags = merge_tags_input(&existing.tags, input.tags.as_deref());
    sync_bookmark_tags(&conn, existing_id, merged_tags.as_deref())?;
    fts::index_bookmark(&conn, existing_id)?;
    drop(conn);

    let bookmark = get_bookmark(state, existing_id)?;
    Ok(CaptureResult {
        bookmark,
        updated: true,
        highlight_added: None,
        result: None,
    })
}

/// Backward-compatible alias for capture bridge.
pub fn create_bookmark_from_capture(
    state: &DbState,
    input: CaptureInput,
) -> Result<BookmarkWithRelations, DbError> {
    create_or_update_bookmark_from_capture(state, input).map(|r| r.bookmark)
}

pub fn get_bookmark(state: &DbState, id: &str) -> Result<BookmarkWithRelations, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let sql = format!("{BOOKMARK_SELECT} WHERE b.id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query([id])?;
    if let Some(row) = rows.next()? {
        return row_to_bookmark_with_relations(&conn, row);
    }
    Err(DbError::NotFound)
}

pub fn get_bookmarks(
    state: &DbState,
    query: BookmarkQuery,
) -> Result<Vec<BookmarkWithRelations>, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;

    let mut conditions = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    let is_archived = query.is_archived.unwrap_or(false);
    conditions.push("b.is_archived = ?".to_string());
    params_vec.push(Box::new(is_archived as i32));

    if let Some(folder_id) = &query.folder_id {
        conditions.push("b.folder_id = ?".to_string());
        params_vec.push(Box::new(folder_id.clone()));
    }
    if let Some(tag_id) = &query.tag_id {
        conditions.push(
            "EXISTS (SELECT 1 FROM bookmark_tags bt WHERE bt.bookmark_id = b.id AND bt.tag_id = ?)"
                .to_string(),
        );
        params_vec.push(Box::new(tag_id.clone()));
    }
    if let Some(bt) = &query.bookmark_type {
        conditions.push("b.type = ?".to_string());
        params_vec.push(Box::new(bt.clone()));
    }
    if let Some(status) = &query.status {
        conditions.push("b.status = ?".to_string());
        params_vec.push(Box::new(status.clone()));
    }
    if let Some(fav) = query.is_favorite {
        conditions.push("b.is_favorite = ?".to_string());
        params_vec.push(Box::new(fav as i32));
    }
    let trimmed_search = query.search.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty());
    if let Some(scope) = query.search_scope.as_deref() {
        match scope {
            "tweets" => conditions.push("b.type IN ('tweet', 'thread')".to_string()),
            "articles" => conditions.push("b.type IN ('article', 'video')".to_string()),
            "highlights" => {
                if let Some(trimmed) = trimmed_search {
                    let pattern = format!("%{}%", escape_like(trimmed));
                    conditions.push(
                        "EXISTS (SELECT 1 FROM highlights h WHERE h.bookmark_id = b.id AND (h.text LIKE ? ESCAPE '\\' OR COALESCE(h.note,'') LIKE ? ESCAPE '\\'))".to_string(),
                    );
                    params_vec.push(Box::new(pattern.clone()));
                    params_vec.push(Box::new(pattern));
                } else {
                    conditions.push(
                        "EXISTS (SELECT 1 FROM highlights h WHERE h.bookmark_id = b.id)".to_string(),
                    );
                }
            }
            "notes" => {
                conditions.push("b.notes IS NOT NULL AND TRIM(b.notes) != ''".to_string());
                if let Some(trimmed) = trimmed_search {
                    conditions.push("b.notes LIKE ? ESCAPE '\\'".to_string());
                    params_vec.push(Box::new(format!("%{}%", escape_like(trimmed))));
                }
            }
            _ => {}
        }
    }
    let fts_query = trimmed_search.and_then(fts::build_fts_match_query);
    let use_fts = fts_query.is_some() && fts::fts_table_exists(&conn);

    if !use_fts {
        if let Some(trimmed) = trimmed_search {
            let pattern = format!("%{}%", escape_like(trimmed));
            conditions.push(legacy_search_condition());
            for _ in 0..17 {
                params_vec.push(Box::new(pattern.clone()));
            }
        }
    }

    let sort = query.sort.as_deref().unwrap_or("newest");
    let order = if use_fts {
        "fts.rank ASC, b.updated_at DESC".to_string()
    } else {
        match sort {
            "oldest" => "b.created_at ASC".to_string(),
            "updated" => "b.updated_at DESC".to_string(),
            _ => "b.created_at DESC".to_string(),
        }
    };

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let sql = if use_fts {
        let fts_match = fts_query.clone().unwrap();
        let mut fts_params: Vec<Box<dyn rusqlite::types::ToSql>> =
            vec![Box::new(fts_match)];
        fts_params.extend(params_vec);
        params_vec = fts_params;
        format!(
            "{BOOKMARK_SELECT} INNER JOIN (
                SELECT bookmark_id, bm25(bookmarks_fts) AS rank
                FROM bookmarks_fts
                WHERE bookmarks_fts MATCH ?
            ) fts ON fts.bookmark_id = b.id{where_clause} ORDER BY {order}"
        )
    } else {
        format!("{BOOKMARK_SELECT}{where_clause} ORDER BY {order}")
    };
    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();
    let mut rows = stmt.query(params_refs.as_slice())?;
    let mut results = Vec::new();
    while let Some(row) = rows.next()? {
        results.push(row_to_bookmark_with_relations(&conn, row)?);
    }
    Ok(results)
}

pub fn update_bookmark(
    state: &DbState,
    input: UpdateBookmarkInput,
) -> Result<BookmarkWithRelations, DbError> {
    validate_url(&input.url).map_err(DbError::Validation)?;
    validate_bookmark_type(&input.bookmark_type).map_err(DbError::Validation)?;
    validate_status(&input.status).map_err(DbError::Validation)?;

    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM bookmarks WHERE id = ?1",
        [&input.id],
        |row| row.get(0),
    )?;
    if exists == 0 {
        return Err(DbError::NotFound);
    }

    let folder_id = match &input.folder_name {
        Some(n) => get_or_create_folder(&conn, n)?,
        None => None,
    };
    let now = now_iso();

    conn.execute(
        r#"UPDATE bookmarks SET
            url = ?2, title = ?3, author_name = ?4, author_handle = ?5,
            content = ?6, notes = ?7, summary = ?8, type = ?9, status = ?10,
            is_favorite = ?11, folder_id = ?12, updated_at = ?13
        WHERE id = ?1"#,
        params![
            input.id,
            input.url.trim(),
            input.title,
            input.author_name,
            input.author_handle,
            input.content,
            input.notes,
            input.summary,
            input.bookmark_type,
            input.status,
            input.is_favorite as i32,
            folder_id,
            now,
        ],
    )?;
    sync_bookmark_tags(&conn, &input.id, input.tags_input.as_deref())?;
    fts::index_bookmark(&conn, &input.id)?;
    drop(conn);
    get_bookmark(state, &input.id)
}

pub fn delete_bookmark(state: &DbState, id: &str) -> Result<(), DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    fts::remove_bookmark(&conn, id)?;
    let n = conn.execute("DELETE FROM bookmarks WHERE id = ?1", [id])?;
    if n == 0 {
        return Err(DbError::NotFound);
    }
    Ok(())
}

pub fn archive_bookmark(state: &DbState, id: &str) -> Result<BookmarkWithRelations, DbError> {
    set_archive(state, id, true)
}

pub fn unarchive_bookmark(state: &DbState, id: &str) -> Result<BookmarkWithRelations, DbError> {
    set_archive(state, id, false)
}

fn set_archive(state: &DbState, id: &str, archived: bool) -> Result<BookmarkWithRelations, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let (is_archived, status) = if archived {
        (1, "archived")
    } else {
        (0, "unread")
    };
    let n = conn.execute(
        "UPDATE bookmarks SET is_archived = ?2, status = ?3, updated_at = ?4 WHERE id = ?1",
        params![id, is_archived, status, now_iso()],
    )?;
    if n == 0 {
        return Err(DbError::NotFound);
    }
    drop(conn);
    get_bookmark(state, id)
}

pub fn toggle_favorite(state: &DbState, id: &str) -> Result<BookmarkWithRelations, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let current: i32 = conn.query_row(
        "SELECT is_favorite FROM bookmarks WHERE id = ?1",
        [id],
        |row| row.get(0),
    ).map_err(|_| DbError::NotFound)?;
    let next = if current != 0 { 0 } else { 1 };
    conn.execute(
        "UPDATE bookmarks SET is_favorite = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, next, now_iso()],
    )?;
    drop(conn);
    get_bookmark(state, id)
}

pub fn get_tags(state: &DbState) -> Result<Vec<Tag>, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at FROM tags ORDER BY name ASC",
    )?;
    let tags = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(tags)
}

pub fn get_folders(state: &DbState) -> Result<Vec<Folder>, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at FROM folders ORDER BY name ASC",
    )?;
    let folders = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(folders)
}

pub fn export_all(state: &DbState) -> Result<ExportPayload, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(&format!("{BOOKMARK_SELECT} ORDER BY b.created_at DESC"))?;
    let mut rows = stmt.query([])?;
    let mut all_bookmarks = Vec::new();
    while let Some(row) = rows.next()? {
        all_bookmarks.push(row_to_bookmark_with_relations(&conn, row)?);
    }

    let all_highlights = highlights::load_all_highlights(&conn)?;

    Ok(ExportPayload {
        exported_at: now_iso(),
        bookmarks: all_bookmarks,
        folders: get_folders(state)?,
        tags: get_tags(state)?,
        highlights: all_highlights,
    })
}

pub fn get_highlights_for_bookmark(
    state: &DbState,
    bookmark_id: &str,
) -> Result<Vec<Highlight>, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    highlights::get_highlights(&conn, bookmark_id)
}

pub fn create_highlight_entry(
    state: &DbState,
    input: HighlightInput,
) -> Result<Highlight, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let h = highlights::create_highlight(
        &conn,
        &input.bookmark_id,
        &input.text,
        input.note,
        input.source.or(Some("manual".to_string())),
    )?;
    fts::index_bookmark(&conn, &input.bookmark_id)?;
    Ok(h)
}

pub fn update_highlight_entry(
    state: &DbState,
    input: UpdateHighlightInput,
) -> Result<Highlight, DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let h = highlights::update_highlight(&conn, &input.id, input.note, input.text)?;
    fts::index_bookmark(&conn, &h.bookmark_id)?;
    Ok(h)
}

pub fn delete_highlight_entry(state: &DbState, id: &str) -> Result<(), DbError> {
    let conn = state.conn.lock().map_err(|_| DbError::Validation("DB lock poisoned".into()))?;
    let bookmark_id: String = conn.query_row(
        "SELECT bookmark_id FROM highlights WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;
    highlights::delete_highlight(&conn, id)?;
    fts::index_bookmark(&conn, &bookmark_id)?;
    Ok(())
}
