const STORAGE_KEY = "arc-sidebar-state";

const seed = {
  pinned: [
    { label: "Gmail", url: "https://mail.google.com" },
    { label: "Notion", url: "https://www.notion.so" },
    { label: "GitHub", url: "https://github.com" }
  ],
  today: [
    { label: "Docs Chrome Extension", url: "https://developer.chrome.com/docs/extensions" },
    { label: "Arc Browser", url: "https://arc.net" }
  ]
};

const pinnedList = document.getElementById("pinnedList");
const todayList = document.getElementById("todayList");
const quickSearch = document.getElementById("quickSearch");
const addToday = document.getElementById("addToday");
const template = document.getElementById("itemTemplate");

let state = structuredClone(seed);

init();

async function init() {
  const loaded = await chrome.storage.local.get(STORAGE_KEY);
  state = loaded[STORAGE_KEY] ?? structuredClone(seed);
  render();
}

function save() {
  return chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function render() {
  drawList(pinnedList, state.pinned, false);
  drawList(todayList, state.today, true);
}

function drawList(container, items, removable) {
  container.textContent = "";

  items.forEach((entry, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const openButton = node.querySelector(".arc-item-main");
    const removeButton = node.querySelector(".arc-item-remove");
    const label = node.querySelector(".arc-label");

    label.textContent = entry.label;
    openButton.addEventListener("click", () => open(entry.url));

    if (removable) {
      removeButton.addEventListener("click", async () => {
        state.today.splice(index, 1);
        await save();
        render();
      });
    } else {
      removeButton.style.display = "none";
    }

    container.appendChild(node);
  });
}

function open(rawUrl) {
  const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  chrome.tabs.create({ url: normalized });
}

quickSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  const query = quickSearch.value.trim();
  if (!query) {
    return;
  }

  const isUrl = query.includes(".") && !query.includes(" ");
  const target = isUrl
    ? query
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  open(target);
  quickSearch.value = "";
});

addToday.addEventListener("click", async () => {
  const label = prompt("Nom du raccourci :");
  if (!label) {
    return;
  }

  const url = prompt("URL :", "https://");
  if (!url) {
    return;
  }

  state.today.unshift({ label, url });
  await save();
  render();
});
