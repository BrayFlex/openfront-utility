const STORAGE_KEY_NAME = "pu-submit-name";
const STORAGE_KEY_ID = "pu-submit-id";

export function initSubmissionModal(options: {
  getBase64: () => string;
  getPrimaryColor: () => string;
  getSecondaryColor: () => string;
}) {
  const { getBase64, getPrimaryColor, getSecondaryColor } = options;

  // ── Build DOM ────────────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "submissionModalTitle");

  overlay.innerHTML = `
    <div class="modal-panel submission-modal">
      <div class="modal-header">
        <h2 class="modal-title" id="submissionModalTitle">Submit Pattern</h2>
        <button class="modal-close" id="submitModalCloseBtn" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label for="submitPatternName">Pattern Name</label>
          <input type="text" id="submitPatternName" placeholder="My Awesome Pattern" autocomplete="off" />
        </div>
        <div class="modal-field">
          <label for="submitPatternId">Pattern ID</label>
          <input type="text" id="submitPatternId" placeholder="my_awesome_pattern" autocomplete="off" />
          <span class="modal-hint">Lowercase letters, numbers and underscores only</span>
        </div>
      </div>
      <div class="modal-footer">
        <button id="submitBookmarkBtn" class="btn-secondary">📌 Bookmark Page</button>
        <button id="submitCancelBtn">Cancel</button>
        <button id="submitConfirmBtn" class="btn-primary">Copy Submission</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector<HTMLInputElement>("#submitPatternName")!;
  const idInput = overlay.querySelector<HTMLInputElement>("#submitPatternId")!;
  const closeBtn = overlay.querySelector<HTMLButtonElement>("#submitModalCloseBtn")!;
  const cancelBtn = overlay.querySelector<HTMLButtonElement>("#submitCancelBtn")!;
  const bookmarkBtn = overlay.querySelector<HTMLButtonElement>("#submitBookmarkBtn")!;
  const confirmBtn = overlay.querySelector<HTMLButtonElement>("#submitConfirmBtn")!;

  // ── Restore saved values ─────────────────────────────────────────────────
  nameInput.value = localStorage.getItem(STORAGE_KEY_NAME) ?? "";
  idInput.value = localStorage.getItem(STORAGE_KEY_ID) ?? "";

  // Auto-generate ID from name (kebab/snake_case)
  nameInput.addEventListener("input", () => {
    if (!idInput.dataset.manuallyEdited) {
      idInput.value = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }
  });
  idInput.addEventListener("input", () => {
    idInput.dataset.manuallyEdited = "1";
  });

  // ── Open / Close ─────────────────────────────────────────────────────────
  const open = () => {
    overlay.hidden = false;
    nameInput.focus();
  };
  const close = () => {
    overlay.hidden = true;
  };

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // ── Bookmark ─────────────────────────────────────────────────────────────
  bookmarkBtn.addEventListener("click", () => {
    try {
      // Update URL first so bookmark captures the current pattern
      const base64 = getBase64();
      const primary = getPrimaryColor().replace("#", "");
      const secondary = getSecondaryColor().replace("#", "");
      const params = new URLSearchParams({ primary, secondary });
      window.history.replaceState(null, "", `#${base64}?${params}`);
    } catch {
      // ignore
    }
    // Suggest bookmark (browser security means we can only guide the user)
    alert("Press Ctrl/Cmd+D to bookmark this page with your current pattern.");
  });

  // ── Confirm / Copy submission ────────────────────────────────────────────
  confirmBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const id = idInput.value.trim();
    if (!name || !id) {
      alert("Please fill in both Pattern Name and Pattern ID.");
      return;
    }
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_NAME, name);
    localStorage.setItem(STORAGE_KEY_ID, id);
    delete idInput.dataset.manuallyEdited;

    // Build submission text
    const base64 = getBase64();
    const primary = getPrimaryColor();
    const secondary = getSecondaryColor();
    const text = [
      `Pattern Name: ${name}`,
      `Pattern ID: ${id}`,
      `Primary Color: ${primary}`,
      `Secondary Color: ${secondary}`,
      `Base64: ${base64}`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(
      () => alert("Submission copied to clipboard!"),
      () => {
        // Fallback
        prompt("Copy your submission:", text);
      }
    );
    close();
  });

  return { open };
}
