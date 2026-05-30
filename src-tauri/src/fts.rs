use rusqlite::{params, Connection};

use crate::db::DbError;

const FTS_TABLE: &str = "bookmarks_fts";

pub fn ensure_fts_schema(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        r#"
        CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
            bookmark_id UNINDEXED,
            body,
            tokenize = 'unicode61'
        );
        "#,
    )?;
    Ok(())
}

pub fn rebuild_fts_index(conn: &Connection) -> Result<(), DbError> {
    ensure_fts_schema(conn)?;
    conn.execute(&format!("DELETE FROM {FTS_TABLE}"), [])?;

    let mut stmt = conn.prepare(
        r#"SELECT b.id FROM bookmarks b ORDER BY b.created_at DESC"#,
    )?;
    let ids = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;

    for id in ids {
        index_bookmark(conn, &id)?;
    }
    Ok(())
}

fn collect_search_parts(conn: &Connection, bookmark_id: &str) -> Result<String, DbError> {
    let row: (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn.query_row(
        r#"SELECT
            url, title, author_name, author_handle, content, notes, summary,
            source, canonical_url, captured_title, captured_author, captured_description,
            captured_text, selected_text, site_name, tweet_id, capture_status,
            (SELECT GROUP_CONCAT(t.name, ' ') FROM tags t
             INNER JOIN bookmark_tags bt ON bt.tag_id = t.id
             WHERE bt.bookmark_id = b.id),
            (SELECT f.name FROM folders f WHERE f.id = b.folder_id),
            b.capture_warning,
            (SELECT GROUP_CONCAT(h.text || ' ' || COALESCE(h.note, ''), ' ')
             FROM highlights h WHERE h.bookmark_id = b.id)
           FROM bookmarks b WHERE b.id = ?1"#,
        [bookmark_id],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
                row.get(11)?,
                row.get(12)?,
                row.get(13)?,
                row.get(14)?,
                row.get(15)?,
                row.get(16)?,
                row.get(17)?,
                row.get(18)?,
                row.get(19)?,
                row.get(20)?,
            ))
        },
    )?;

    let mut parts = Vec::new();
    for field in [
        row.0, row.1, row.2, row.3, row.4, row.5, row.6, row.7, row.8, row.9, row.10, row.11,
        row.12, row.13, row.14, row.15, row.16, row.17, row.18, row.19, row.20,
    ] {
        if let Some(s) = field {
            let t = s.trim().to_string();
            if !t.is_empty() {
                parts.push(t);
            }
        }
    }

    Ok(parts.join("\n"))
}

pub fn index_bookmark(conn: &Connection, bookmark_id: &str) -> Result<(), DbError> {
    ensure_fts_schema(conn)?;
    let body = collect_search_parts(conn, bookmark_id)?;
    conn.execute(
        &format!("DELETE FROM {FTS_TABLE} WHERE bookmark_id = ?1"),
        [bookmark_id],
    )?;
    if body.trim().is_empty() {
        return Ok(());
    }
    conn.execute(
        &format!("INSERT INTO {FTS_TABLE}(bookmark_id, body) VALUES (?1, ?2)"),
        params![bookmark_id, body],
    )?;
    Ok(())
}

pub fn remove_bookmark(conn: &Connection, bookmark_id: &str) -> Result<(), DbError> {
    conn.execute(
        &format!("DELETE FROM {FTS_TABLE} WHERE bookmark_id = ?1"),
        [bookmark_id],
    )?;
    Ok(())
}

fn escape_fts_token(token: &str) -> String {
    token
        .chars()
        .filter(|c| !matches!(c, '"' | '*' | ':' | '(' | ')' | '^' | '-' | '\n' | '\r'))
        .collect::<String>()
        .trim()
        .to_string()
}

/// Build an FTS5 MATCH query: prefix match per word, AND-combined.
pub fn build_fts_match_query(user_input: &str) -> Option<String> {
    let tokens: Vec<String> = user_input
        .split_whitespace()
        .map(escape_fts_token)
        .filter(|t| t.len() >= 2 || t.chars().any(|c| c.is_alphanumeric()))
        .collect();
    if tokens.is_empty() {
        return None;
    }
    Some(
        tokens
            .iter()
            .map(|t| format!("\"{t}\"*"))
            .collect::<Vec<_>>()
            .join(" AND "),
    )
}

pub fn fts_table_exists(conn: &Connection) -> bool {
    conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
        [FTS_TABLE],
        |row| row.get::<_, i64>(0),
    )
    .map(|n| n > 0)
    .unwrap_or(false)
}
