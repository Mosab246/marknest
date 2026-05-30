use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::db::DbError;
use crate::models::Highlight;

pub fn ensure_highlights_schema(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS highlights (
            id TEXT PRIMARY KEY,
            bookmark_id TEXT NOT NULL,
            text TEXT NOT NULL,
            note TEXT,
            source TEXT,
            color TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_highlights_bookmark ON highlights(bookmark_id);
        CREATE INDEX IF NOT EXISTS idx_highlights_created ON highlights(created_at);
        "#,
    )?;
    Ok(())
}

fn row_to_highlight(row: &rusqlite::Row<'_>) -> Result<Highlight, rusqlite::Error> {
    Ok(Highlight {
        id: row.get(0)?,
        bookmark_id: row.get(1)?,
        text: row.get(2)?,
        note: row.get(3)?,
        source: row.get(4)?,
        color: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

pub fn migrate_selected_text_to_highlights(conn: &Connection) -> Result<(), DbError> {
    let mut stmt = conn.prepare(
        r#"SELECT id, selected_text FROM bookmarks
           WHERE selected_text IS NOT NULL AND TRIM(selected_text) != ''
           AND NOT EXISTS (SELECT 1 FROM highlights h WHERE h.bookmark_id = bookmarks.id)"#,
    )?;
    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    for (bookmark_id, text) in rows {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            r#"INSERT INTO highlights (id, bookmark_id, text, note, source, color, created_at, updated_at)
               VALUES (?1, ?2, ?3, NULL, 'migration', NULL, ?4, ?4)"#,
            params![id, bookmark_id, text.trim(), now],
        )?;
    }
    Ok(())
}

pub fn get_highlights(conn: &Connection, bookmark_id: &str) -> Result<Vec<Highlight>, DbError> {
    let mut stmt = conn.prepare(
        r#"SELECT id, bookmark_id, text, note, source, color, created_at, updated_at
           FROM highlights WHERE bookmark_id = ?1 ORDER BY created_at ASC"#,
    )?;
    let list = stmt
        .query_map([bookmark_id], row_to_highlight)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(list)
}

pub fn count_highlights(conn: &Connection, bookmark_id: &str) -> Result<i64, DbError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM highlights WHERE bookmark_id = ?1",
        [bookmark_id],
        |row| row.get(0),
    )?;
    Ok(count)
}

pub fn highlight_exists(conn: &Connection, bookmark_id: &str, text: &str) -> Result<bool, DbError> {
    let trimmed = text.trim();
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM highlights WHERE bookmark_id = ?1 AND TRIM(text) = ?2",
        params![bookmark_id, trimmed],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

pub enum HighlightCreateOutcome {
    Created(Highlight),
    AlreadyExists,
}

pub fn try_create_highlight(
    conn: &Connection,
    bookmark_id: &str,
    text: &str,
    note: Option<String>,
    source: Option<String>,
) -> Result<HighlightCreateOutcome, DbError> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Ok(HighlightCreateOutcome::AlreadyExists);
    }
    if highlight_exists(conn, bookmark_id, trimmed)? {
        return Ok(HighlightCreateOutcome::AlreadyExists);
    }
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let src = source.unwrap_or_else(|| "extension".to_string());
    conn.execute(
        r#"INSERT INTO highlights (id, bookmark_id, text, note, source, color, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?6)"#,
        params![id, bookmark_id, trimmed, note, src, now],
    )?;
    let h = conn.query_row(
        r#"SELECT id, bookmark_id, text, note, source, color, created_at, updated_at
           FROM highlights WHERE id = ?1"#,
        [&id],
        row_to_highlight,
    )?;
    Ok(HighlightCreateOutcome::Created(h))
}

pub fn create_highlight(
    conn: &Connection,
    bookmark_id: &str,
    text: &str,
    note: Option<String>,
    source: Option<String>,
) -> Result<Highlight, DbError> {
    match try_create_highlight(conn, bookmark_id, text, note, source)? {
        HighlightCreateOutcome::Created(h) => Ok(h),
        HighlightCreateOutcome::AlreadyExists => Err(DbError::Validation(
            "Highlight with this text already exists".into(),
        )),
    }
}

pub fn update_highlight(
    conn: &Connection,
    id: &str,
    note: Option<String>,
    text: Option<String>,
) -> Result<Highlight, DbError> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    if let Some(t) = &text {
        conn.execute(
            "UPDATE highlights SET text = ?2, note = COALESCE(?3, note), updated_at = ?4 WHERE id = ?1",
            params![id, t.trim(), note, now],
        )?;
    } else if note.is_some() {
        conn.execute(
            "UPDATE highlights SET note = ?2, updated_at = ?3 WHERE id = ?1",
            params![id, note, now],
        )?;
    }
    conn.query_row(
        r#"SELECT id, bookmark_id, text, note, source, color, created_at, updated_at
           FROM highlights WHERE id = ?1"#,
        [id],
        row_to_highlight,
    )
    .map_err(|_| DbError::NotFound)
}

pub fn delete_highlight(conn: &Connection, id: &str) -> Result<(), DbError> {
    let n = conn.execute("DELETE FROM highlights WHERE id = ?1", [id])?;
    if n == 0 {
        return Err(DbError::NotFound);
    }
    Ok(())
}

pub fn load_all_highlights(conn: &Connection) -> Result<Vec<Highlight>, DbError> {
    let mut stmt = conn.prepare(
        r#"SELECT id, bookmark_id, text, note, source, color, created_at, updated_at
           FROM highlights ORDER BY created_at DESC"#,
    )?;
    let rows = stmt
        .query_map([], row_to_highlight)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}
