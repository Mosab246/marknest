use rusqlite::Connection;

use crate::capture_quality;
use crate::db::DbError;
use crate::fts;
use crate::highlights;

const CAPTURE_COLUMNS: &[&str] = &[
    "source",
    "canonical_url",
    "captured_title",
    "captured_author",
    "captured_description",
    "captured_text",
    "selected_text",
    "site_name",
    "favicon_url",
    "image_url",
    "tweet_id",
    "capture_status",
    "captured_at",
];

const V4_COLUMNS: &[&str] = &[
    "capture_quality",
    "capture_warning",
    "posted_at",
    "recaptured_at",
];

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, DbError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let rows = stmt.query_map([], |row| {
        let name: String = row.get(1)?;
        Ok(name)
    })?;
    for name in rows {
        if name? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn add_column_if_missing(conn: &Connection, column: &str) -> Result<(), DbError> {
    if !column_exists(conn, "bookmarks", column)? {
        conn.execute(
            &format!("ALTER TABLE bookmarks ADD COLUMN {column} TEXT"),
            [],
        )?;
    }
    Ok(())
}

fn get_schema_version(conn: &Connection) -> Result<i32, DbError> {
    let version: Option<i32> = conn
        .query_row("SELECT version FROM schema_version LIMIT 1", [], |row| row.get(0))
        .ok();
    Ok(version.unwrap_or(1))
}

fn set_schema_version(conn: &Connection, version: i32) -> Result<(), DbError> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM schema_version", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute("INSERT INTO schema_version (version) VALUES (?1)", [version])?;
    } else {
        conn.execute("UPDATE schema_version SET version = ?1", [version])?;
    }
    Ok(())
}

fn backfill_capture_quality(conn: &Connection) -> Result<(), DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, captured_text, capture_status FROM bookmarks WHERE capture_quality IS NULL OR capture_quality = ''",
    )?;
    let rows: Vec<(String, Option<String>, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    for (id, captured_text, capture_status) in rows {
        let assessment = capture_quality::classify_capture(&captured_text, &capture_status);
        conn.execute(
            "UPDATE bookmarks SET capture_quality = ?2, capture_warning = ?3 WHERE id = ?1",
            rusqlite::params![id, assessment.quality, assessment.warning],
        )?;
    }
    Ok(())
}

pub fn run_migrations(conn: &Connection) -> Result<(), DbError> {
    let version = get_schema_version(conn)?;

    if version < 2 {
        for column in CAPTURE_COLUMNS {
            add_column_if_missing(conn, column)?;
        }
        set_schema_version(conn, 2)?;
    }

    if get_schema_version(conn)? < 3 {
        fts::ensure_fts_schema(conn)?;
        fts::rebuild_fts_index(conn)?;
        set_schema_version(conn, 3)?;
    }

    if get_schema_version(conn)? < 4 {
        for column in V4_COLUMNS {
            add_column_if_missing(conn, column)?;
        }
        backfill_capture_quality(conn)?;
        set_schema_version(conn, 4)?;
    }

    if get_schema_version(conn)? < 5 {
        highlights::ensure_highlights_schema(conn)?;
        highlights::migrate_selected_text_to_highlights(conn)?;
        set_schema_version(conn, 5)?;
    }

    if get_schema_version(conn)? < 6 {
        fts::rebuild_fts_index(conn)?;
        set_schema_version(conn, 6)?;
    }

    if get_schema_version(conn)? < 7 {
        add_column_if_missing(conn, "video_url")?;
        set_schema_version(conn, 7)?;
    }

    Ok(())
}
