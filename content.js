(() => {
  const HOST_ID = "arc-sidebar-host";
  const STORAGE_KEY = "arc-sidebar-state";

  const seed = {
    today: [
      { label: "Docs Chrome Extension", url: "https://developer.chrome.com/docs/extensions" },
      { label: "Arc Browser", url: "https://arc.net" }
    ]
  };

  let state = structuredClone(seed);
  let bookmarks = [];

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "arc-sidebar-ping") {
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "arc-sidebar-toggle") {
      void toggleSidebar();
    }
  });

  async function toggleSidebar() {
    const current = document.getElementById(HOST_ID);
    if (current) {
      current.remove();
      document.documentElement.style.marginLeft = "";
      return;
    }

    const loaded = await chrome.storage.local.get(STORAGE_KEY);
    const loadedState = loaded[STORAGE_KEY] ?? {};
    state.today = Array.isArray(loadedState.today) ? loadedState.today : structuredClone(seed.today);
    bookmarks = await getBookmarks();

    const host = document.createElement("div");
    host.id = HOST_ID;
    host.innerHTML = buildMarkup();
    document.documentElement.appendChild(host);
    document.documentElement.style.marginLeft = "320px";

    wireEvents(host);
    render(host);
  }

  function getBookmarks() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "arc-sidebar-get-bookmarks" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }

        resolve(Array.isArray(response?.bookmarks) ? response.bookmarks : []);
      });
    });
  }

  function buildMarkup() {
    return `
      <style>
        #${HOST_ID} {
          position: fixed;
          top: 0;
          left: 0;
          width: 320px;
          height: 100vh;
          z-index: 2147483647;
          background: radial-gradient(circle at top, #1a2140 0%, #0d1019 50%);
          color: #f5f7ff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          border-right: 1px solid #2a375e;
          box-shadow: 8px 0 30px rgba(0, 0, 0, 0.35);
        }
        #${HOST_ID} * { box-sizing: border-box; }
        .arc-shell { display: flex; flex-direction: column; gap: 14px; min-height: 100vh; padding: 14px; }
        .arc-top { display: flex; gap: 8px; }
        .arc-circle { border: 1px solid #2a375e; background: #1a2240; color: #f5f7ff; width: 32px; height: 32px; border-radius: 999px; cursor: pointer; }
        .arc-circle:hover { border-color: #8ea3ff; }
        .arc-search-wrap, .arc-group { background: #13192a; border: 1px solid #2a375e; border-radius: 14px; }
        .arc-search-wrap { padding: 8px; }
        .arc-search { width: 100%; background: transparent; border: none; color: #f5f7ff; outline: none; }
        .arc-search::placeholder, .arc-title, .arc-mini, .arc-footer { color: #9aa7ce; }
        .arc-group { padding: 10px; }
        .arc-row { display: flex; justify-content: space-between; align-items: center; }
        .arc-title { margin: 4px 0 8px; font-size: 12px; letter-spacing: .5px; text-transform: uppercase; }
        .arc-mini { border: 1px solid #2a375e; background: transparent; border-radius: 8px; font-size: 11px; padding: 2px 8px; cursor: pointer; }
        .arc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .arc-item { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
        .arc-item-main, .arc-item-remove { border: 1px solid transparent; background: #1c2440; color: #f5f7ff; border-radius: 10px; cursor: pointer; }
        .arc-item-main { display: flex; align-items: center; gap: 10px; padding: 10px; text-align: left; }
        .arc-item-main:hover, .arc-item-remove:hover { border-color: #8ea3ff; }
        .arc-item-remove { width: 32px; }
        .arc-bullet { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(120deg, #5ca6ff, #9f7fff); box-shadow: 0 0 0 3px rgb(142 163 255 / 20%); }
        .arc-label { font-size: 13px; }
        .arc-empty { color: #9aa7ce; font-size: 12px; text-align: center; padding: 8px; }
        .arc-footer { margin-top: auto; font-size: 11px; text-align: center; }
      </style>
      <aside class="arc-shell">
        <header class="arc-top">
          <button class="arc-circle" id="arcClose">×</button>
        </header>

        <section class="arc-search-wrap">
          <input id="quickSearch" class="arc-search" placeholder="Rechercher ou entrer une URL" />
        </section>

        <section class="arc-group">
          <h2 class="arc-title">Favoris</h2>
          <ul id="pinnedList" class="arc-list"></ul>
        </section>

        <section class="arc-group">
          <div class="arc-row">
            <h2 class="arc-title">Aujourd'hui</h2>
            <button class="arc-mini" id="addToday">Ajouter</button>
          </div>
          <ul id="todayList" class="arc-list"></ul>
        </section>

        <footer class="arc-footer">Arc-like sidebar (gauche)</footer>
      </aside>
    `;
  }

  function wireEvents(host) {
    host.querySelector("#arcClose").addEventListener("click", () => {
      host.remove();
      document.documentElement.style.marginLeft = "";
    });

    const quickSearch = host.querySelector("#quickSearch");
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

      chrome.runtime.sendMessage({ type: "arc-sidebar-open-url", url: target });
      quickSearch.value = "";
    });

    host.querySelector("#addToday").addEventListener("click", async () => {
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
      render(host);
    });
  }

  function render(host) {
    drawList(host.querySelector("#pinnedList"), bookmarks, false, host);
    drawList(host.querySelector("#todayList"), state.today, true, host);
  }

  function drawList(container, items, removable, host) {
    container.textContent = "";

    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "arc-empty";
      empty.textContent = removable
        ? "Aucun raccourci aujourd'hui"
        : "Aucun favori trouvé dans Chrome";
      container.appendChild(empty);
      return;
    }

    items.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "arc-item";
      item.innerHTML = `
        <button class="arc-item-main"><span class="arc-bullet"></span><span class="arc-label"></span></button>
        <button class="arc-item-remove" title="Supprimer">×</button>
      `;

      item.querySelector(".arc-label").textContent = entry.label;
      item.querySelector(".arc-item-main").addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "arc-sidebar-open-url", url: entry.url });
      });

      const remove = item.querySelector(".arc-item-remove");
      if (!removable) {
        remove.style.display = "none";
      } else {
        remove.addEventListener("click", async () => {
          state.today.splice(index, 1);
          await save();
          render(host);
        });
      }

      container.appendChild(item);
    });
  }

  function save() {
    return chrome.storage.local.set({ [STORAGE_KEY]: { today: state.today } });
  }
})();
