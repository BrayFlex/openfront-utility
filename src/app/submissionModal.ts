const STORAGE_KEY_PLAYER_NAME = "pu-submit-player-name";
const STORAGE_KEY_PLAYER_ID = "pu-submit-player-id";
const STORAGE_KEY_PATTERN_NAME = "pu-submit-pattern-name";

export function initSubmissionModal(options: {
  getBase64: () => string;
  getPrimaryColor: () => string;
  getSecondaryColor: () => string;
  getPatternUrl: () => string;
}) {
  const { getPrimaryColor, getSecondaryColor, getPatternUrl } = options;

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
          <label for="submitPlayerName">Player Name</label>
          <input type="text" id="submitPlayerName" placeholder="John Doe" autocomplete="off" />
        </div>
        <div class="modal-field">
          <label for="submitPlayerId">Player ID</label>
          <input type="text" id="submitPlayerId" placeholder="12345678" autocomplete="off" />
        </div>
        <div class="modal-field">
          <label for="submitPatternName">Pattern Name</label>
          <input type="text" id="submitPatternName" placeholder="My Awesome Pattern" autocomplete="off" />
        </div>
      </div>
      <div class="modal-footer">
        <button id="submitCancelBtn">Cancel</button>
        <button id="submitConfirmBtn" class="btn-primary">Open Google Form</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const playerNameInput = overlay.querySelector<HTMLInputElement>("#submitPlayerName")!;
  const playerIdInput = overlay.querySelector<HTMLInputElement>("#submitPlayerId")!;
  const patternNameInput = overlay.querySelector<HTMLInputElement>("#submitPatternName")!;
  const closeBtn = overlay.querySelector<HTMLButtonElement>("#submitModalCloseBtn")!;
  const cancelBtn = overlay.querySelector<HTMLButtonElement>("#submitCancelBtn")!;
  const confirmBtn = overlay.querySelector<HTMLButtonElement>("#submitConfirmBtn")!;

  // ── Restore saved values ─────────────────────────────────────────────────
  playerNameInput.value = localStorage.getItem(STORAGE_KEY_PLAYER_NAME) ?? "";
  playerIdInput.value = localStorage.getItem(STORAGE_KEY_PLAYER_ID) ?? "";
  patternNameInput.value = localStorage.getItem(STORAGE_KEY_PATTERN_NAME) ?? "";

  // ── Open / Close ─────────────────────────────────────────────────────────
  const open = () => {
    overlay.hidden = false;
    playerNameInput.focus();
  };
  const close = () => {
    overlay.hidden = true;
  };

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // ── Confirm / Open Google Form ───────────────────────────────────────────
  confirmBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const playerId = playerIdInput.value.trim();
    const patternName = patternNameInput.value.trim();
    if (!playerName || !playerId || !patternName) {
      alert("Please fill in Player Name, Player ID, and Pattern Name.");
      return;
    }
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, playerName);
    localStorage.setItem(STORAGE_KEY_PLAYER_ID, playerId);
    localStorage.setItem(STORAGE_KEY_PATTERN_NAME, patternName);

    // Build URL parameters (replace entry.X with actual form fields once known)
    // For now, this is a placeholder structure
    const patternUrl = getPatternUrl();
    const formUrl = new URL("https://docs.google.com/forms/d/e/YOUR_FORM_ID_HERE/viewform");
    formUrl.searchParams.set("usp", "pp_url");
    formUrl.searchParams.set("entry.1", playerName);
    formUrl.searchParams.set("entry.2", playerId);
    formUrl.searchParams.set("entry.3", patternName);
    formUrl.searchParams.set("entry.4", patternUrl);

    window.open(formUrl.toString(), "_blank");
    close();
  });

  return { open };
}
