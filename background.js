chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "arc-sidebar-toggle" });
  } catch {
    // Pages restreintes (chrome://, Web Store, etc.) : aucun content script possible.
    // On ignore silencieusement pour éviter d'interrompre le service worker.
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "arc-sidebar-open-url" && typeof message.url === "string") {
    const target = message.url.startsWith("http")
      ? message.url
      : `https://${message.url}`;

    chrome.tabs.create({ url: target });
  }
});
