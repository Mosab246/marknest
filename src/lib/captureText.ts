import type { BookmarkWithRelations } from "./types";
import { getDomain, isTwitterUrl, normalizeUrl } from "./urlDetection";

export interface TextUrlSpan {
  start: number;
  end: number;
  href: string;
  display: string;
}

export interface ExternalLinkInfo {
  url: string;
  title: string | null;
  domain: string;
}

const SCHEME_URL_RE =
  /https?:\/\/[^\s<>"')\]]+/gi;
const WWW_URL_RE =
  /\bwww\.[^\s<>"')\]]+/gi;
const BARE_DOMAIN_RE =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi;

const TWITTER_HOSTS = new Set(["x.com", "twitter.com", "t.co"]);

function isTwitterHost(host: string): boolean {
  const h = host.replace(/^www\./, "").toLowerCase();
  return TWITTER_HOSTS.has(h) || h.endsWith(".twitter.com");
}

/** Fix spaces inside URL-like tokens for display only. */
export function cleanCapturedTextForDisplay(text: string | null | undefined): string {
  if (!text) return "";
  let out = text.replace(/\r\n/g, "\n");

  out = out.replace(
    /(https?:\/\/)\s+/gi,
    "$1",
  );
  out = out.replace(
    /\b(https?:\/\/[^\s]+)\s+([^\s/]+(?:\/[^\s]*)?)/gi,
    (_, scheme, rest) => {
      if (rest.startsWith("http")) return `${scheme}${rest}`;
      return `${scheme}${rest}`;
    },
  );

  out = out.replace(/\b(www\.)\s+/gi, "www.");
  return out.trim();
}

function trimTrailingUrlPunctuation(raw: string): { core: string; trail: string } {
  let core = raw;
  let trail = "";
  while (core.length > 0) {
    const last = core[core.length - 1];
    if (",.;:!?)]}".includes(last)) {
      trail = last + trail;
      core = core.slice(0, -1);
    } else if (last === ")" && !core.includes("(")) {
      trail = last + trail;
      core = core.slice(0, -1);
    } else {
      break;
    }
  }
  return { core, trail };
}

function toHref(raw: string): string | null {
  const { core } = trimTrailingUrlPunctuation(raw.trim());
  if (!core) return null;
  if (/^https?:\/\//i.test(core)) {
    try {
      return new URL(core).toString();
    } catch {
      return null;
    }
  }
  if (/^www\./i.test(core)) {
    try {
      return new URL(`https://${core}`).toString();
    } catch {
      return null;
    }
  }
  if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}/i.test(core)) {
    try {
      const u = new URL(`https://${core}`);
      if (!u.pathname && !u.search) return null;
      if (u.hostname.split(".").length < 2) return null;
      return u.toString();
    } catch {
      return null;
    }
  }
  return null;
}

function collectMatches(text: string, re: RegExp, kind: "scheme" | "www" | "bare"): TextUrlSpan[] {
  const spans: TextUrlSpan[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const start = m.index;
    const { core } = trimTrailingUrlPunctuation(raw);
    const href = toHref(kind === "www" ? core : core);
    if (!href) continue;
    try {
      const host = new URL(href).hostname;
      if (kind === "bare" && isTwitterHost(host)) continue;
    } catch {
      continue;
    }
    spans.push({
      start,
      end: start + core.length,
      href,
      display: core,
    });
  }
  return spans;
}

function mergeNonOverlapping(spans: TextUrlSpan[]): TextUrlSpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: TextUrlSpan[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) continue;
    out.push(s);
  }
  return out;
}

export function extractUrlsFromText(text: string): TextUrlSpan[] {
  if (!text) return [];
  const cleaned = cleanCapturedTextForDisplay(text);
  const all = [
    ...collectMatches(cleaned, SCHEME_URL_RE, "scheme"),
    ...collectMatches(cleaned, WWW_URL_RE, "www"),
    ...collectMatches(cleaned, BARE_DOMAIN_RE, "bare"),
  ];
  return mergeNonOverlapping(all);
}

export function normalizeDisplayUrl(href: string): string {
  try {
    const u = new URL(href);
    let path = u.pathname;
    if (path.length > 48) path = `${path.slice(0, 45)}…`;
    const host = u.hostname.replace(/^www\./, "");
    return `${host}${path}${u.search ? "…" : ""}`;
  } catch {
    return href;
  }
}

export function hrefForOpen(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return normalizeUrl(trimmed);
}

function isExternalCanonical(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    return !isTwitterUrl(url);
  } catch {
    return false;
  }
}

export function getExternalLinkFromBookmark(
  bookmark: BookmarkWithRelations,
): ExternalLinkInfo | null {
  if (isExternalCanonical(bookmark.canonicalUrl)) {
    const url = bookmark.canonicalUrl!.trim();
    return {
      url,
      title: bookmark.capturedDescription?.trim() || null,
      domain: getDomain(url),
    };
  }

  const body =
    cleanCapturedTextForDisplay(bookmark.capturedText) ||
    cleanCapturedTextForDisplay(bookmark.content);
  const spans = extractUrlsFromText(body);
  for (const span of spans) {
    try {
      const host = new URL(span.href).hostname;
      if (isTwitterHost(host)) continue;
      return {
        url: span.href,
        title: bookmark.capturedDescription?.trim() || null,
        domain: getDomain(span.href),
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function textContainsUrlLike(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return extractUrlsFromText(text).length > 0 || /https?:\/\/|www\./i.test(text);
}
