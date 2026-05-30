import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  BookmarkInput,
  BookmarkQuery,
  BookmarkWithRelations,
  CaptureBridgeStatus,
  Folder,
  Highlight,
  Tag,
  UpdateBookmarkInput,
} from "./types";

export function createBookmark(
  input: BookmarkInput,
): Promise<BookmarkWithRelations> {
  return invoke("create_bookmark", { input });
}

export function getBookmarks(
  query: BookmarkQuery,
): Promise<BookmarkWithRelations[]> {
  return invoke("get_bookmarks", { query });
}

export function getBookmark(id: string): Promise<BookmarkWithRelations> {
  return invoke("get_bookmark", { id });
}

export function updateBookmark(
  input: UpdateBookmarkInput,
): Promise<BookmarkWithRelations> {
  return invoke("update_bookmark", { input });
}

export function deleteBookmark(id: string): Promise<void> {
  return invoke("delete_bookmark", { id });
}

export function archiveBookmark(id: string): Promise<BookmarkWithRelations> {
  return invoke("archive_bookmark", { id });
}

export function unarchiveBookmark(id: string): Promise<BookmarkWithRelations> {
  return invoke("unarchive_bookmark", { id });
}

export function toggleFavorite(id: string): Promise<BookmarkWithRelations> {
  return invoke("toggle_favorite", { id });
}

export function getTags(): Promise<Tag[]> {
  return invoke("get_tags");
}

export function getFolders(): Promise<Folder[]> {
  return invoke("get_folders");
}

export function exportBookmarksJson(): Promise<string> {
  return invoke("export_bookmarks_json");
}

export function saveExportJson(): Promise<string> {
  return invoke("save_export_json");
}

export function openExternalUrl(url: string): Promise<void> {
  return invoke("open_external_url", { url });
}

export function getCaptureBridgeStatus(): Promise<CaptureBridgeStatus> {
  return invoke("get_capture_bridge_status");
}

export function getAppSettings(): Promise<AppSettings> {
  return invoke("get_app_settings");
}

export function saveAppSettings(settings: AppSettings): Promise<void> {
  return invoke("save_app_settings", { settings });
}

export function isAutostartEnabled(): Promise<boolean> {
  return invoke("is_autostart_enabled");
}

export function getHighlights(bookmarkId: string): Promise<Highlight[]> {
  return invoke("get_highlights", { bookmarkId });
}

export function createHighlight(input: {
  bookmarkId: string;
  text: string;
  note?: string | null;
  source?: string | null;
}): Promise<Highlight> {
  return invoke("create_highlight", { input });
}

export function updateHighlight(input: {
  id: string;
  text?: string | null;
  note?: string | null;
}): Promise<Highlight> {
  return invoke("update_highlight", { input });
}

export function deleteHighlight(id: string): Promise<void> {
  return invoke("delete_highlight", { id });
}

export function backupDatabase(): Promise<string> {
  return invoke("backup_database");
}
