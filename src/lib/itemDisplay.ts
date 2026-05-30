import type { BookmarkWithRelations } from "./types";
import { getUrlDomain, truncate } from "./utils";
import {
  detectSource,
  extractTweetId,
  getDomain,
  isTweetUrl,
  isTwitterUrl,
} from "./urlDetection";

export function estimateReadTime(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min`;
}

export function isTweetBookmark(bookmark: BookmarkWithRelations): boolean {
  if (bookmark.tweetId) return true;
  if (bookmark.type === "tweet" || bookmark.type === "thread") {
    return isTwitterUrl(bookmark.url);
  }
  return bookmark.source === "x" && isTweetUrl(bookmark.url);
}

/** Tweet has video media (stored URL, thumb, or syndication embed candidate). */
export function isVideoTweetBookmark(bookmark: BookmarkWithRelations): boolean {
  if (bookmark.videoUrl?.trim()) return true;
  const img = bookmark.imageUrl?.trim() || "";
  if (/video_thumb|tweet_video|ext_tw_video/i.test(img)) return true;
  return false;
}

export function isGenericXogImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return (
    /abs\.twimg\.com\/rweb/i.test(url) ||
    /\/og\/image\.png/i.test(url) ||
    /see_what|card_img|card_image|promo/i.test(url)
  );
}

export function isPromoTweetImage(url: string | null | undefined): boolean {
  return isGenericXogImage(url);
}

/** Use X embed when tweet has video, bad/generic image, or partial capture. */
export function shouldShowTweetEmbed(bookmark: BookmarkWithRelations): boolean {
  const tweetId = bookmark.tweetId || extractTweetId(bookmark.url);
  if (!tweetId || !isTweetBookmark(bookmark)) return false;
  if (bookmark.videoUrl?.trim()) return true;
  if (isVideoTweetBookmark(bookmark)) return true;
  if (isGenericXogImage(bookmark.imageUrl)) return true;
  if (bookmark.captureStatus === "partial" || bookmark.captureQuality === "partial") {
    return true;
  }
  const img = bookmark.imageUrl?.trim() || "";
  if (!img) return true;
  if (/pbs\.twimg\.com\/media\//i.test(img) && !isGenericXogImage(img)) return false;
  return true;
}

export function getTweetBodyText(bookmark: BookmarkWithRelations): string | null {
  return bookmark.capturedText?.trim() || bookmark.selectedText?.trim() || null;
}

export function getTextForReadTime(bookmark: BookmarkWithRelations): string | null {
  if (isTweetBookmark(bookmark)) {
    return getTweetBodyText(bookmark);
  }
  return (
    bookmark.capturedText?.trim() ||
    bookmark.content?.trim() ||
    bookmark.summary?.trim() ||
    null
  );
}

export function getPreviewText(bookmark: BookmarkWithRelations): string {
  let raw: string | null | undefined;
  if (isTweetBookmark(bookmark)) {
    raw = getTweetBodyText(bookmark);
  } else {
    raw =
      bookmark.selectedText?.trim() ||
      bookmark.capturedDescription?.trim() ||
      bookmark.capturedText?.trim() ||
      bookmark.content?.trim() ||
      bookmark.summary?.trim();
  }
  if (raw) return truncate(raw.replace(/\s+/g, " "), 120);
  return "No local text saved yet.";
}

export function getTweetDisplayTitle(bookmark: BookmarkWithRelations): string {
  const name = bookmark.capturedAuthor?.trim() || bookmark.authorName?.trim();
  const handle = bookmark.authorHandle?.replace(/^@/, "");
  if (name) return `${name} on X`;
  if (handle) return `@${handle} on X`;
  return "Post on X";
}

export function getDisplayTitle(bookmark: BookmarkWithRelations): string {
  if (isTweetBookmark(bookmark)) {
    if (bookmark.title?.trim() && !looksLikeFullTweetTitle(bookmark)) {
      return bookmark.title.trim();
    }
    return getTweetDisplayTitle(bookmark);
  }
  return (
    bookmark.capturedTitle?.trim() ||
    bookmark.title?.trim() ||
    getUrlDomain(bookmark.url)
  );
}

function looksLikeFullTweetTitle(bookmark: BookmarkWithRelations): boolean {
  const title = bookmark.title?.trim() || "";
  const body = bookmark.capturedText?.trim() || "";
  if (!title || !body) return false;
  if (title.endsWith(" on X") || title === "Post on X") return false;
  return title.length > 80 || body.startsWith(title.slice(0, 40));
}

export function getSourceLabel(bookmark: BookmarkWithRelations): string {
  if (isTweetBookmark(bookmark)) {
    const handle = bookmark.authorHandle?.replace(/^@/, "");
    if (handle) return `@${handle} · X`;
    return "X";
  }
  if (bookmark.source?.trim()) return bookmark.source;
  if (bookmark.siteName?.trim()) return bookmark.siteName;
  return getDomain(bookmark.url);
}

export { isTwitterUrl, extractTweetId };

export function getFaviconUrl(url: string): string {
  const domain = getUrlDomain(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function getAuthorLabel(bookmark: BookmarkWithRelations): string | null {
  if (bookmark.capturedAuthor?.trim()) return bookmark.capturedAuthor.trim();
  if (bookmark.authorName) return bookmark.authorName;
  if (bookmark.authorHandle) {
    const h = bookmark.authorHandle.replace(/^@/, "");
    return `@${h}`;
  }
  return null;
}

export function getInitial(bookmark: BookmarkWithRelations): string {
  const name =
    bookmark.capturedAuthor ||
    bookmark.authorName ||
    bookmark.authorHandle ||
    getUrlDomain(bookmark.url);
  return (name.replace(/^@/, "").charAt(0) || "?").toUpperCase();
}

export function getDisplayTweetId(bookmark: BookmarkWithRelations): string | null {
  return bookmark.tweetId ?? extractTweetId(bookmark.url);
}

export function getDisplaySource(bookmark: BookmarkWithRelations): string {
  return bookmark.source ?? detectSource(bookmark.url);
}

export function formatRelativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function bookmarkToInput(bookmark: BookmarkWithRelations) {
  return {
    url: bookmark.url,
    title: bookmark.title,
    authorName: bookmark.authorName,
    authorHandle: bookmark.authorHandle,
    content: bookmark.content,
    notes: bookmark.notes,
    summary: bookmark.summary,
    type: bookmark.type,
    status: bookmark.status,
    isFavorite: bookmark.isFavorite,
    folderName: bookmark.folderName,
    tagsInput: bookmark.tags.map((t) => t.name).join(", "),
  };
}

export function hasCapturedBodyText(bookmark: BookmarkWithRelations): boolean {
  return Boolean(getTweetBodyText(bookmark) || bookmark.capturedText?.trim());
}

export function shouldShowTweetPreview(bookmark: BookmarkWithRelations): boolean {
  return isTweetBookmark(bookmark);
}

export function getReaderBodyText(bookmark: BookmarkWithRelations): string | null {
  if (isTweetBookmark(bookmark)) {
    return getTweetBodyText(bookmark);
  }
  return (
    bookmark.capturedText?.trim() ||
    bookmark.content?.trim() ||
    bookmark.summary?.trim() ||
    null
  );
}

export function shouldShowArticleReader(bookmark: BookmarkWithRelations): boolean {
  if (isTweetBookmark(bookmark)) return false;
  return Boolean(
    bookmark.capturedText?.trim() ||
      bookmark.capturedDescription?.trim() ||
      bookmark.content?.trim() ||
      bookmark.summary?.trim() ||
      bookmark.imageUrl?.trim(),
  );
}
