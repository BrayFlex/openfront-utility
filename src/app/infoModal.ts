const CHANGELOG_URL =
  "https://raw.githubusercontent.com/BrayFlex/openfront-utility/main/CHANGELOG.md";
const CHANGELOG_LINK =
  "https://github.com/BrayFlex/openfront-utility/blob/main/CHANGELOG.md";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderInline = (line: string) => {
  let out = escapeHtml(line);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, "$1<em>$2</em>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  return out;
};

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const blocks: string[] = [];
  let inList: "ul" | "ol" | null = null;

  const closeList = () => {
    if (inList) {
      blocks.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const tag = `h${heading[1].length}`;
      blocks.push(`<${tag}>${renderInline(heading[2])}</${tag}>`);
      continue;
    }

    const hr = line.match(/^(\*\*\*|---)$/);
    if (hr) {
      closeList();
      blocks.push("<hr>");
      continue;
    }

    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      if (inList !== "ul") {
        closeList();
        blocks.push("<ul>");
        inList = "ul";
      }
      blocks.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inList !== "ol") {
        closeList();
        blocks.push("<ol>");
        inList = "ol";
      }
      blocks.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    closeList();
    blocks.push(`<p>${renderInline(line)}</p>`);
  }
  closeList();
  return blocks.join("\n");
}

let changelogLoaded = false;
let changelogText: string | null = null;
let changelogRequest: Promise<string | null> | null = null;

async function fetchChangelog(): Promise<string | null> {
  if (changelogText !== null) return changelogText;
  if (!changelogRequest) {
    changelogRequest = (async () => {
      try {
        const res = await fetch(CHANGELOG_URL, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        changelogText = await res.text();
        return changelogText;
      } catch {
        return null;
      } finally {
        changelogRequest = null;
      }
    })();
  }
  return changelogRequest;
}

const getChangelogVersion = (md: string) => {
  const match = md.match(/^##\s+(.+)$/m);
  return match ? match[1].trim() : null;
};

const INFO_SEEN_KEY = "pu-info-seen-version";

/**
 * Glow the info button until the current changelog entry has been viewed. New
 * visitors get the glow immediately; returning visitors get it again as soon
 * as a new patch appears at the top of the changelog.
 */
function setupInfoGlow(openBtn: HTMLButtonElement) {
  const baseTitle = openBtn.title;
  let latestVersion: string | null = null;
  let opened = false;

  const readSeen = () => {
    try {
      return localStorage.getItem(INFO_SEEN_KEY);
    } catch {
      return null;
    }
  };

  const writeSeen = (version: string) => {
    try {
      localStorage.setItem(INFO_SEEN_KEY, version);
    } catch {
      // Storage can be unavailable (private mode / blocked); the glow simply
      // falls back to the first-visit behaviour.
    }
  };

  const setGlow = (on: boolean) => {
    openBtn.classList.toggle("info-btn-glow", on);
    openBtn.title = on ? "Tool Information — new changes" : baseTitle;
  };

  // A first-time visitor should see the invitation right away, before the
  // changelog request resolves.
  if (!readSeen()) setGlow(true);

  fetchChangelog().then((text) => {
    if (text === null) return;
    latestVersion = getChangelogVersion(text);
    if (!latestVersion) return;
    if (opened) {
      // They already opened the panel while the version was loading.
      writeSeen(latestVersion);
      return;
    }
    setGlow(readSeen() !== latestVersion);
  });

  return () => {
    opened = true;
    setGlow(false);
    if (latestVersion) writeSeen(latestVersion);
  };
}

async function loadChangelog(contentEl: HTMLElement) {
  if (changelogLoaded) return;
  contentEl.innerHTML = `<p class="changelog-pending">Loading changelog…</p>`;
  const text = await fetchChangelog();
  if (text !== null) {
    contentEl.innerHTML = renderMarkdown(text);
    changelogLoaded = true;
  } else {
    contentEl.innerHTML = `<p class="changelog-pending">Couldn't load the changelog from GitHub.` +
      ` See it directly: <a href="${CHANGELOG_LINK}" target="_blank" rel="noopener">CHANGELOG.md</a></p>`;
  }
}

export function initInfoModal() {
  const modal = document.getElementById("infoModal");
  const openBtn = document.getElementById("infoModalBtn") as HTMLButtonElement | null;
  const closeBtn = document.getElementById("closeInfoModalBtn");
  if (!modal || !openBtn || !closeBtn) return;

  const tabs = Array.from(modal.querySelectorAll<HTMLButtonElement>(".info-tab"));
  const panels = Array.from(modal.querySelectorAll<HTMLElement>(".info-panel"));
  const changelogEl = modal.querySelector<HTMLElement>("#changelogContent");
  const markInfoSeen = setupInfoGlow(openBtn);

  openBtn.addEventListener("click", () => {
    markInfoSeen();
    modal.hidden = false;
  });
  closeBtn.addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) (modal as HTMLElement).hidden = true;
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      tabs.forEach((t) => {
        const selected = t === tab;
        t.classList.toggle("selected", selected);
        t.setAttribute("aria-selected", String(selected));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== name;
      });
      if (name === "changelog" && changelogEl) {
        void loadChangelog(changelogEl);
      }
    });
  });
}