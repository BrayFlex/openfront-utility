import { createClipboardManager } from "./app/clipboard.js";
import { initColorPresetControls } from "./app/colorPresets.js";
import { copyText } from "./app/copyText.js";
import { createDrawingTools } from "./app/drawingTools.js";
import { buildDevStorageOutput, buildPreviewLink, } from "./app/exportOutputs.js";
import { setupGridGuides } from "./app/gridGuides.js";
import { createGridManager } from "./app/gridManager.js";
import { setupHistoryShortcuts } from "./app/historyShortcuts.js";
import { initImageImportOverlay } from "./app/imageImportOverlay.js";
import { decodePatternBase64, generatePatternBase64, } from "./app/patternEncoding.js";
import { createPatternLoader } from "./app/patternLoader.js";
import { initPaneResizeControls } from "./app/paneResizeControls.js";
import { createPreviewRenderer } from "./app/previewRenderer.js";
import { initSubmissionModal } from "./app/submissionModal.js";
import { createToolState } from "./app/toolState.js";
import { createHistoryManager } from "./app/undoRedo.js";
import { initWorkspaceControls } from "./app/workspaceControls.js";
import { initThemeToggle } from "./app/themeToggle.js";
document.addEventListener("DOMContentLoaded", () => {
    var _a, _b;
    const themeToggleEl = document.getElementById("themeToggle");
    if (themeToggleEl)
        initThemeToggle(themeToggleEl);
    // ── Element references ───────────────────────────────────────────────────
    const gridDiv = document.getElementById("grid");
    const scrapGridDiv = document.getElementById("scrapGrid");
    // Tool strip
    const toolButtons = document.querySelectorAll("[data-tool]");
    const sizeSlider = document.getElementById("toolSizeSlider");
    const sizeOutput = document.getElementById("toolSizeOutput");
    const toolSizeBtn = document.getElementById("toolSizeBtn");
    const sizePopover = document.getElementById("sizePopover");
    const toolSizeBtnValue = document.getElementById("toolSizeBtnValue");
    const syncSizeDisplay = () => {
        if (toolSizeBtnValue && sizeSlider)
            toolSizeBtnValue.textContent = sizeSlider.value;
    };
    if (toolSizeBtn && sizePopover) {
        if (sizeSlider)
            sizeSlider.addEventListener("input", syncSizeDisplay);
        syncSizeDisplay();
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
            if (!sizePopover.contains(e.target) && e.target !== toolSizeBtn) {
                sizePopover.hidden = true;
            }
        });
    }
    const sizeGroup = document.getElementById("toolSizeGroup");
    // Undo / Redo
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    const scrapUndoBtn = document.getElementById("scrapUndoBtn");
    const scrapRedoBtn = document.getElementById("scrapRedoBtn");
    // Edit actions
    const cutBtn = document.getElementById("cutBtn");
    const copyBtn = document.getElementById("copyBtn");
    const pasteBtn = document.getElementById("pasteBtn");
    // Transformations
    const shiftUpBtn = document.getElementById("shiftUpBtn");
    const shiftDownBtn = document.getElementById("shiftDownBtn");
    const shiftLeftBtn = document.getElementById("shiftLeftBtn");
    const shiftRightBtn = document.getElementById("shiftRightBtn");
    const flipHBtn = document.getElementById("flipHBtn");
    const flipVBtn = document.getElementById("flipVBtn");
    const rotateLeftBtn = document.getElementById("rotateLeftBtn");
    const rotateRightBtn = document.getElementById("rotateRightBtn");
    const deselectBtn = document.getElementById("deselectBtn");
    // Canvas controls
    const tileWidthInput = document.getElementById("tileWidth");
    const tileWidthValue = document.getElementById("tileWidthValue");
    const tileWidthUpBtn = document.getElementById("tileWidthUp");
    const tileWidthDownBtn = document.getElementById("tileWidthDown");
    const tileHeightInput = document.getElementById("tileHeight");
    const tileHeightValue = document.getElementById("tileHeightValue");
    const tileHeightUpBtn = document.getElementById("tileHeightUp");
    const tileHeightDownBtn = document.getElementById("tileHeightDown");
    const scaleSelect = document.getElementById("scaleSelect");
    const invertBtn = document.getElementById("invertBtn");
    const clearBtn = document.getElementById("clearBtn");
    // Canvas tab switcher
    const canvasTabMain = document.getElementById("canvasTabMain");
    const canvasTabScrap = document.getElementById("canvasTabScrap");
    const mainGridWrap = document.getElementById("mainGridWrap");
    const scrapGridWrap = document.getElementById("scrapGridWrap");
    // Import
    const base64Input = document.getElementById("base64Input");
    const loadBtn = document.getElementById("loadBtn");
    // Export / Import toggle
    const exportTabBtn = document.getElementById("exportTabBtn");
    const importTabBtn = document.getElementById("importTabBtn");
    const exportPanel = document.getElementById("exportPanel");
    const importPanel = document.getElementById("importPanel");
    // Copy buttons
    const copyJsonBtn = document.getElementById("copyJsonBtn");
    const copyDevStorageBtn = document.getElementById("copyDevStorageBtn");
    const copyPreviewBtn = document.getElementById("copyPreviewBtn");
    // Preview panel
    const previewCanvas = document.getElementById("preview");
    const previewPrimaryColor = document.getElementById("previewPrimaryColor");
    const previewSecondaryColor = document.getElementById("previewSecondaryColor");
    const swapColorsBtn = document.getElementById("swapColorsBtn");
    const colorPresetContainer = document.getElementById("colorPresetContainer");
    const selectedPresetLabel = document.getElementById("selectedPresetLabel");
    const hidePreviewBtn = document.getElementById("hidePreviewBtn");
    const showPreviewBtn = document.getElementById("showPreviewBtn");
    const floatPreviewBtn = document.getElementById("floatPreviewBtn");
    const dockPreviewBtn = document.getElementById("dockPreviewBtn");
    const previewPanel = document.querySelector(".preview-panel");
    const previewHeader = document.querySelector(".preview-header");
    const previewZoomInBtn = document.getElementById("previewZoomInBtn");
    const previewZoomOutBtn = document.getElementById("previewZoomOutBtn");
    const previewZoomValue = document.getElementById("previewZoomValue");
    const copyColorsBtn = document.getElementById("copyColorsBtn");
    const previewCanvasWrap = document.getElementById("previewCanvasWrap");
    // Submission
    const submitPatternBtn = document.getElementById("submitPatternBtn");
    // Workspace zoom
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const resetViewBtn = document.getElementById("resetViewBtn");
    const zoomValueEl = document.getElementById("zoomValue");
    const toolbox = document.getElementById("toolbox");
    if (!colorPresetContainer)
        throw new Error("Missing #colorPresetContainer");
    const previewCtx = previewCanvas.getContext("2d");
    if (!previewCtx)
        throw new Error("2D context not supported");
    // ── Clipboard ─────────────────────────────────────────────────────────────
    const clipboard = createClipboardManager();
    // ── Canvas switcher state ─────────────────────────────────────────────────
    let isScrapActive = false;
    const switchCanvas = (scrap) => {
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
    // Sync size display button when tool changes (restores remembered size)
    toolState.subscribeToToolChanges(() => syncSizeDisplay());
    const shapeTypeSelect = document.getElementById("shapeType");
    if (shapeTypeSelect) {
        shapeTypeSelect.addEventListener("change", () => {
            toolState.selectTool("shape");
        });
    }
    // ── Guide state ───────────────────────────────────────────────────────────
    let handleGuideChange = () => { };
    const guideState = setupGridGuides(toolbox, () => handleGuideChange());
    // ── MAIN grid manager ─────────────────────────────────────────────────────
    const mainGrid = createGridManager({
        gridDiv,
        tileWidthInput,
        tileHeightInput,
        tileWidthValue,
        tileHeightValue,
        guideState,
        toolState,
        clipboard,
        onPatternChange: () => { if (!isScrapActive)
            updateOutput(); },
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
        guideState,
        toolState,
        clipboard,
        onPatternChange: () => { if (isScrapActive)
            updateOutput(); },
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
    // ── Preview zoom ──────────────────────────────────────────────────────────
    let previewZoom = 1;
    const PREVIEW_ZOOM_MIN = 0.5;
    const PREVIEW_ZOOM_MAX = 4;
    const PREVIEW_ZOOM_STEP = 0.5;
    const applyPreviewZoom = () => {
        previewCanvas.style.transform = `scale(${previewZoom})`;
        previewCanvas.style.transformOrigin = "center";
        previewZoomValue.textContent = `${Math.round(previewZoom * 100)}%`;
        if (previewCanvasWrap) {
            previewCanvasWrap.style.background = previewPrimaryColor.value;
        }
    };
    previewZoomInBtn.addEventListener("click", () => {
        previewZoom = Math.min(PREVIEW_ZOOM_MAX, previewZoom + PREVIEW_ZOOM_STEP);
        applyPreviewZoom();
    });
    previewZoomOutBtn.addEventListener("click", () => {
        previewZoom = Math.max(PREVIEW_ZOOM_MIN, previewZoom - PREVIEW_ZOOM_STEP);
        applyPreviewZoom();
    });
    // ── Output update ─────────────────────────────────────────────────────────
    let updateOutput = () => { };
    updateOutput = () => {
        const grid = activeGrid();
        const pattern = grid.getCurrentPattern();
        const scale = scaleExponent();
        let base64;
        try {
            base64 = generatePatternBase64(pattern, grid.getTileWidth(), grid.getTileHeight(), scale);
        }
        catch (_a) {
            return;
        }
        const primary = previewPrimaryColor.value;
        const secondary = previewSecondaryColor.value;
        renderPreview(base64, isScrapActive);
        if (previewCanvasWrap) {
            previewCanvasWrap.style.background = primary;
        }
        // Update URL hash from MAIN canvas only
        if (!isScrapActive) {
            const params = new URLSearchParams({
                primary: primary.replace("#", ""),
                secondary: secondary.replace("#", ""),
            });
            window.history.replaceState(null, "", `#${base64}?${params}`);
            if (!isApplyingHistory)
                mainHistory.record(base64);
        }
        else {
            if (!isApplyingHistory)
                scrapHistory.record(base64);
        }
        updateHistoryButtons();
    };
    // ── Undo / Redo ───────────────────────────────────────────────────────────
    const applyHistoryState = (base64, grid) => {
        let decoded;
        try {
            decoded = decodePatternBase64(base64);
        }
        catch (_a) {
            return;
        }
        const { pattern, tileWidth, tileHeight, scale } = decoded;
        tileWidthInput.value = tileWidth.toString();
        tileWidthValue.value = tileWidthInput.value;
        tileHeightInput.value = tileHeight.toString();
        tileHeightValue.value = tileHeightInput.value;
        // Update scale select
        scaleSelect.value = scale.toString();
        // Clear any active selection so it doesn't mask the restored pattern
        grid.clearSelection();
        isApplyingHistory = true;
        grid.generateGrid(pattern);
        isApplyingHistory = false;
    };
    const handleUndo = () => {
        if (isScrapActive) {
            const s = scrapHistory.undo();
            if (s)
                applyHistoryState(s, scrapGrid);
        }
        else {
            const s = mainHistory.undo();
            if (s)
                applyHistoryState(s, mainGrid);
        }
    };
    const handleRedo = () => {
        if (isScrapActive) {
            const s = scrapHistory.redo();
            if (s)
                applyHistoryState(s, scrapGrid);
        }
        else {
            const s = mainHistory.redo();
            if (s)
                applyHistoryState(s, mainGrid);
        }
    };
    undoBtn.addEventListener("click", handleUndo);
    redoBtn.addEventListener("click", handleRedo);
    scrapUndoBtn.addEventListener("click", handleUndo);
    scrapRedoBtn.addEventListener("click", handleRedo);
    // ── Canvas size steppers ──────────────────────────────────────────────────
    const clampW = (v) => Math.max(2, Math.min(128, v));
    const clampH = (v) => Math.max(2, Math.min(64, v));
    const makeStepper = (btnUp, btnDown, input, valueLabel, clamp) => {
        const update = (delta) => {
            const v = clamp((parseInt(input.value) || 2) + delta);
            input.value = String(v);
            valueLabel.value = String(v);
            activeGrid().generateGrid();
        };
        btnUp.addEventListener("click", () => update(1));
        btnDown.addEventListener("click", () => update(-1));
        valueLabel.addEventListener("change", () => update(0));
    };
    makeStepper(tileWidthUpBtn, tileWidthDownBtn, tileWidthInput, tileWidthValue, clampW);
    makeStepper(tileHeightUpBtn, tileHeightDownBtn, tileHeightInput, tileHeightValue, clampH);
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
    let prePasteTool = null;
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
            const onGridClick = (e) => {
                var _a, _b;
                const target = e.target;
                if (!target.classList.contains("cell"))
                    return;
                const x = parseInt((_a = target.dataset.x) !== null && _a !== void 0 ? _a : "0");
                const y = parseInt((_b = target.dataset.y) !== null && _b !== void 0 ? _b : "0");
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
    const switchExportImport = (mode) => {
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
    copyDevStorageBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        copyText(buildDevStorageOutput(b64, previewPrimaryColor.value, previewSecondaryColor.value));
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
        onPatternLoaded: (pattern) => {
            // Also update scale select from decoded
            const base64 = base64Input.value;
            try {
                const decoded = decodePatternBase64(base64);
                scaleSelect.value = decoded.scale.toString();
            }
            catch ( /* ignore */_a) { /* ignore */ }
            mainGrid.generateGrid(pattern);
        },
    });
    loadBtn.addEventListener("click", loadFromBase64);
    // ── Colors ───────────────────────────────────────────────────────────────
    // (Color presets initialization is deferred until URL hash parsing is complete)
    // ── Preview panel collapse ────────────────────────────────────────────────
    const collapsePreview = () => {
        var _a;
        previewPanel.classList.add("collapsed");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.add("preview-collapsed");
        showPreviewBtn.hidden = false;
        document.getElementById("previewResizeHandle").hidden = true;
    };
    const expandPreview = () => {
        var _a;
        previewPanel.classList.remove("collapsed");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.remove("preview-collapsed");
        showPreviewBtn.hidden = true;
        document.getElementById("previewResizeHandle").hidden = false;
    };
    hidePreviewBtn.addEventListener("click", collapsePreview);
    showPreviewBtn.addEventListener("click", expandPreview);
    showPreviewBtn.hidden = true;
    // Float / dock preview
    let floatingPtr = null;
    let fStartX = 0, fStartY = 0, fLeft = 0, fTop = 0;
    const floatingResizeBtn = document.getElementById("floatingResizeBtn");
    // Persisted floating preview state
    const FLOAT_STATE_KEY = "floating-preview-state";
    let savedFloatState = null;
    const loadFloatState = () => {
        try {
            const raw = localStorage.getItem(FLOAT_STATE_KEY);
            if (raw)
                return JSON.parse(raw);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return null;
    };
    const saveFloatState = () => {
        const rect = previewPanel.getBoundingClientRect();
        // Enforce minimum constraints when saving
        const width = Math.max(MIN_WIDTH, Math.round(rect.width));
        const height = Math.max(MIN_HEIGHT, Math.round(rect.height));
        const state = {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width,
            height,
        };
        localStorage.setItem(FLOAT_STATE_KEY, JSON.stringify(state));
        savedFloatState = state;
    };
    const applyFloatState = (state) => {
        if (!state)
            return;
        // Enforce minimum size constraints
        const width = Math.max(MIN_WIDTH, state.width);
        const height = Math.max(MIN_HEIGHT, state.height);
        previewPanel.style.left = `${state.left}px`;
        previewPanel.style.top = `${state.top}px`;
        previewPanel.style.width = `${width}px`;
        previewPanel.style.height = `${height}px`;
        // Clear bottom/right since we're using explicit positioning
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
    };
    // Minimum size constraints
    const MIN_WIDTH = 260;
    const MIN_HEIGHT = 380;
    // No maximum - can resize freely
    const clampPosition = (left, top, width, height) => {
        const maxL = window.innerWidth - width - 8;
        const maxT = window.innerHeight - height - 8;
        return {
            left: Math.max(8, Math.min(maxL, left)),
            top: Math.max(8, Math.min(maxT, top)),
        };
    };
    floatPreviewBtn.addEventListener("click", () => {
        var _a;
        collapsePreview();
        previewPanel.classList.add("floating");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.add("preview-floating");
        dockPreviewBtn.hidden = false;
        floatPreviewBtn.hidden = true;
        hidePreviewBtn.hidden = true;
        showPreviewBtn.hidden = true;
        floatingResizeBtn.hidden = false;
        floatingResizeBtn.style.cursor = "nwse-resize";
        // Restore saved position/size or use defaults
        savedFloatState = loadFloatState();
        if (savedFloatState) {
            applyFloatState(savedFloatState);
        }
        else {
            // Default: bottom-right anchored with min width and min height
            previewPanel.style.left = "";
            previewPanel.style.top = "";
            previewPanel.style.width = `${MIN_WIDTH}px`;
            previewPanel.style.height = `${MIN_HEIGHT}px`;
        }
    });
    let rPtr = null;
    let rStartW = 0, rStartH = 0, rStartX = 0, rStartY = 0;
    let rStartL = 0, rStartT = 0;
    floatingResizeBtn.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        rPtr = ev.pointerId;
        floatingResizeBtn.setPointerCapture(ev.pointerId);
        rStartW = previewPanel.offsetWidth;
        rStartH = previewPanel.offsetHeight;
        rStartX = ev.clientX;
        rStartY = ev.clientY;
        // Get current position (works whether using left/top or bottom/right)
        const rect = previewPanel.getBoundingClientRect();
        rStartL = rect.left;
        rStartT = rect.top;
        // Switch to explicit left/top positioning for consistent resize behavior
        previewPanel.style.left = `${rStartL}px`;
        previewPanel.style.top = `${rStartT}px`;
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
    });
    floatingResizeBtn.addEventListener("pointermove", (ev) => {
        if (rPtr !== ev.pointerId)
            return;
        const dx = ev.clientX - rStartX;
        const dy = ev.clientY - rStartY;
        // Resize handle is at top-left (in header), so:
        // - Moving mouse left (negative dx) increases width, moves left edge left
        // - Moving mouse up (negative dy) increases height, moves top edge up
        // Both width and height can be resized freely with minimums
        const w = Math.max(MIN_WIDTH, rStartW - dx);
        const h = Math.max(MIN_HEIGHT, rStartH - dy);
        const dw = w - rStartW;
        const dh = h - rStartH;
        const newLeft = rStartL - dw;
        const newTop = rStartT - dh;
        const clamped = clampPosition(newLeft, newTop, w, h);
        previewPanel.style.left = `${clamped.left}px`;
        previewPanel.style.top = `${clamped.top}px`;
        previewPanel.style.width = `${w}px`;
        previewPanel.style.height = `${h}px`;
    });
    ["pointerup", "pointercancel"].forEach(evt => floatingResizeBtn.addEventListener(evt, (ev) => {
        if (rPtr !== ev.pointerId)
            return;
        rPtr = null;
        floatingResizeBtn.releasePointerCapture(ev.pointerId);
        saveFloatState();
    }));
    dockPreviewBtn.addEventListener("click", () => {
        var _a;
        expandPreview();
        previewPanel.classList.remove("floating");
        (_a = document.querySelector(".editor-shell")) === null || _a === void 0 ? void 0 : _a.classList.remove("preview-floating");
        previewPanel.style.left = "";
        previewPanel.style.top = "";
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
        previewPanel.style.width = "";
        previewPanel.style.height = "";
        dockPreviewBtn.hidden = true;
        floatPreviewBtn.hidden = false;
        hidePreviewBtn.hidden = false;
        floatingResizeBtn.hidden = true;
    });
    dockPreviewBtn.hidden = true;
    previewHeader.addEventListener("pointerdown", (e) => {
        if (!previewPanel.classList.contains("floating"))
            return;
        // Use composedPath to check if the click originated from a button (including shadow DOM)
        const path = e.composedPath();
        if (path.some((el) => el instanceof HTMLButtonElement))
            return;
        e.preventDefault();
        floatingPtr = e.pointerId;
        const rect = previewPanel.getBoundingClientRect();
        fStartX = e.clientX;
        fStartY = e.clientY;
        fLeft = rect.left;
        fTop = rect.top;
        previewHeader.setPointerCapture(e.pointerId);
    });
    previewHeader.addEventListener("pointermove", (e) => {
        if (floatingPtr !== e.pointerId)
            return;
        const newLeft = fLeft + e.clientX - fStartX;
        const newTop = fTop + e.clientY - fStartY;
        const clamped = clampPosition(newLeft, newTop, previewPanel.offsetWidth, previewPanel.offsetHeight);
        previewPanel.style.left = `${clamped.left}px`;
        previewPanel.style.top = `${clamped.top}px`;
        // Ensure we're using explicit positioning
        previewPanel.style.bottom = "";
        previewPanel.style.right = "";
    });
    ["pointerup", "pointercancel"].forEach(ev => previewHeader.addEventListener(ev, (e) => {
        if (floatingPtr !== e.pointerId)
            return;
        floatingPtr = null;
        previewHeader.releasePointerCapture(e.pointerId);
        saveFloatState();
    }));
    // ── Workspace (zoom/pan) controls ─────────────────────────────────────────
    initWorkspaceControls({
        workspace: document.getElementById("canvasWorkspace"),
        viewport: document.getElementById("gridViewport"),
        zoomInButton: zoomInBtn,
        zoomOutButton: zoomOutBtn,
        resetButton: resetViewBtn,
        zoomValue: zoomValueEl,
    });
    // ── Info Modal ────────────────────────────────────────────────────────────
    const infoModal = document.getElementById("infoModal");
    const infoModalBtn = document.getElementById("infoModalBtn");
    const closeInfoModalBtn = document.getElementById("closeInfoModalBtn");
    if (infoModal && infoModalBtn && closeInfoModalBtn) {
        infoModalBtn.addEventListener("click", () => infoModal.hidden = false);
        closeInfoModalBtn.addEventListener("click", () => infoModal.hidden = true);
        infoModal.addEventListener("click", (e) => {
            if (e.target === infoModal)
                infoModal.hidden = true;
        });
    }
    // ── Pane resize ────────────────────────────────────────────────────────────
    initPaneResizeControls({
        workspaceSplit: document.querySelector(".workspace-split"),
        previewHandle: document.getElementById("previewResizeHandle"),
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
        onClearSelection: () => {
            if (activeGrid().hasSelection()) {
                activeGrid().clearGrid();
            }
        },
        onInvert: () => activeGrid().invertGrid(),
        onInvertSelection: () => activeGrid().invertSelection(),
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
        getPrimaryColor: () => previewPrimaryColor.value,
        getSecondaryColor: () => previewSecondaryColor.value,
        getPatternUrl: () => {
            const b64 = getOutputBase64();
            return buildPreviewLink(window.location.href, b64, previewPrimaryColor.value, previewSecondaryColor.value);
        }
    });
    submitPatternBtn.addEventListener("click", () => submissionModal.open());
    // ── URL hash load + initial state ─────────────────────────────────────────
    const normalizeHex = (v) => {
        if (!v)
            return null;
        const c = v.trim().replace(/^#/, "");
        if (!/^[0-9a-fA-F]{6}$/.test(c))
            return null;
        return `#${c.toLowerCase()}`;
    };
    const hashValue = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
    let initialColors = null;
    if (hashValue) {
        const [patternPart, queryPart] = hashValue.split("?");
        if (patternPart) {
            base64Input.value = patternPart;
            setTimeout(loadFromBase64, 0);
        }
        if (queryPart) {
            const params = new URLSearchParams(queryPart);
            const primary = (_a = normalizeHex(params.get("primary"))) !== null && _a !== void 0 ? _a : normalizeHex(params.get("p"));
            const secondary = (_b = normalizeHex(params.get("secondary"))) !== null && _b !== void 0 ? _b : normalizeHex(params.get("s"));
            if (primary || secondary) {
                initialColors = {
                    primary: primary !== null && primary !== void 0 ? primary : previewPrimaryColor.value,
                    secondary: secondary !== null && secondary !== void 0 ? secondary : previewSecondaryColor.value,
                };
            }
        }
    }
    // Re-init color presets with initialColors
    const colorPresetControls = initColorPresetControls({
        container: colorPresetContainer,
        primaryColorInput: previewPrimaryColor,
        secondaryColorInput: previewSecondaryColor,
        selectedLabel: selectedPresetLabel,
        initialColors,
        onChange: () => updateOutput(),
    });
    swapColorsBtn.addEventListener("click", () => {
        const p = previewPrimaryColor.value;
        previewPrimaryColor.value = previewSecondaryColor.value;
        previewSecondaryColor.value = p;
        colorPresetControls.setCustomSelection();
        updateOutput();
    });
    copyColorsBtn.addEventListener("click", () => {
        const primary = previewPrimaryColor.value.replace("#", "");
        const secondary = previewSecondaryColor.value.replace("#", "");
        const presetName = colorPresetControls.getCurrentPreset();
        let text = `primary=${primary}&secondary=${secondary}`;
        if (presetName) {
            text += ` (${presetName})`;
        }
        copyText(text);
    });
    previewPrimaryColor.addEventListener("input", () => {
        colorPresetControls.setCustomSelection();
        updateOutput();
    });
    previewSecondaryColor.addEventListener("input", () => {
        colorPresetControls.setCustomSelection();
        updateOutput();
    });
    // ── Initial grid + scrap grid ─────────────────────────────────────────────
    mainGrid.generateGrid();
    scrapGrid.generateGrid();
    switchCanvas(false);
    updateTransformButtons();
});
