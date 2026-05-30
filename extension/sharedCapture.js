/** Shared capture helpers for popup + background (loaded via script tag / importScripts). */
const MARKNEST_BRIDGE = "http://127.0.0.1:4763";

const DEFAULT_PREFS = {
  quickSaveEnabled: false,
  autoSaveXBookmarkEnabled: false,
  lastTags: "",
  lastFolder: "",
  defaultStatus: "unread",
  defaultFavorite: false,
};

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isTwitterUrl(url) {
  const h = getHost(url);
  return h === "x.com" || h === "twitter.com" || h.endsWith(".twitter.com");
}

function isYoutubeUrl(url) {
  const h = getHost(url);
  return h === "youtube.com" || h === "youtu.be" || h.endsWith(".youtube.com");
}

function extractTweetId(url) {
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

function isTweetUrl(url) {
  return isTwitterUrl(url) && extractTweetId(url);
}

function extractHandleFromTweetUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length >= 3 && parts[0] !== "i" && parts[1] === "status") return parts[0];
    if (parts.length >= 2 && parts[1] === "status") return parts[0];
  } catch {
    /* ignore */
  }
  return null;
}

function detectSource(url) {
  if (isTwitterUrl(url)) return "x";
  if (isYoutubeUrl(url)) return "youtube";
  return "web";
}

function defaultType(url, source) {
  if (source === "x" && isTweetUrl(url)) return "tweet";
  if (source === "youtube") return "video";
  return "article";
}

function tweetDisplayTitle(capture, handle) {
  if (capture.authorDisplayName) return `${capture.authorDisplayName} on X`;
  const h = (capture.authorHandle || handle || "").replace(/^@/, "");
  if (h) return `@${h} on X`;
  return "Post on X";
}

function isPromoImageUrl(src) {
  if (!src) return true;
  if (/abs\.twimg\.com\/rweb|\/og\/image\.png|card_img|card_image|see_what|promo/i.test(src)) {
    return true;
  }
  return false;
}

function pickPayloadImageUrl(capture, isTweet) {
  const direct = (capture.imageUrl || "").trim();
  if (direct && !isPromoImageUrl(direct)) return direct;
  if (!isTweet) {
    const og = (capture.ogImage || "").trim();
    if (og && !isPromoImageUrl(og)) return og;
  }
  return null;
}

function pickPayloadVideoUrl(capture) {
  const v = (capture.videoUrl || "").trim();
  if (!v || v.startsWith("blob:")) return null;
  if (/video\.twimg\.com/i.test(v) || /\.mp4(\?|$)/i.test(v)) return v;
  return null;
}

function normalizePostedAt(raw) {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t;
  try {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  } catch {
    /* ignore */
  }
  return t;
}

async function getPrefs() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_PREFS));
  return { ...DEFAULT_PREFS, ...stored };
}

async function applyQuickSaveMode() {
  const prefs = await getPrefs();
  if (prefs.quickSaveEnabled) {
    await chrome.action.setPopup({ popup: "" });
  } else {
    await chrome.action.setPopup({ popup: "popup.html" });
  }
}

async function ensureMarkNestExtractor(tabId) {
  // Always inject so capture logic updates after extension reload (avoids stale scripts).
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["contentScript.js"],
  });
}

async function extractCapture(tabId) {
  await ensureMarkNestExtractor(tabId);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      if (typeof window.__marknestExtractPageCapture === "function") {
        return await window.__marknestExtractPageCapture();
      }
      return { capturedText: "", captureStatus: "failed_clean_extract" };
    },
  });
  return result;
}

function buildCapturePayload(url, capture, prefs, overrides = {}) {
  const source = detectSource(url);
  const type = overrides.type || defaultType(url, source);
  const tweetId = capture.tweetId || extractTweetId(url);
  const handle = capture.authorHandle || extractHandleFromTweetUrl(url);
  const isTweet = capture.isTwitterStatusPage || isTweetUrl(url);
  const title = overrides.title != null
    ? overrides.title
    : isTweet
      ? tweetDisplayTitle(capture, handle)
      : capture.ogTitle || capture.documentTitle || null;

  return {
    url,
    canonicalUrl: capture.externalUrl || capture.canonicalUrl || null,
    title,
    capturedTitle: isTweet ? title : capture.ogTitle || capture.documentTitle || null,
    capturedAuthor: capture.authorDisplayName || null,
    capturedDescription: capture.externalTitle || capture.metaDescription || null,
    capturedText: capture.capturedText || null,
    selectedText: overrides.selectedText ?? capture.selectedText ?? null,
    siteName: isTweet ? "X" : capture.ogSiteName || null,
    faviconUrl: capture.faviconUrl || null,
    imageUrl: pickPayloadImageUrl(capture, isTweet),
    videoUrl: pickPayloadVideoUrl(capture),
    tweetId: tweetId || null,
    authorHandle: handle || null,
    postedAt: normalizePostedAt(capture.tweetTimestamp) || null,
    source,
    type,
    notes: overrides.includeNotes ? (overrides.notes ?? null) : null,
    tags: overrides.tags ?? prefs.lastTags ?? null,
    folderName: overrides.folderName ?? prefs.lastFolder ?? null,
    status: overrides.status ?? prefs.defaultStatus ?? "unread",
    isFavorite: overrides.isFavorite ?? prefs.defaultFavorite ?? false,
    captureStatus: capture.captureStatus || "captured",
    highlightNote: overrides.highlightNote ?? null,
  };
}

async function postCapture(payload) {
  const health = await fetch(`${MARKNEST_BRIDGE}/api/health`);
  if (!health.ok) throw new Error("bridge");
  const res = await fetch(`${MARKNEST_BRIDGE}/api/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "save failed");
  return data;
}

function captureResultMessage(data) {
  if (data.highlightAdded) return "Highlight added";
  if (data.result === "highlight_already_exists") return "Highlight already exists";
  if (data.updated) return "Already saved — updated";
  return "Saved to MarkNest";
}

function notifyMarkNest(title, message) {
  chrome.notifications?.create?.({
    type: "basic",
    iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    title,
    message,
  });
}

async function quickSaveTab(tab, selectedOverride, overrides = {}) {
  const prefs = await getPrefs();
  const capture =
    overrides.captureOverride || (await extractCapture(tab.id));
  const url = overrides.urlOverride || tab.url;
  const payload = buildCapturePayload(url, capture, prefs, {
    selectedText: selectedOverride,
    includeNotes: false,
    ...overrides,
  });
  const data = await postCapture(payload);
  if (payload.tags) await chrome.storage.local.set({ lastTags: payload.tags });
  if (payload.folderName) await chrome.storage.local.set({ lastFolder: payload.folderName });
  return { data, capture, payload };
}
