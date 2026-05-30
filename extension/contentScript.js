(function marknestContentScript() {
const MAX_TEXT = 20000;
const DEBUG_MARKNEST_CAPTURE = false;

const RETRY_DELAYS_MS = [0, 300, 800];

const JUNK_LINE_PATTERNS = [
  /^show translation$/i,
  /^translate post$/i,
  /^reply$/i,
  /^repost$/i,
  /^like$/i,
  /^view quotes?$/i,
  /^post your reply$/i,
  /^relevant$/i,
  /^see new posts$/i,
  /^conversation$/i,
  /^discover more$/i,
  /^sourced from across x$/i,
  /^terms of service$/i,
  /^privacy policy$/i,
  /^cookie policy$/i,
  /^accessibility$/i,
  /^ads info$/i,
  /^more$/i,
  /^home$/i,
  /^explore$/i,
  /^notifications$/i,
  /^messages$/i,
  /^grok$/i,
  /^bookmarks$/i,
  /^profile$/i,
  /^creator studio$/i,
  /^premium$/i,
  /^communities$/i,
  /^keyboard shortcuts$/i,
  /^trending now$/i,
  /^what's happening$/i,
  /^who to follow$/i,
  /^\d+(\.\d+)?[km]?\s*(views?|reposts?|likes?|replies?)$/i,
  /^\u00b7$/,
  /^to view keyboard shortcuts/i,
];

function debugLog(...args) {
  if (DEBUG_MARKNEST_CAPTURE) console.debug("[MarkNest]", ...args);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanTextOneLine(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function truncateText(text, max) {
  if (!text || text.length <= max) return text || "";
  return text.slice(0, max).trim();
}

function getHost() {
  return window.location.hostname.replace(/^www\./, "").toLowerCase();
}

function isTwitterHost(host) {
  return host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com");
}

function extractTweetIdFromUrl(url) {
  const m = (url || window.location.href).match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

function extractHandleFromUrl(url) {
  try {
    const parts = new URL(url || window.location.href).pathname
      .split("/")
      .filter(Boolean);
    if (parts.length >= 3 && parts[0] !== "i" && parts[1] === "status") return parts[0];
    if (parts.length >= 2 && parts[1] === "status") return parts[0];
  } catch {
    /* ignore */
  }
  return null;
}

function isTwitterStatusPage() {
  const host = getHost();
  return isTwitterHost(host) && extractTweetIdFromUrl(window.location.href) !== null;
}

function hasMeaningfulTweetText(text) {
  if (!text || !text.trim()) return false;
  const t = text.trim();
  if (t.length >= 2) return true;
  try {
    return /\p{L}|\p{N}|\p{Extended_Pictographic}/u.test(t);
  } catch {
    return t.length > 0;
  }
}

function isJunkLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (JUNK_LINE_PATTERNS.some((p) => p.test(t))) return true;
  if (t.length === 1) {
    try {
      return !/\p{L}|\p{N}|\p{Extended_Pictographic}/u.test(t);
    } catch {
      return t !== "\u00b7";
    }
  }
  return false;
}

/** Preserve line breaks and emoji for tweet body nodes. */
function preserveTweetText(raw) {
  if (!raw) return "";
  return raw.replace(/\r\n/g, "\n").trim();
}

function cleanTweetBody(raw) {
  if (!raw) return "";
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const kept = lines.filter((l) => !isJunkLine(l));
  return kept.join("\n").trim();
}

function looksLikeNoisyCapture(text) {
  if (!text || text.length < 400) return false;
  const lower = text.toLowerCase();
  const markers = ["home", "explore", "notifications", "grok", "bookmarks", "profile"];
  let hits = 0;
  for (const m of markers) {
    if (lower.includes(m)) hits += 1;
  }
  return hits >= 3;
}

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function scoreArticle(article, tweetId) {
  let score = 0;
  let reason = "candidate";

  const statusNeedle = `/status/${tweetId}`;
  if (article.querySelector(`a[href*="${statusNeedle}"]`)) {
    score += 100;
    reason = "status_link";
  }

  const tweetTextNodes = article.querySelectorAll('[data-testid="tweetText"]');
  if (tweetTextNodes.length > 0) {
    score += 50;
    reason = reason === "candidate" ? "tweetText" : reason;
    const firstText = (tweetTextNodes[0].innerText || "").trim();
    if (hasMeaningfulTweetText(firstText)) {
      score += Math.min(firstText.length, 40);
    }
    if (tweetTextNodes.length === 1) score += 25;
    if (tweetTextNodes.length > 3) score -= 40;
  }

  const langDiv = article.querySelector('div[lang]');
  if (langDiv && hasMeaningfulTweetText(langDiv.innerText)) {
    score += 20;
  }

  return { score, reason };
}

function getTweetContainers() {
  const articles = [...document.querySelectorAll("article")];
  const tweets = [...document.querySelectorAll('[data-testid="tweet"]')];
  const seen = new Set();
  const out = [];
  for (const el of [...articles, ...tweets]) {
    if (seen.has(el)) continue;
    seen.add(el);
    out.push(el);
  }
  return out;
}

function extractGlobalTweetText(tweetId) {
  const statusNeedle = `/status/${tweetId}`;
  const column =
    document.querySelector('[data-testid="primaryColumn"]') ||
    document.querySelector('[role="main"]') ||
    document.querySelector("main");

  const scope = column || document;
  const nodes = [...scope.querySelectorAll('[data-testid="tweetText"]')];
  debugLog("global tweetText nodes", nodes.length);

  for (const el of nodes) {
    const root = el.closest('article, [data-testid="tweet"]');
    if (root?.querySelector(`a[href*="${statusNeedle}"]`)) {
      const text = preserveTweetText(el.innerText || "");
      if (hasMeaningfulTweetText(text)) {
        debugLog("global match status_link", text.length);
        return text;
      }
    }
  }

  if (nodes.length > 0) {
    const text = preserveTweetText(nodes[0].innerText || "");
    if (hasMeaningfulTweetText(text)) {
      debugLog("global first tweetText", text.length);
      return text;
    }
  }

  return "";
}

function findMainTweetArticle(tweetId) {
  const articles = getTweetContainers();
  debugLog("containers found", articles.length, "tweetId", tweetId);

  if (!articles.length) return { article: null, reason: "no_articles" };

  const statusNeedle = `/status/${tweetId}`;
  for (const article of articles) {
    if (article.querySelector(`a[href*="${statusNeedle}"]`)) {
      debugLog("selected article", "status_link");
      return { article, reason: "status_link" };
    }
  }

  for (const article of articles) {
    if (article.querySelector('[data-testid="tweetText"]')) {
      debugLog("selected article", "first_tweetText");
      return { article, reason: "first_tweetText" };
    }
  }

  let best = null;
  let bestScore = -1;
  let bestReason = "fallback_first";
  for (const article of articles) {
    const { score, reason } = scoreArticle(article, tweetId);
    if (score > bestScore) {
      bestScore = score;
      best = article;
      bestReason = reason;
    }
  }

  if (best) {
    debugLog("selected article", bestReason, "score", bestScore);
    return { article: best, reason: bestReason };
  }

  debugLog("selected article", "fallback_index_0");
  return { article: articles[0], reason: "fallback_first" };
}

function isInsideTweetChrome(el) {
  return Boolean(
    el.closest(
      'button, [role="button"], nav, [role="navigation"], [data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"], [data-testid="share"]',
    ),
  );
}

function extractFromTweetTextNodes(article) {
  const nodes = article.querySelectorAll('[data-testid="tweetText"]');
  if (!nodes.length) return "";
  const text = preserveTweetText(nodes[0].innerText || "");
  debugLog("tweetText node", Boolean(text), "length", text.length);
  if (hasMeaningfulTweetText(text)) return text;
  return cleanTweetBody(text);
}

function extractFromLangDivs(article) {
  const divs = [...article.querySelectorAll("div[lang]")];
  for (const div of divs) {
    if (isInsideTweetChrome(div)) continue;
    if (!isVisible(div)) continue;
    const text = preserveTweetText(div.innerText || "");
    if (hasMeaningfulTweetText(text)) {
      debugLog("lang div text length", text.length);
      return cleanTweetBody(text) || text;
    }
  }
  return "";
}

function extractFromVisibleSpans(article) {
  const spans = [...article.querySelectorAll("span")];
  const parts = [];
  for (const span of spans) {
    if (!isVisible(span) || isInsideTweetChrome(span)) continue;
    const t = (span.innerText || "").trim();
    if (!hasMeaningfulTweetText(t) || isJunkLine(t)) continue;
    if (t.startsWith("@") && t.length < 20) continue;
    parts.push(t);
  }
  if (!parts.length) return "";

  const joined = cleanTweetBody(parts.join("\n"));
  if (joined.length > 500) {
    const longest = parts.sort((a, b) => b.length - a.length)[0] || "";
    return cleanTweetBody(longest);
  }
  return joined;
}

function extractFromArticleInnerText(article) {
  const raw = (article.innerText || "").trim();
  const cleaned = cleanTweetBody(raw);
  debugLog("article innerText cleaned length", cleaned.length);
  return cleaned;
}

function extractTweetTextFromArticle(article, tweetId) {
  const fromTestId = extractFromTweetTextNodes(article);
  if (hasMeaningfulTweetText(fromTestId)) return fromTestId;

  const fromLang = extractFromLangDivs(article);
  if (hasMeaningfulTweetText(fromLang)) return fromLang;

  const fromSpans = extractFromVisibleSpans(article);
  if (hasMeaningfulTweetText(fromSpans)) return fromSpans;

  const fromArticle = extractFromArticleInnerText(article);
  if (hasMeaningfulTweetText(fromArticle) && !looksLikeNoisyCapture(fromArticle)) {
    return fromArticle;
  }

  if (hasMeaningfulTweetText(fromArticle)) return fromArticle;

  if (tweetId) {
    const global = extractGlobalTweetText(tweetId);
    if (hasMeaningfulTweetText(global)) return global;
  }

  return "";
}

function extractOgTweetFallback() {
  const sources = [
    document.querySelector('meta[property="og:description"]')?.getAttribute("content"),
    document.querySelector('meta[name="description"]')?.getAttribute("content"),
    document.querySelector('meta[property="twitter:description"]')?.getAttribute("content"),
    document.querySelector('meta[name="twitter:description"]')?.getAttribute("content"),
  ];
  for (const raw of sources) {
    if (!raw?.trim()) continue;
    const cleaned = cleanTweetBody(raw);
    if (hasMeaningfulTweetText(cleaned) && !looksLikeNoisyCapture(cleaned)) {
      debugLog("og description fallback", cleaned.length);
      return cleaned;
    }
  }
  return "";
}

function extractAuthorFromArticle(article, handleFromUrl) {
  let authorDisplayName = "";
  let authorHandle = handleFromUrl || "";

  const userName = article.querySelector('[data-testid="User-Name"]');
  if (userName) {
    const links = userName.querySelectorAll('a[href^="/"]');
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/^\/([^/]+)$/);
      if (m && m[1] !== "status" && !m[1].startsWith("i")) {
        authorHandle = authorHandle || m[1];
      }
    }
    const spans = userName.querySelectorAll("span");
    for (const span of spans) {
      const t = span.textContent?.trim() || "";
      if (t && !t.startsWith("@") && t.length < 80 && !t.includes("\u00b7")) {
        authorDisplayName = t;
        break;
      }
    }
  }

  if (!authorHandle) {
    const profileLink = article.querySelector('a[href^="/"][role="link"]');
    const href = profileLink?.getAttribute("href") || "";
    const m = href.match(/^\/([^/]+)$/);
    if (m) authorHandle = m[1];
  }

  return { authorDisplayName, authorHandle };
}

function extractTweetTimestamp(article) {
  const time = article.querySelector("time");
  if (time) {
    return time.getAttribute("datetime") || time.textContent?.trim() || "";
  }
  return "";
}

function isGenericXSiteImage(src) {
  if (!src) return true;
  return (
    /abs\.twimg\.com\/rweb/i.test(src) ||
    /\/og\/image\.png/i.test(src) ||
    /card_img|card_image|see_what|promo|amplify_video_thumb|\/card\//i.test(src)
  );
}

function isPromoOrCardImage(src, img) {
  if (!src) return true;
  if (isGenericXSiteImage(src)) return true;
  const alt = (img?.alt || img?.getAttribute("alt") || "").toLowerCase();
  if (/see what'?s happening|happening now|promoted/i.test(alt)) return true;
  return false;
}

function isMediaImageSrc(src) {
  if (!src) return false;
  if (/profile_images|emoji|twemoji|avatar/i.test(src)) return false;
  if (isGenericXSiteImage(src)) return false;
  return (
    /pbs\.twimg\.com\/media/i.test(src) ||
    /pbs\.twimg\.com\/ext_tw_video_thumb/i.test(src) ||
    /pbs\.twimg\.com\/tweet_video_thumb/i.test(src)
  );
}

function isPlayableVideoUrl(url) {
  if (!url || url.startsWith("blob:")) return false;
  return /video\.twimg\.com/i.test(url) || /\.mp4(\?|$)/i.test(url);
}

function pickVideoSrcFromElement(video) {
  const sources = [
    video.currentSrc,
    video.src,
    video.getAttribute("data-src"),
    ...[...video.querySelectorAll("source[src]")].map(
      (s) => s.src || s.getAttribute("src"),
    ),
  ].filter(Boolean);
  for (const src of sources) {
    if (isPlayableVideoUrl(src)) return src;
  }
  return "";
}

function videoUrlFromThumb(thumb) {
  if (!thumb) return "";
  const ext = thumb.match(/ext_tw_video_thumb\/(\d+)\/pu\/img\/([^./?]+)/i);
  if (ext) {
    const [, id, variant] = ext;
    const sizes = ["1280x720", "720x720", "480x480", "320x320"];
    for (const size of sizes) {
      const candidate = `https://video.twimg.com/ext_tw_video/${id}/pu/vid/avc1/${size}/${variant}.mp4`;
      if (isPlayableVideoUrl(candidate)) return candidate;
    }
  }
  const tv = thumb.match(/tweet_video_thumb\/([^/]+)\//i);
  if (tv) {
    const id = tv[1];
    return `https://video.twimg.com/tweet_video/${id}/mp4/${id}.mp4`;
  }
  return "";
}

function unescapeTwitterUrl(raw) {
  if (!raw) return "";
  return raw
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .trim();
}

function extractMp4FromVideoInfoJson() {
  let bestUrl = "";
  let bestBitrate = 0;
  const bitratePattern =
    /"bitrate"\s*:\s*(\d+)[\s\S]{0,400}?"content_type"\s*:\s*"video\/mp4"[\s\S]{0,200}?"url"\s*:\s*"([^"]+)"/gi;
  const urlFirstPattern =
    /"url"\s*:\s*"(https:\\?\/\\?\/video\.twimg\.com[^"]+\.mp4[^"]*)"/gi;

  for (const script of document.querySelectorAll("script")) {
    const t = script.textContent || "";
    if (!t.includes("video.twimg.com") && !t.includes("video/mp4")) continue;

    let m;
    bitratePattern.lastIndex = 0;
    while ((m = bitratePattern.exec(t))) {
      const bitrate = parseInt(m[1], 10) || 0;
      const url = unescapeTwitterUrl(m[2]);
      if (isPlayableVideoUrl(url) && bitrate >= bestBitrate) {
        bestBitrate = bitrate;
        bestUrl = url;
      }
    }

    if (!bestUrl) {
      urlFirstPattern.lastIndex = 0;
      while ((m = urlFirstPattern.exec(t))) {
        const url = unescapeTwitterUrl(m[1]);
        if (isPlayableVideoUrl(url)) {
          bestUrl = url;
          break;
        }
      }
    }
  }
  return bestUrl;
}

function extractVideoUrlFromScripts() {
  const fromJson = extractMp4FromVideoInfoJson();
  if (fromJson) return fromJson;

  const needle = "https://video.twimg.com";
  for (const script of document.querySelectorAll("script")) {
    const t = script.textContent || "";
    if (!t.includes(needle) || !t.includes(".mp4")) continue;
    let pos = 0;
    while (pos < t.length) {
      const idx = t.indexOf(needle, pos);
      if (idx === -1) break;
      let end = idx;
      while (end < t.length && /[A-Za-z0-9_./?=&%#:_-]/.test(t[end])) end += 1;
      const url = unescapeTwitterUrl(t.slice(idx, end));
      if (url.includes(".mp4") && isPlayableVideoUrl(url)) return url;
      pos = idx + needle.length;
    }
  }
  return "";
}

function extractVideoUrlFromArticle(article) {
  for (const video of article.querySelectorAll("video")) {
    const src = pickVideoSrcFromElement(video);
    if (src) return src;
  }

  for (const el of article.querySelectorAll("[src], source[src]")) {
    const src =
      el.src || el.getAttribute("src") || el.getAttribute("data-src") || "";
    if (isPlayableVideoUrl(src)) return src;
  }

  const fromScripts = extractVideoUrlFromScripts();
  if (fromScripts) return fromScripts;

  const ogVideo =
    document.querySelector('meta[property="og:video:url"]')?.getAttribute("content") ||
    document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute("content") ||
    document.querySelector('meta[property="og:video"]')?.getAttribute("content") ||
    "";
  if (isPlayableVideoUrl(ogVideo)) return ogVideo;

  return "";
}

function extractPosterImageUrl(article) {
  const imgs = [...article.querySelectorAll("img[src]")];
  let bestThumb = "";
  let bestPhoto = "";
  let bestThumbArea = 0;
  let bestPhotoArea = 0;

  for (const img of imgs) {
    const src = img.src || img.getAttribute("src") || "";
    if (!isMediaImageSrc(src) || isPromoOrCardImage(src, img)) continue;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    const area = w * h || 1;
    if (/video_thumb/i.test(src)) {
      if (area >= bestThumbArea) {
        bestThumbArea = area;
        bestThumb = src;
      }
    } else if (area >= bestPhotoArea) {
      bestPhotoArea = area;
      bestPhoto = src;
    }
  }

  if (bestThumb) return bestThumb;
  if (bestPhoto) return bestPhoto;

  return "";
}

function extractMediaFromArticle(article) {
  let videoUrl = extractVideoUrlFromArticle(article);
  let imageUrl = extractPosterImageUrl(article);

  if (!videoUrl && imageUrl) {
    videoUrl = videoUrlFromThumb(imageUrl);
  }

  if (videoUrl && !isPlayableVideoUrl(videoUrl)) {
    videoUrl = "";
  }

  if (imageUrl && isPromoOrCardImage(imageUrl)) {
    imageUrl = "";
  }

  if (videoUrl && !imageUrl) {
    const thumb = extractPosterImageUrl(article);
    if (thumb && /video_thumb/i.test(thumb)) imageUrl = thumb;
  }

  return { videoUrl: videoUrl || "", imageUrl: imageUrl || "" };
}

async function extractMediaWithRetries(article, delays = [0, 500, 1500]) {
  let best = { videoUrl: "", imageUrl: "" };
  for (const ms of delays) {
    if (ms > 0) await sleep(ms);
    const m = extractMediaFromArticle(article);
    if (m.videoUrl && isPlayableVideoUrl(m.videoUrl)) {
      return m;
    }
    if (m.imageUrl && !best.imageUrl) best.imageUrl = m.imageUrl;
    if (m.videoUrl) best.videoUrl = m.videoUrl;
  }
  if (!best.videoUrl && best.imageUrl) {
    best.videoUrl = videoUrlFromThumb(best.imageUrl);
    if (best.videoUrl && !isPlayableVideoUrl(best.videoUrl)) best.videoUrl = "";
  }
  return best;
}

async function enrichTweetWithMedia(tw) {
  const { article } = findMainTweetArticle(tw.tweetId);
  if (!article) return tw;

  const media = await extractMediaWithRetries(article);
  let captureStatus = tw.captureStatus;
  if (
    !media.videoUrl &&
    (media.imageUrl?.includes("video_thumb") ||
      article.querySelector("video, [data-testid='videoPlayer']"))
  ) {
    if (captureStatus === "captured") captureStatus = "partial";
  }

  return {
    ...tw,
    videoUrl: media.videoUrl || tw.videoUrl || "",
    imageUrl: media.imageUrl || tw.imageUrl || "",
    captureStatus,
  };
}

function extractMediaImageUrl(article) {
  return extractMediaFromArticle(article).imageUrl;
}

function statusUrlFromArticle(article) {
  const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
  const link = timeLink || article.querySelector('a[href*="/status/"]');
  if (!link) return "";
  try {
    return new URL(link.getAttribute("href") || "", window.location.origin).href;
  } catch {
    return "";
  }
}

function extractTweetFromArticle(article, statusUrl, selectedTextOverride) {
  const url = statusUrl || window.location.href;
  const tweetId = extractTweetIdFromUrl(url);
  const handleFromUrl = extractHandleFromUrl(url);
  const selectedText =
    selectedTextOverride != null
      ? selectedTextOverride
      : (window.getSelection()?.toString() || "").trim();

  const { authorDisplayName, authorHandle } = extractAuthorFromArticle(
    article,
    handleFromUrl,
  );

  let tweetText = extractTweetTextFromArticle(article, tweetId);
  if (!hasMeaningfulTweetText(tweetText) && tweetId) {
    tweetText = extractGlobalTweetText(tweetId);
  }
  if (!hasMeaningfulTweetText(tweetText)) {
    tweetText = extractOgTweetFallback();
  }

  if (
    selectedText &&
    hasMeaningfulTweetText(selectedText) &&
    (!hasMeaningfulTweetText(tweetText) || selectedText.length >= tweetText.length * 0.4)
  ) {
    tweetText = cleanTweetBody(selectedText);
  }

  const external = extractExternalLink(article);
  const { videoUrl, imageUrl } = extractMediaFromArticle(article);
  const tweetTimestamp = extractTweetTimestamp(article);
  const captureStatus = resolveCaptureStatus(tweetText, selectedText);

  return {
    isTwitterStatusPage: true,
    tweetId,
    authorHandle: authorHandle || handleFromUrl,
    authorDisplayName,
    tweetText: truncateText(tweetText, 4000),
    tweetTimestamp,
    imageUrl,
    videoUrl,
    externalUrl: external?.url || "",
    externalTitle: external?.title || "",
    selectedText,
    captureStatus,
    articleReason: "from_article",
  };
}

function extractExternalLink(article) {
  const anchors = [...article.querySelectorAll('a[href^="http"]')];
  for (const a of anchors) {
    try {
      const u = new URL(a.href);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) {
        continue;
      }
      const title = (a.textContent || "").trim();
      if (title.length > 2 && title.length < 300) {
        return { url: a.href, title };
      }
      return { url: a.href, title: u.hostname };
    } catch {
      continue;
    }
  }
  return null;
}

function resolveCaptureStatus(tweetText, selectedText) {
  if (hasMeaningfulTweetText(tweetText)) {
    if (looksLikeNoisyCapture(tweetText)) return "partial";
    return "captured";
  }
  if (hasMeaningfulTweetText(selectedText)) return "partial";
  return "failed_clean_extract";
}

function extractTwitterPostOnce() {
  const url = window.location.href;
  const tweetId = extractTweetIdFromUrl(url);
  const handleFromUrl = extractHandleFromUrl(url);
  const selectedText = (window.getSelection()?.toString() || "").trim();

  const { article, reason: articleReason } = findMainTweetArticle(tweetId);

  if (!article) {
    const globalText = tweetId ? extractGlobalTweetText(tweetId) : "";
    const ogFallback = extractOgTweetFallback();
    const tweetText = selectedText || globalText || ogFallback || "";
    return {
      isTwitterStatusPage: true,
      tweetId,
      authorHandle: handleFromUrl,
      authorDisplayName: "",
      tweetText,
      tweetTimestamp: "",
      imageUrl: "",
      videoUrl: "",
      externalUrl: "",
      externalTitle: "",
      selectedText,
      captureStatus: resolveCaptureStatus(tweetText, selectedText),
      articleReason: "no_articles",
    };
  }

  const tw = extractTweetFromArticle(article, url, selectedText);
  debugLog("final text length", (tw.tweetText || "").length, "status", tw.captureStatus);
  return { ...tw, articleReason };
}

async function extractTwitterPostWithRetry() {
  let last = null;
  let elapsed = 0;

  for (const targetMs of RETRY_DELAYS_MS) {
    const wait = targetMs - elapsed;
    if (wait > 0) await sleep(wait);
    elapsed = targetMs;

    last = extractTwitterPostOnce();
    debugLog("retry at", targetMs, "ms", "text len", (last.tweetText || "").length);

    if (hasMeaningfulTweetText(last.tweetText)) {
      if (last.captureStatus === "failed_clean_extract" || last.captureStatus === "partial") {
        last.captureStatus = looksLikeNoisyCapture(last.tweetText) ? "partial" : "captured";
      }
      break;
    }
    if (last.captureStatus === "captured") {
      break;
    }
  }

  const base = last || extractTwitterPostOnce();
  return enrichTweetWithMedia(base);
}

function getMeta(selector) {
  const el = document.querySelector(selector);
  return el ? el.getAttribute("content") || el.getAttribute("href") || "" : "";
}

function getCanonicalUrl() {
  const link = document.querySelector('link[rel="canonical"]');
  return link?.href || window.location.href;
}

function getFaviconUrl() {
  const icon =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]') ||
    document.querySelector('link[rel="apple-touch-icon"]');
  if (icon?.href) return icon.href;
  try {
    return new URL("/favicon.ico", window.location.origin).href;
  } catch {
    return "";
  }
}

function extractArticlePageCapture() {
  const selectedText = cleanTextOneLine(window.getSelection()?.toString() || "");
  let capturedText = cleanTextOneLine(document.body?.innerText || "");
  capturedText = truncateText(capturedText, MAX_TEXT);

  return {
    isTwitterStatusPage: false,
    documentTitle: document.title || "",
    canonicalUrl: getCanonicalUrl(),
    metaDescription: getMeta('meta[name="description"]'),
    ogTitle: getMeta('meta[property="og:title"]'),
    ogSiteName: getMeta('meta[property="og:site_name"]'),
    ogImage: getMeta('meta[property="og:image"]'),
    faviconUrl: getFaviconUrl(),
    selectedText,
    capturedText,
    captureStatus: capturedText ? "captured" : "partial",
  };
}

function buildTwitterPageResult(tw) {
  const displayTitle = tw.authorDisplayName
    ? `${tw.authorDisplayName} on X`
    : tw.authorHandle
      ? `@${tw.authorHandle.replace(/^@/, "")} on X`
      : "Post on X";

  return {
    isTwitterStatusPage: true,
    documentTitle: displayTitle,
    canonicalUrl: tw.externalUrl || getCanonicalUrl(),
    metaDescription: tw.externalTitle || "",
    ogTitle: displayTitle,
    ogSiteName: "X",
    ogImage: tw.imageUrl || "",
    faviconUrl: getFaviconUrl(),
    selectedText: tw.selectedText,
    capturedText: tw.tweetText,
    captureStatus: tw.captureStatus,
    tweetId: tw.tweetId,
    authorHandle: tw.authorHandle,
    authorDisplayName: tw.authorDisplayName,
    tweetTimestamp: tw.tweetTimestamp,
    imageUrl: tw.imageUrl,
    videoUrl: tw.videoUrl || "",
    externalUrl: tw.externalUrl,
    externalTitle: tw.externalTitle,
  };
}

async function extractPageCapture() {
  if (isTwitterStatusPage()) {
    const tw = await extractTwitterPostWithRetry();
    return buildTwitterPageResult(tw);
  }
  return extractArticlePageCapture();
}

function extensionContextAlive() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

window.__marknestExtractPageCapture = extractPageCapture;

if (window.__marknestContentScriptListeners) {
  return;
}
window.__marknestContentScriptListeners = true;

if (isTwitterStatusPage() || isTwitterHost(getHost())) {
  const DEBOUNCE_MS = 3000;
  let lastSaveAt = 0;
  let lastUrl = "";

  document.addEventListener(
    "click",
    (event) => {
      if (!extensionContextAlive()) return;

      const target = event.target?.closest?.(
        '[data-testid="bookmark"], [data-testid="removeBookmark"]',
      );
      if (!target) return;

      chrome.storage?.local?.get?.(["autoSaveXBookmarkEnabled"], (prefs) => {
        if (!extensionContextAlive()) return;
        if (!prefs?.autoSaveXBookmarkEnabled) return;

        const article = target.closest("article");
        if (!article) return;

        let statusUrl = window.location.href;
        if (!isTwitterStatusPage()) {
          const fromArticle = statusUrlFromArticle(article);
          if (!fromArticle) return;
          statusUrl = fromArticle;
        }

        const now = Date.now();
        const dedupeKey = statusUrl;
        if (dedupeKey === lastUrl && now - lastSaveAt < DEBOUNCE_MS) return;
        lastSaveAt = now;
        lastUrl = dedupeKey;

        try {
          article.scrollIntoView({ block: "nearest", behavior: "auto" });
        } catch {
          /* ignore */
        }

        const sendCapture = (tw) => {
          if (!extensionContextAlive()) return;
          chrome.runtime.sendMessage({
            type: "marknest-auto-save",
            url: statusUrl,
            capture: buildTwitterPageResult(tw),
          });
        };

        enrichTweetWithMedia(extractTweetFromArticle(article, statusUrl, ""))
          .then(sendCapture)
          .catch(() => {});
      });
    },
    true,
  );
}

})();
