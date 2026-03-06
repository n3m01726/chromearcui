async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "arc-sidebar-ping" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith("http")) {
    return;
  }

  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: "arc-sidebar-toggle" });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "arc-sidebar-open-url" && typeof message.url === "string") {
    const target = message.url.startsWith("http")
      ? message.url
      : `https://${message.url}`;

    chrome.tabs.create({ url: target });
  }
});
