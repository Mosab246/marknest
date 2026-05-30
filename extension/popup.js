const BRIDGE = MARKNEST_BRIDGE;

function setStatus(msg, isError) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status " + (isError ? "error" : "ok");
}

function setConnectionBanner(connected) {
  const el = document.getElementById("connectionBanner");
  if (!el) return;
  if (connected) {
    el.textContent = "Connected to MarkNest";
    el.className = "connection-banner connected";
  } else {
    el.textContent =
      "MarkNest not running — Open MarkNest or start it from the tray, then try again.";
    el.className = "connection-banner disconnected";
  }
}

function updatePrefsStatus(prefs) {
  const el = document.getElementById("prefsStatus");
  if (!el) return;
  const quick = prefs.quickSaveEnabled ? "ON" : "OFF";
  const xAuto = prefs.autoSaveXBookmarkEnabled ? "ON" : "OFF";
  el.textContent = `Quick Save: ${quick} · X auto-bookmark: ${xAuto}`;
}

async function checkBridge() {
  const res = await fetch(`${BRIDGE}/api/health`);
  if (!res.ok) throw new Error("Bridge unavailable");
  return res.json();
}

function applyCapture(tab, capture) {
  const url = tab.url || "";
  const source = detectSource(url);
  const type = defaultType(url, source);
  const tweetId = capture.tweetId || extractTweetId(url);
  const handle = capture.authorHandle || extractHandleFromTweetUrl(url);
  const isTweet = capture.isTwitterStatusPage || isTweetUrl(url);

  let sourceLabel = `Source: ${source}`;
  if (isTweet) {
    sourceLabel = `Source: X/Twitter tweet${tweetId ? ` · ${tweetId}` : ""}`;
    if (handle) sourceLabel += ` · @${handle.replace(/^@/, "")}`;
  }

  document.getElementById("source").textContent = sourceLabel;
  document.getElementById("url").textContent = url;

  const title = isTweet
    ? tweetDisplayTitle(capture, handle)
    : capture.ogTitle || capture.documentTitle || tab.title || "";

  document.getElementById("title").value = title;
  document.getElementById("type").value = type;

  const preview = capture.capturedText?.slice(0, 280) || "";
  document.getElementById("capturedPreview").textContent =
    preview || (isTweet ? "(tweet text not extracted)" : "(no page text)");

  const selected = capture.selectedText?.slice(0, 200) || "";
  document.getElementById("selectedPreview").textContent = selected || "(none)";
  const hint = document.getElementById("highlightHint");
  if (hint) hint.style.display = selected ? "block" : "none";

  const mediaStatus = document.getElementById("mediaStatus");
  if (mediaStatus) {
    if (capture.videoUrl) {
      mediaStatus.textContent = `Video URL captured (${capture.videoUrl.slice(0, 48)}…)`;
      mediaStatus.style.color = "";
    } else if (isTweet && capture.imageUrl && /video_thumb/i.test(capture.imageUrl)) {
      mediaStatus.textContent =
        "Video thumb found — MarkNest will show the X embed player after save.";
      mediaStatus.style.color = "";
    } else if (isTweet && capture.imageUrl) {
      mediaStatus.textContent = "Image captured (not detected as video).";
    } else {
      mediaStatus.textContent = "";
    }
  }

  const warn = document.getElementById("extractWarn");
  if (warn) {
    const hasTweetText = Boolean(capture.capturedText?.trim());
    if (
      isTweet &&
      capture.captureStatus === "failed_clean_extract" &&
      !hasTweetText
    ) {
      warn.textContent =
        "Tweet text could not be extracted. You can still save the URL and notes.";
      warn.style.display = "block";
    } else if (isTweet && capture.captureStatus === "partial" && !hasTweetText) {
      warn.textContent = "Partial extraction — review tweet text before saving.";
      warn.style.display = "block";
    } else if (isTweet && capture.videoUrl) {
      warn.textContent = "Video detected — will play in MarkNest when saved.";
      warn.style.display = "block";
    } else if (isTweet && capture.imageUrl) {
      warn.textContent = "Media image detected.";
      warn.style.display = "block";
    } else {
      warn.style.display = "none";
    }
  }

  return { url, source, type, tweetId, handle, capture, isTweet };
}

async function buildPayload(ctx) {
  const { url, type, capture, isTweet, handle } = ctx;
  const prefs = await getPrefs();
  const title = isTweet
    ? tweetDisplayTitle(capture, handle)
    : document.getElementById("title").value || null;

  return buildCapturePayload(url, capture, prefs, {
    includeNotes: true,
    title,
    type: document.getElementById("type").value || type,
    notes: document.getElementById("notes").value || null,
    tags: document.getElementById("tags").value || null,
    folderName: document.getElementById("folder").value || null,
    isFavorite: document.getElementById("favorite").checked,
    highlightNote: document.getElementById("highlightNote")?.value?.trim() || null,
    selectedText: capture.selectedText || null,
  });
}

async function savePrefsFromForm() {
  const quickSaveEnabled = document.getElementById("quickSaveEnabled").checked;
  const autoSaveXBookmarkEnabled = document.getElementById("autoSaveXBookmarkEnabled").checked;
  await chrome.storage.local.set({
    quickSaveEnabled,
    autoSaveXBookmarkEnabled,
    lastTags: document.getElementById("tags").value,
    lastFolder: document.getElementById("folder").value,
    defaultFavorite: document.getElementById("favorite").checked,
  });
  await applyQuickSaveMode();
}

async function save() {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  setStatus("Saving…", false);
  try {
    await checkBridge();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error("No active tab");

    const capture = await extractCapture(tab.id);
    const ctx = applyCapture(tab, capture);
    const payload = await buildPayload(ctx);
    const data = await postCapture(payload);

    await savePrefsFromForm();

    setStatus(captureResultMessage(data), false);
  } catch (e) {
    const offline =
      e.message?.includes("fetch") || e.message?.includes("Bridge");
    if (offline) setConnectionBanner(false);
    setStatus(
      offline
        ? "MarkNest not running — open the app or tray icon, then try again."
        : e.message || "Save failed",
      true,
    );
  } finally {
    btn.disabled = false;
  }
}

function updateQuickSaveNotice(quickSaveEnabled) {
  const el = document.getElementById("quickSaveNotice");
  if (el) el.style.display = quickSaveEnabled ? "block" : "none";
}

async function init() {
  const prefs = await getPrefs();
  document.getElementById("quickSaveEnabled").checked = prefs.quickSaveEnabled;
  updateQuickSaveNotice(prefs.quickSaveEnabled);
  document.getElementById("autoSaveXBookmarkEnabled").checked =
    prefs.autoSaveXBookmarkEnabled;
  updatePrefsStatus(prefs);
  if (prefs.lastTags) document.getElementById("tags").value = prefs.lastTags;
  if (prefs.lastFolder) document.getElementById("folder").value = prefs.lastFolder;
  document.getElementById("favorite").checked = prefs.defaultFavorite;

  document.getElementById("quickSaveEnabled").addEventListener("change", async () => {
    updateQuickSaveNotice(document.getElementById("quickSaveEnabled").checked);
    await savePrefsFromForm();
    updatePrefsStatus(await getPrefs());
  });
  document.getElementById("autoSaveXBookmarkEnabled").addEventListener("change", async () => {
    await savePrefsFromForm();
    updatePrefsStatus(await getPrefs());
  });

  try {
    await checkBridge();
    setConnectionBanner(true);
    setStatus("Ready to save", false);
  } catch {
    setConnectionBanner(false);
    setStatus("Bridge offline — start MarkNest first", true);
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url && !tab.url.startsWith("chrome://")) {
    try {
      const capture = await extractCapture(tab.id);
      applyCapture(tab, capture);
    } catch {
      document.getElementById("url").textContent = tab.url || "";
    }
  }

  document.getElementById("saveBtn").addEventListener("click", save);
}

document.addEventListener("DOMContentLoaded", init);
