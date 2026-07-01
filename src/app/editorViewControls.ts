type EditorViewControlsOptions = {
  shell: HTMLElement;
  toolbarToggleButton: HTMLButtonElement;
  modeButtons: NodeListOf<HTMLButtonElement>;
  previewPanel: HTMLElement;
  previewHeader: HTMLElement;
  floatPreviewButton: HTMLButtonElement;
  dockPreviewButton: HTMLButtonElement;
};

type ViewMode = "both" | "canvas" | "preview";

export function initEditorViewControls(options: EditorViewControlsOptions) {
  const {
    shell,
    toolbarToggleButton,
    modeButtons,
    previewPanel,
    previewHeader,
    floatPreviewButton,
    dockPreviewButton,
  } = options;
  let floatingPointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let dockedViewMode: ViewMode =
    (shell.dataset.viewMode as ViewMode | undefined) ?? "both";

  const isPreviewFloating = () => previewPanel.classList.contains("floating");

  const applyViewMode = (mode: ViewMode) => {
    shell.dataset.viewMode = mode;
    modeButtons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.viewMode === mode);
    });
  };

  const syncModeButtons = () => {
    const floating = isPreviewFloating();
    modeButtons.forEach((button) => {
      button.disabled = floating && button.dataset.viewMode !== "canvas";
    });
  };

  const setViewMode = (mode: ViewMode) => {
    if (!isPreviewFloating()) {
      dockedViewMode = mode;
      applyViewMode(mode);
      return;
    }
    applyViewMode("canvas");
  };

  const setToolbarOpen = (open: boolean) => {
    shell.classList.toggle("toolbar-collapsed", !open);
    shell.classList.toggle("toolbar-open", open);
    toolbarToggleButton.setAttribute("aria-expanded", String(open));
  };

  const floatPreview = () => {
    dockedViewMode = (shell.dataset.viewMode as ViewMode | undefined) ?? "both";
    previewPanel.classList.add("floating");
    dockPreviewButton.hidden = false;
    floatPreviewButton.hidden = true;
    applyViewMode("canvas");
    syncModeButtons();
  };

  const dockPreview = () => {
    previewPanel.classList.remove("floating");
    previewPanel.style.left = "";
    previewPanel.style.top = "";
    dockPreviewButton.hidden = true;
    floatPreviewButton.hidden = false;
    applyViewMode(dockedViewMode);
    syncModeButtons();
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.viewMode as ViewMode | undefined;
      if (mode) setViewMode(mode);
    });
  });

  toolbarToggleButton.addEventListener("click", () => {
    setToolbarOpen(shell.classList.contains("toolbar-collapsed"));
  });

  floatPreviewButton.addEventListener("click", floatPreview);
  dockPreviewButton.addEventListener("click", dockPreview);

  previewHeader.addEventListener("pointerdown", (event) => {
    if (!previewPanel.classList.contains("floating")) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    event.preventDefault();
    const rect = previewPanel.getBoundingClientRect();
    floatingPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    previewHeader.setPointerCapture(event.pointerId);
  });

  previewHeader.addEventListener("pointermove", (event) => {
    if (floatingPointerId !== event.pointerId) return;
    const maxLeft = window.innerWidth - previewPanel.offsetWidth - 8;
    const maxTop = window.innerHeight - previewPanel.offsetHeight - 8;
    const nextLeft = startLeft + event.clientX - startX;
    const nextTop = startTop + event.clientY - startY;
    previewPanel.style.left = `${Math.max(8, Math.min(maxLeft, nextLeft))}px`;
    previewPanel.style.top = `${Math.max(8, Math.min(maxTop, nextTop))}px`;
  });

  const stopDrag = (event: PointerEvent) => {
    if (floatingPointerId !== event.pointerId) return;
    floatingPointerId = null;
    previewHeader.releasePointerCapture(event.pointerId);
  };

  previewHeader.addEventListener("pointerup", stopDrag);
  previewHeader.addEventListener("pointercancel", stopDrag);

  applyViewMode(dockedViewMode);
  setToolbarOpen(!window.matchMedia("(max-width: 900px)").matches);
  syncModeButtons();

  return { setViewMode, dockPreview, floatPreview };
}
