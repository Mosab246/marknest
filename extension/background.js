importScripts("sharedCapture.js");

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    await chrome.storage.local.set({
      quickSaveEnabled: false,
      autoSaveXBookmarkEnabled: false,
    });
  }
  try {
    await chrome.contextMenus.removeAll();
  } catch {
    /* first install */
  }
  chrome.contextMenus.create({
    id: "save-to-marknest",
    title: "Save to MarkNest",
    contexts: ["page", "selection", "link"],
  });
  chrome.contextMenus.create({
    id: "save-highlight-to-marknest",
    title: "Save highlight to MarkNest",
    contexts: ["selection"],
  });
  await applyQuickSaveMode();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.quickSaveEnabled) {
    applyQuickSaveMode();
  }
});

chrome.runtime.onStartup.addListener(() => {
  applyQuickSaveMode();
});

chrome.action.onClicked.addListener(async (tab) => {
  const prefs = await getPrefs();
  if (!prefs.quickSaveEnabled) return;
  if (!tab?.id || !tab.url || tab.url.startsWith("chrome://")) return;
  try {
    const { data } = await quickSaveTab(tab, null);
    notifyMarkNest("MarkNest", captureResultMessage(data));
  } catch {
    notifyMarkNest("MarkNest", "Open MarkNest, then try again.");
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !tab.url || tab.url.startsWith("chrome://")) return;
  try {
    const selected =
      info.selectionText && (info.menuItemId === "save-to-marknest" || info.menuItemId === "save-highlight-to-marknest")
        ? info.selectionText.trim()
        : null;
    const { data } = await quickSaveTab(tab, selected);
    notifyMarkNest("MarkNest", captureResultMessage(data));
  } catch {
    notifyMarkNest("MarkNest", "Open MarkNest, then try again.");
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-to-marknest") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || tab.url.startsWith("chrome://")) return;
  try {
    const { data } = await quickSaveTab(tab, null);
    notifyMarkNest("MarkNest", captureResultMessage(data));
  } catch {
    notifyMarkNest("MarkNest", "Open MarkNest, then try again.");
  }
});

async function updateBridgeBadge() {
  try {
    const res = await fetch(`${MARKNEST_BRIDGE}/api/health`);
    if (res.ok) {
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
    } else {
      await chrome.action.setBadgeText({ text: "!" });
      await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
    }
  } catch {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  }
}

updateBridgeBadge();
setInterval(updateBridgeBadge, 60_000);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "marknest-auto-save") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
      if (!tab?.id || !tab.url || tab.url.startsWith("chrome://")) {
        sendResponse({ ok: false });
        return;
      }
      try {
        const { data } = await quickSaveTab(tab, null, {
          captureOverride: message.capture || null,
          urlOverride: message.url || null,
        });
        notifyMarkNest("MarkNest", captureResultMessage(data));
        sendResponse({ ok: true, data });
      } catch {
        sendResponse({ ok: false });
      }
    });
    return true;
  }
});
