export type CaptureSource = "x" | "youtube" | "web";

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isTwitterUrl(url: string): boolean {
  const host = getHost(url);
  return host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com");
}

export function isYoutubeUrl(url: string): boolean {
  const host = getHost(url);
  return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
}

export function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match?.[1] ?? null;
}

export function isTweetUrl(url: string): boolean {
  return isTwitterUrl(url) && extractTweetId(url) !== null;
}

export function extractHandleFromTweetUrl(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length >= 3 && parts[0] !== "i" && parts[1] === "status") {
      return parts[0];
    }
    if (parts.length >= 2 && parts[1] === "status") {
      return parts[0];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function detectSource(url: string): CaptureSource {
  if (isTwitterUrl(url)) return "x";
  if (isYoutubeUrl(url)) return "youtube";
  return "web";
}

export function defaultBookmarkType(
  url: string,
  source: CaptureSource,
): "tweet" | "video" | "article" {
  if (source === "x" && isTweetUrl(url)) return "tweet";
  if (source === "youtube") return "video";
  return "article";
}

/** @deprecated Use extractTweetId */
export function parseTweetId(url: string): string | null {
  return extractTweetId(url);
}
