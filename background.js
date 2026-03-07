async function disableActionSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch {
    // Ignore when unsupported; main behavior is handled by content script toggle.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void disableActionSidePanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  void disableActionSidePanelBehavior();
});

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

function flattenBookmarkNodes(nodes, results) {
  nodes.forEach((node) => {
    if (node.url) {
      results.push({
        label: node.title || new URL(node.url).hostname,
        url: node.url
      });
    }

    if (node.children?.length) {
      flattenBookmarkNodes(node.children, results);
    }
  });
}

async function getTopBookmarks(limit = 12) {
  const tree = await chrome.bookmarks.getTree();
  const results = [];

  flattenBookmarkNodes(tree, results);

  return results.slice(0, limit);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "arc-sidebar-open-url" && typeof message.url === "string") {
    const target = message.url.startsWith("http")
      ? message.url
      : `https://${message.url}`;

    chrome.tabs.create({ url: target });
    return;
  }

  if (message.type === "arc-sidebar-get-bookmarks") {
    void getTopBookmarks()
      .then((bookmarks) => sendResponse({ bookmarks }))
      .catch(() => sendResponse({ bookmarks: [] }));

    return true;
  }
});
