import { createClipboardManager } from "./app/clipboard.js";
import { initColorPresetControls } from "./app/colorPresets.js";
import { copyText } from "./app/copyText.js";
import { createDrawingTools } from "./app/drawingTools.js";
import {
  buildDevStorageOutput,
  buildDiscordOutput,
  buildPreviewLink,
} from "./app/exportOutputs.js";
import { setupGridGuides } from "./app/gridGuides.js";
import { createGridManager } from "./app/gridManager.js";
import { setupHistoryShortcuts } from "./app/historyShortcuts.js";
import { initImageImportOverlay } from "./app/imageImportOverlay.js";
import {
  decodePatternBase64,
  generatePatternBase64,
} from "./app/patternEncoding.js";
import { createPatternLoader } from "./app/patternLoader.js";
import { initPaneResizeControls } from "./app/paneResizeControls.js";
import { createPreviewRenderer } from "./app/previewRenderer.js";
import { initSubmissionModal } from "./app/submissionModal.js";
import { createToolState } from "./app/toolState.js";
import { createHistoryManager } from "./app/undoRedo.js";
import { initWorkspaceControls } from "./app/workspaceControls.js";
import { initThemeToggle } from "./app/themeToggle.js";

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleEl = document.getElementById("themeToggle") as HTMLInputElement;
  if (themeToggleEl) initThemeToggle(themeToggleEl);

  // ── Element references ───────────────────────────────────────────────────
  const gridDiv = document.getElementById("grid")!;
  const scrapGridDiv = document.getElementById("scrapGrid")!;

  // Tool strip
  const toolButtons = document.querySelectorAll<HTMLButtonElement>("[data-tool]");
  const sizeSlider = document.getElementById("toolSizeSlider") as HTMLInputElement;
  const sizeOutput = document.getElementById("toolSizeOutput")!;
  const toolSizeBtn = document.getElementById("toolSizeBtn") as HTMLButtonElement;
  const sizePopover = document.getElementById("sizePopover") as HTMLDivElement;

  if (toolSizeBtn && sizePopover) {
    toolSizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sizePopover.hidden = !sizePopover.hidden;
      if (!sizePopover.hidden) {
        const rect = toolSizeBtn.getBoundingClientRect();
        sizePopover.style.top = `${rect.bottom + 8}px`;
        sizePopover.style.left = `${rect.left}px`;
      }
    });
    document.addEventListener("click", (e) => {
      if (!sizePopover.contains(e.target as Node) && e.target !== toolSizeBtn) {
        sizePopover.hidden = true;
      }
    });
  }
  const sizeGroup = document.getElementById("toolSizeGroup") as HTMLElement;

  // Undo / Redo
  const undoBtn = document.getElementById("undoBtn") as HTMLButtonElement;
  const redoBtn = document.getElementById("redoBtn") as HTMLButtonElement;
  const scrapUndoBtn = document.getElementById("scrapUndoBtn") as HTMLButtonElement;
  const scrapRedoBtn = document.getElementById("scrapRedoBtn") as HTMLButtonElement;

  // Edit actions
  const cutBtn = document.getElementById("cutBtn") as HTMLButtonElement;
  const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
  const pasteBtn = document.getElementById("pasteBtn") as HTMLButtonElement;

  // Transformations
  const shiftUpBtn = document.getElementById("shiftUpBtn") as HTMLButtonElement;
  const shiftDownBtn = document.getElementById("shiftDownBtn") as HTMLButtonElement;
  const shiftLeftBtn = document.getElementById("shiftLeftBtn") as HTMLButtonElement;
  const shiftRightBtn = document.getElementById("shiftRightBtn") as HTMLButtonElement;
  const flipHBtn = document.getElementById("flipHBtn") as HTMLButtonElement;
  const flipVBtn = document.getElementById("flipVBtn") as HTMLButtonElement;
  const rotateLeftBtn = document.getElementById("rotateLeftBtn") as HTMLButtonElement;
  const rotateRightBtn = document.getElementById("rotateRightBtn") as HTMLButtonElement;
  const deselectBtn = document.getElementById("deselectBtn") as HTMLButtonElement;

  // Canvas controls
  const tileWidthInput = document.getElementById("tileWidth") as HTMLInputElement;
  const tileWidthValue = document.getElementById("tileWidthValue") as HTMLInputElement;
  const tileWidthUpBtn = document.getElementById("tileWidthUp") as HTMLButtonElement;
  const tileWidthDownBtn = document.getElementById("tileWidthDown") as HTMLButtonElement;
  const tileHeightInput = document.getElementById("tileHeight") as HTMLInputElement;
  const tileHeightValue = document.getElementById("tileHeightValue") as HTMLInputElement;
  const tileHeightUpBtn = document.getElementById("tileHeightUp") as HTMLButtonElement;
  const tileHeightDownBtn = document.getElementById("tileHeightDown") as HTMLButtonElement;
  const scaleSelect = document.getElementById("scaleSelect") as HTMLSelectElement;
  const invertBtn = document.getElementById("invertBtn") as HTMLButtonElement;
  const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;

  // Canvas tab switcher
  const canvasTabMain = document.getElementById("canvasTabMain") as HTMLButtonElement;
  const canvasTabScrap = document.getElementById("canvasTabScrap") as HTMLButtonElement;
  const mainGridWrap = document.getElementById("mainGridWrap") as HTMLElement;
  const scrapGridWrap = document.getElementById("scrapGridWrap") as HTMLElement;

  // Import
  const base64Input = document.getElementById("base64Input") as HTMLInputElement;
  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;

  // Export / Import toggle
  const exportTabBtn = document.getElementById("exportTabBtn") as HTMLButtonElement;
  const importTabBtn = document.getElementById("importTabBtn") as HTMLButtonElement;
  const exportPanel = document.getElementById("exportPanel") as HTMLElement;
  const importPanel = document.getElementById("importPanel") as HTMLElement;

  // Copy buttons
  const copyJsonBtn = document.getElementById("copyJsonBtn") as HTMLButtonElement;
  const copyDiscordBtn = document.getElementById("copyDiscordBtn") as HTMLButtonElement;
  const copyPreviewBtn = document.getElementById("copyPreviewBtn") as HTMLButtonElement;

  // Preview panel
  const previewCanvas = document.getElementById("preview") as HTMLCanvasElement;
  const previewPrimaryColor = document.getElementById("previewPrimaryColor") as HTMLInputElement;
  const previewSecondaryColor = document.getElementById("previewSecondaryColor") as HTMLInputElement;
  const swapColorsBtn = document.getElementById("swapColorsBtn") as HTMLButtonElement;
  const colorPresetContainer = document.getElementById("colorPresetContainer") as HTMLDivElement;
  const selectedPresetLabel = document.getElementById("selectedPresetLabel");
  const hidePreviewBtn = document.getElementById("hidePreviewBtn") as HTMLButtonElement;
  const showPreviewBtn = document.getElementById("showPreviewBtn") as HTMLButtonElement;
  const floatPreviewBtn = document.getElementById("floatPreviewBtn") as HTMLButtonElement;
  const dockPreviewBtn = document.getElementById("dockPreviewBtn") as HTMLButtonElement;
  const previewPanel = document.querySelector<HTMLElement>(".preview-panel")!;
  const previewHeader = document.querySelector<HTMLElement>(".preview-header")!;

  // Submission
  const submitPatternBtn = document.getElementById("submitPatternBtn") as HTMLButtonElement;

  // Workspace zoom
  const zoomInBtn = document.getElementById("zoomInBtn") as HTMLButtonElement;
  const zoomOutBtn = document.getElementById("zoomOutBtn") as HTMLButtonElement;
  const resetViewBtn = document.getElementById("resetViewBtn") as HTMLButtonElement;
  const zoomValueEl = document.getElementById("zoomValue") as HTMLOutputElement;

  const toolbox = document.getElementById("toolbox");

  if (!colorPresetContainer) throw new Error("Missing #colorPresetContainer");
  const previewCtx = previewCanvas.getContext("2d");
  if (!previewCtx) throw new Error("2D context not supported");

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const clipboard = createClipboardManager();

  // ── Canvas switcher state ─────────────────────────────────────────────────
  let isScrapActive = false;

  const switchCanvas = (scrap: boolean) => {
    isScrapActive = scrap;
    mainGridWrap.hidden = scrap;
    scrapGridWrap.hidden = !scrap;
    canvasTabMain.classList.toggle("selected", !scrap);
    canvasTabScrap.classList.toggle("selected", scrap);
    undoBtn.hidden = scrap;
    redoBtn.hidden = scrap;
    scrapUndoBtn.hidden = !scrap;
    scrapRedoBtn.hidden = !scrap;
    updateOutput();
  };

  canvasTabMain.addEventListener("click", () => switchCanvas(false));
  canvasTabScrap.addEventListener("click", () => switchCanvas(true));

  const toolState = createToolState({ toolButtons, sizeSlider, sizeOutput, sizeGroup });
  const shapeTypeSelect = document.getElementById("shapeType") as HTMLSelectElement;
  if (shapeTypeSelect) {
    shapeTypeSelect.addEventListener("change", () => {
      toolState.selectTool("shape");
    });
  }

  // ── Guide state ───────────────────────────────────────────────────────────
  let handleGuideChange = () => {};
  const guideState = setupGridGuides(toolbox, () => handleGuideChange());

  // ── Grid Scale (visual) ───────────────────────────────────────────────────
  // Visual zoom is handled by workspaceControls now, so internal scale factor is 1
  const makeGridScaleSelect = () => {
    return {
      get value() { return "1"; },
      addEventListener: (ev: string, fn: EventListenerOrEventListenerObject) => {},
    } as unknown as HTMLSelectElement;
  };

  // ── MAIN grid manager ─────────────────────────────────────────────────────
  const mainGrid = createGridManager({
    gridDiv,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    gridScaleInput: makeGridScaleSelect(),
    guideState,
    toolState,
    clipboard,
    onPatternChange: () => { if (!isScrapActive) updateOutput(); },
  });

  const mainDrawingTools = createDrawingTools({
    getTileWidth: mainGrid.getTileWidth,
    getTileHeight: mainGrid.getTileHeight,
    isCellActive: mainGrid.isCellActive,
    setCellActive: mainGrid.setCellActive,
  });
  mainGrid.setDrawingTools(mainDrawingTools);
  handleGuideChange = () => mainGrid.generateGrid();

  // ── SCRAP grid manager ────────────────────────────────────────────────────
  // Scrap uses its own tile size inputs (we share the same inputs for simplicity)
  const scrapGrid = createGridManager({
    gridDiv: scrapGridDiv,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    gridScaleInput: makeGridScaleSelect(),
    guideState,
    toolState,
    clipboard,
    onPatternChange: () => { if (isScrapActive) updateOutput(); },
  });

  const scrapDrawingTools = createDrawingTools({
    getTileWidth: scrapGrid.getTileWidth,
    getTileHeight: scrapGrid.getTileHeight,
    isCellActive: scrapGrid.isCellActive,
    setCellActive: scrapGrid.setCellActive,
  });
  scrapGrid.setDrawingTools(scrapDrawingTools);

  // Helper — active grid
  const activeGrid = () => (isScrapActive ? scrapGrid : mainGrid);

  // ── History managers ──────────────────────────────────────────────────────
  const mainHistory = createHistoryManager();
  const scrapHistory = createHistoryManager();
  let isApplyingHistory = false;

  const updateHistoryButtons = () => {
    undoBtn.disabled = !mainHistory.canUndo();
    redoBtn.disabled = !mainHistory.canRedo();
    scrapUndoBtn.disabled = !scrapHistory.canUndo();
    scrapRedoBtn.disabled = !scrapHistory.canRedo();
  };

  // ── Scale + output state ─────────────────────────────────────────────────
  // Scale select drives the pattern scale (encoded scale exponent 0-7)
  const scaleExponent = () => parseInt(scaleSelect.value);

  // ── Preview renderer ──────────────────────────────────────────────────────
  const renderPreview = createPreviewRenderer({
    canvas: previewCanvas,
    context: previewCtx,
    primaryColorInput: previewPrimaryColor,
    secondaryColorInput: previewSecondaryColor,
  });

  // ── Output update ─────────────────────────────────────────────────────────
  let updateOutput = () => {};
  updateOutput = () => {
    const grid = activeGrid();
    const pattern = grid.getCurrentPattern();
    const scale = scaleExponent();
    let base64: string;
    try {
      base64 = generatePatternBase64(pattern, grid.getTileWidth(), grid.getTileHeight(), scale);
    } catch {
      return;
    }

    const primary = previewPrimaryColor.value;
    const secondary = previewSecondaryColor.value;

    renderPreview(base64, isScrapActive);

    // Update URL hash from MAIN canvas only
    if (!isScrapActive) {
      const params = new URLSearchParams({
        primary: primary.replace("#", ""),
        secondary: secondary.replace("#", ""),
      });
      window.history.replaceState(null, "", `#${base64}?${params}`);
      if (!isApplyingHistory) mainHistory.record(base64);
    } else {
      if (!isApplyingHistory) scrapHistory.record(base64);
    }

    updateHistoryButtons();
  };

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const applyHistoryState = (base64: string, grid: typeof mainGrid) => {
    let decoded;
    try { decoded = decodePatternBase64(base64); } catch { return; }
    const { pattern, tileWidth, tileHeight, scale } = decoded;
    tileWidthInput.value = tileWidth.toString();
    tileWidthValue.value = tileWidthInput.value;
    tileHeightInput.value = tileHeight.toString();
    tileHeightValue.value = tileHeightInput.value;
    // Update scale select
    scaleSelect.value = scale.toString();
    isApplyingHistory = true;
    grid.generateGrid(pattern);
    isApplyingHistory = false;
  };

  const handleUndo = () => {
    if (isScrapActive) {
      const s = scrapHistory.undo();
      if (s) applyHistoryState(s, scrapGrid);
    } else {
      const s = mainHistory.undo();
      if (s) applyHistoryState(s, mainGrid);
    }
  };
  const handleRedo = () => {
    if (isScrapActive) {
      const s = scrapHistory.redo();
      if (s) applyHistoryState(s, scrapGrid);
    } else {
      const s = mainHistory.redo();
      if (s) applyHistoryState(s, mainGrid);
    }
  };

  undoBtn.addEventListener("click", handleUndo);
  redoBtn.addEventListener("click", handleRedo);
  scrapUndoBtn.addEventListener("click", handleUndo);
  scrapRedoBtn.addEventListener("click", handleRedo);

  // ── Canvas size steppers ──────────────────────────────────────────────────
  const clampW = (v: number) => Math.max(2, Math.min(129, v));
  const clampH = (v: number) => Math.max(2, Math.min(63, v));

  tileWidthUpBtn.addEventListener("click", () => {
    const v = clampW(parseInt(tileWidthInput.value) + 1);
    tileWidthInput.value = String(v);
    tileWidthValue.value = String(v);
    activeGrid().generateGrid();
  });
  tileWidthDownBtn.addEventListener("click", () => {
    const v = clampW(parseInt(tileWidthInput.value) - 1);
    tileWidthInput.value = String(v);
    tileWidthValue.value = String(v);
    activeGrid().generateGrid();
  });
  tileHeightUpBtn.addEventListener("click", () => {
    const v = clampH(parseInt(tileHeightInput.value) + 1);
    tileHeightInput.value = String(v);
    tileHeightValue.value = String(v);
    activeGrid().generateGrid();
  });
  tileHeightDownBtn.addEventListener("click", () => {
    const v = clampH(parseInt(tileHeightInput.value) - 1);
    tileHeightInput.value = String(v);
    tileHeightValue.value = String(v);
    activeGrid().generateGrid();
  });

  // Width/height direct input (on change / enter)
  tileWidthValue.addEventListener("change", () => {
    const v = clampW(parseInt(tileWidthValue.value) || 2);
    tileWidthValue.value = String(v);
    tileWidthInput.value = String(v);
    activeGrid().generateGrid();
  });
  tileHeightValue.addEventListener("change", () => {
    const v = clampH(parseInt(tileHeightValue.value) || 2);
    tileHeightValue.value = String(v);
    tileHeightInput.value = String(v);
    activeGrid().generateGrid();
  });

  // ── Scale select ──────────────────────────────────────────────────────────
  scaleSelect.addEventListener("change", () => updateOutput());

  // ── Invert / Clear ───────────────────────────────────────────────────────
  invertBtn.addEventListener("click", () => activeGrid().invertGrid());
  clearBtn.addEventListener("click", () => activeGrid().clearGrid());

  // ── Shift / Rotate / Flip buttons ─────────────────────────────────────────
  shiftUpBtn.addEventListener("click", () => activeGrid().shiftDir(0, -1));
  shiftDownBtn.addEventListener("click", () => activeGrid().shiftDir(0, 1));
  shiftLeftBtn.addEventListener("click", () => activeGrid().shiftDir(-1, 0));
  shiftRightBtn.addEventListener("click", () => activeGrid().shiftDir(1, 0));
  rotateLeftBtn.addEventListener("click", () => activeGrid().rotateDir("left"));
  rotateRightBtn.addEventListener("click", () => activeGrid().rotateDir("right"));
  flipHBtn.addEventListener("click", () => activeGrid().flipDir("h"));
  flipVBtn.addEventListener("click", () => activeGrid().flipDir("v"));
  deselectBtn.addEventListener("click", () => {
    activeGrid().clearSelection();
    toolState.restoreTool();
  });

  // Enable/disable transform buttons based on selection
  const updateTransformButtons = () => {
    const hasSel = activeGrid().hasSelection();
    [shiftUpBtn, shiftDownBtn, shiftLeftBtn, shiftRightBtn, rotateLeftBtn, rotateRightBtn, flipHBtn, flipVBtn, deselectBtn]
      .forEach((btn) => (btn.disabled = !hasSel));
  };
  // Poll selection state (simple approach — could be event-driven)
  setInterval(updateTransformButtons, 200);

  // ── Cut / Copy / Paste ─────────────────────────────────────────────────────
  let prePasteTool: import("./app/toolState.js").ToolKind | null = null;
  cutBtn.addEventListener("click", () => {
    activeGrid().cutSelection(clipboard);
  });
  copyBtn.addEventListener("click", () => {
    activeGrid().copySelection(clipboard);
  });
  pasteBtn.addEventListener("click", () => {
    if (clipboard.hasContent()) {
      prePasteTool = toolState.getCurrentTool();
      toolState.selectTool("paste");
    }
  });

  // When paste tool is active and user clicks on grid, paste happens
  // This is handled via onclick in gridManager by calling paste() from app
  // We override the paste behavior by listening after tool change
  toolState.subscribeToToolChanges((tool) => {
    if (tool === "paste") {
      // Override cell onclick for paste: handled in gridManager via cell click,
      // but gridManager needs clipboard reference. We wire it here:
      const grid = activeGrid();
      const gridEl = isScrapActive ? scrapGridDiv : gridDiv;

      const onGridClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains("cell")) return;
        const x = parseInt(target.dataset.x ?? "0");
        const y = parseInt(target.dataset.y ?? "0");
        grid.paste(x, y, clipboard);
        // Switch back to previous tool after single paste
        toolState.selectTool(prePasteTool || "selectArea");
        prePasteTool = null;
        gridEl.removeEventListener("click", onGridClick);
      };
      gridEl.addEventListener("click", onGridClick);
    }
  });

  // ── Export / Import tab toggle ────────────────────────────────────────────
  const switchExportImport = (mode: "export" | "import") => {
    exportPanel.hidden = mode !== "export";
    importPanel.hidden = mode !== "import";
    exportTabBtn.classList.toggle("selected", mode === "export");
    importTabBtn.classList.toggle("selected", mode === "import");
  };
  exportTabBtn.addEventListener("click", () => switchExportImport("export"));
  importTabBtn.addEventListener("click", () => switchExportImport("import"));
  switchExportImport("export");

  // ── Copy buttons ─────────────────────────────────────────────────────────
  const getOutputBase64 = () => {
    const pattern = mainGrid.getCurrentPattern();
    return generatePatternBase64(pattern, mainGrid.getTileWidth(), mainGrid.getTileHeight(), scaleExponent());
  };

  copyJsonBtn.addEventListener("click", () => copyText(getOutputBase64()));
  copyDiscordBtn.addEventListener("click", () => {
    const b64 = getOutputBase64();
    copyText(buildDiscordOutput(b64, previewPrimaryColor.value, previewSecondaryColor.value));
  });
  copyPreviewBtn.addEventListener("click", () => {
    const b64 = getOutputBase64();
    const link = buildPreviewLink(window.location.href, b64, previewPrimaryColor.value, previewSecondaryColor.value);
    copyText(link);
  });

  // ── Import ────────────────────────────────────────────────────────────────
  const loadFromBase64 = createPatternLoader({
    base64Input,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    scaleInput: { value: "0", addEventListener: () => {} } as unknown as HTMLInputElement,
    scaleValue: { textContent: "" } as unknown as HTMLSpanElement,
    onPatternLoaded: (pattern) => {
      // Also update scale select from decoded
      const base64 = base64Input.value;
      try {
        const decoded = decodePatternBase64(base64);
        scaleSelect.value = decoded.scale.toString();
      } catch { /* ignore */ }
      mainGrid.generateGrid(pattern);
    },
  });
  loadBtn.addEventListener("click", loadFromBase64);

  // ── Colors ───────────────────────────────────────────────────────────────
  const colorPresetControls = initColorPresetControls({
    container: colorPresetContainer,
    primaryColorInput: previewPrimaryColor,
    secondaryColorInput: previewSecondaryColor,
    selectedLabel: selectedPresetLabel,
    initialColors: null,
    onChange: () => updateOutput(),
  });

  swapColorsBtn.addEventListener("click", () => {
    const p = previewPrimaryColor.value;
    previewPrimaryColor.value = previewSecondaryColor.value;
    previewSecondaryColor.value = p;
    colorPresetControls.setCustomSelection();
    updateOutput();
  });

  previewPrimaryColor.addEventListener("input", () => {
    colorPresetControls.setCustomSelection();
    updateOutput();
  });
  previewSecondaryColor.addEventListener("input", () => {
    colorPresetControls.setCustomSelection();
    updateOutput();
  });

  // ── Preview panel collapse ────────────────────────────────────────────────
  hidePreviewBtn.addEventListener("click", () => {
    previewPanel.classList.add("collapsed");
    showPreviewBtn.hidden = false;
  });
  showPreviewBtn.addEventListener("click", () => {
    previewPanel.classList.remove("collapsed");
    showPreviewBtn.hidden = true;
  });
  showPreviewBtn.hidden = true;

  // Float / dock preview
  let floatingPtr: number | null = null;
  let fStartX = 0, fStartY = 0, fLeft = 0, fTop = 0;

  floatPreviewBtn.addEventListener("click", () => {
    previewPanel.classList.add("floating");
    document.querySelector(".editor-shell")?.classList.add("preview-floating");
    dockPreviewBtn.hidden = false;
    floatPreviewBtn.hidden = true;
    
    // Also collapse sidebar so canvas gets full width
    previewPanel.classList.add("collapsed");
    showPreviewBtn.hidden = false;
  });
  dockPreviewBtn.addEventListener("click", () => {
    previewPanel.classList.remove("floating");
    document.querySelector(".editor-shell")?.classList.remove("preview-floating");
    previewPanel.style.left = "";
    previewPanel.style.top = "";
    previewPanel.style.width = "";
    previewPanel.style.height = "";
    dockPreviewBtn.hidden = true;
    floatPreviewBtn.hidden = false;
    
    // Expand sidebar again
    previewPanel.classList.remove("collapsed");
    showPreviewBtn.hidden = true;
  });
  dockPreviewBtn.hidden = true;

  previewHeader.addEventListener("pointerdown", (e) => {
    if (!previewPanel.classList.contains("floating")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    floatingPtr = e.pointerId;
    const r = previewPanel.getBoundingClientRect();
    fStartX = e.clientX; fStartY = e.clientY;
    fLeft = r.left; fTop = r.top;
    previewHeader.setPointerCapture(e.pointerId);
  });
  previewHeader.addEventListener("pointermove", (e) => {
    if (floatingPtr !== e.pointerId) return;
    const maxL = window.innerWidth - previewPanel.offsetWidth - 8;
    const maxT = window.innerHeight - previewPanel.offsetHeight - 8;
    previewPanel.style.left = `${Math.max(8, Math.min(maxL, fLeft + e.clientX - fStartX))}px`;
    previewPanel.style.top = `${Math.max(8, Math.min(maxT, fTop + e.clientY - fStartY))}px`;
  });
  ["pointerup", "pointercancel"].forEach((ev) =>
    previewHeader.addEventListener(ev, (e) => {
      if (floatingPtr !== (e as PointerEvent).pointerId) return;
      floatingPtr = null;
      previewHeader.releasePointerCapture((e as PointerEvent).pointerId);
    })
  );

  // ── Workspace (zoom/pan) controls ─────────────────────────────────────────
  initWorkspaceControls({
    workspace: document.getElementById("canvasWorkspace") as HTMLElement,
    viewport: document.getElementById("gridViewport") as HTMLElement,
    zoomInButton: zoomInBtn,
    zoomOutButton: zoomOutBtn,
    resetButton: resetViewBtn,
    zoomValue: zoomValueEl,
  });

  // ── Pane resize ────────────────────────────────────────────────────────────
  initPaneResizeControls({
    shell: document.querySelector<HTMLElement>(".editor-shell")!,
    workspaceSplit: document.querySelector<HTMLElement>(".workspace-split")!,
    toolbarHandle: document.getElementById("toolbarResizeHandle") as HTMLElement,
    previewHandle: document.getElementById("previewResizeHandle") as HTMLElement,
  });

  // ── Image import overlay ──────────────────────────────────────────────────
  initImageImportOverlay({
    onApply: (pattern, size) => {
      tileWidthInput.value = size.width.toString();
      tileHeightInput.value = size.height.toString();
      tileWidthValue.value = tileWidthInput.value;
      tileHeightValue.value = tileHeightInput.value;
      mainGrid.generateGrid(pattern);
    },
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  setupHistoryShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDeselect: () => {
      activeGrid().clearSelection();
      toolState.restoreTool();
    },
    onCopy: () => activeGrid().copySelection(clipboard),
    onCut: () => activeGrid().cutSelection(clipboard),
    onPaste: () => {
      if (clipboard.hasContent()) {
        prePasteTool = toolState.getCurrentTool();
        toolState.selectTool("paste");
      }
    },
  });

  // ── Submission modal ──────────────────────────────────────────────────────
  const submissionModal = initSubmissionModal({
    getBase64: getOutputBase64,
    getPrimaryColor: () => previewPrimaryColor.value,
    getSecondaryColor: () => previewSecondaryColor.value,
    getPatternUrl: () => {
      const b64 = getOutputBase64();
      return buildPreviewLink(window.location.href, b64, previewPrimaryColor.value, previewSecondaryColor.value);
    }
  });
  submitPatternBtn.addEventListener("click", () => submissionModal.open());

  // ── URL hash load + initial state ─────────────────────────────────────────
  const normalizeHex = (v: string | null) => {
    if (!v) return null;
    const c = v.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
    return `#${c.toLowerCase()}`;
  };

  const hashValue = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";

  let initialColors: { primary: string; secondary: string } | null = null;
  if (hashValue) {
    const [patternPart, queryPart] = hashValue.split("?");
    if (patternPart) {
      base64Input.value = patternPart;
      setTimeout(loadFromBase64, 0);
    }
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const primary = normalizeHex(params.get("primary")) ?? normalizeHex(params.get("p"));
      const secondary = normalizeHex(params.get("secondary")) ?? normalizeHex(params.get("s"));
      if (primary || secondary) {
        initialColors = {
          primary: primary ?? previewPrimaryColor.value,
          secondary: secondary ?? previewSecondaryColor.value,
        };
      }
    }
  }

  // Re-init color presets with initialColors
  initColorPresetControls({
    container: colorPresetContainer,
    primaryColorInput: previewPrimaryColor,
    secondaryColorInput: previewSecondaryColor,
    selectedLabel: selectedPresetLabel,
    initialColors,
    onChange: () => updateOutput(),
  });

  // ── Initial grid + scrap grid ─────────────────────────────────────────────
  mainGrid.generateGrid();
  scrapGrid.generateGrid();
  switchCanvas(false);
  updateTransformButtons();
});
