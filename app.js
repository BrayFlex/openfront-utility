import { createClipboardManager } from "./app/clipboard.js";
import { initColorPresetControls } from "./app/colorPresets.js";
import { copyText } from "./app/copyText.js";
import { createDrawingTools } from "./app/drawingTools.js";
import { buildDevStorageOutput, buildDiscordOutput, buildPreviewLink, } from "./app/exportOutputs.js";
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
document.addEventListener("DOMContentLoaded", () => {
    var _a, _b;
    // ── Element references ───────────────────────────────────────────────────
    const gridDiv = document.getElementById("grid");
    const scrapGridDiv = document.getElementById("scrapGrid");
    // Tool strip
    const toolButtons = document.querySelectorAll("[data-tool]");
    const sizeSlider = document.getElementById("toolSizeSlider");
    const sizeOutput = document.getElementById("toolSizeOutput");
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
    const copyDiscordBtn = document.getElementById("copyDiscordBtn");
    const copyPreviewBtn = document.getElementById("copyPreviewBtn");
    const copyConsoleBtn = document.getElementById("copyConsoleBtn");
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
    const shapeTypeSelect = document.getElementById("shapeType");
    const shapeIcon = document.getElementById("shapeIcon");
    if (shapeTypeSelect && shapeIcon) {
        shapeTypeSelect.addEventListener("change", () => {
            shapeIcon.textContent = shapeTypeSelect.value === "cube" ? "⬡" : "★";
        });
    }
    // ── Guide state ───────────────────────────────────────────────────────────
    let handleGuideChange = () => { };
    const guideState = setupGridGuides(toolbox, () => handleGuideChange());
    // ── Grid Scale (visual) ───────────────────────────────────────────────────
    // Visual zoom is handled by workspaceControls now, so internal scale factor is 1
    const makeGridScaleSelect = () => {
        return {
            get value() { return "1"; },
            addEventListener: (ev, fn) => { },
        };
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
        gridScaleInput: makeGridScaleSelect(),
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
    const clampW = (v) => Math.max(2, Math.min(129, v));
    const clampH = (v) => Math.max(2, Math.min(129, v));
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
    // ── Shift / Rotate buttons ────────────────────────────────────────────────
    shiftUpBtn.addEventListener("click", () => activeGrid().shiftDir(0, -1));
    shiftDownBtn.addEventListener("click", () => activeGrid().shiftDir(0, 1));
    shiftLeftBtn.addEventListener("click", () => activeGrid().shiftDir(-1, 0));
    shiftRightBtn.addEventListener("click", () => activeGrid().shiftDir(1, 0));
    rotateLeftBtn.addEventListener("click", () => activeGrid().rotateDir("left"));
    rotateRightBtn.addEventListener("click", () => activeGrid().rotateDir("right"));
    deselectBtn.addEventListener("click", () => {
        activeGrid().clearSelection();
        toolState.selectTool("pencil");
    });
    // Enable/disable transform buttons based on selection
    const updateTransformButtons = () => {
        const hasSel = activeGrid().hasSelection();
        [shiftUpBtn, shiftDownBtn, shiftLeftBtn, shiftRightBtn, rotateLeftBtn, rotateRightBtn, deselectBtn]
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
    copyDiscordBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        copyText(buildDiscordOutput(b64, previewPrimaryColor.value, previewSecondaryColor.value));
    });
    copyPreviewBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        const link = buildPreviewLink(window.location.href, b64, previewPrimaryColor.value, previewSecondaryColor.value);
        copyText(link);
    });
    copyConsoleBtn.addEventListener("click", () => {
        const b64 = getOutputBase64();
        copyText(buildDevStorageOutput(b64, previewPrimaryColor.value, previewSecondaryColor.value));
    });
    // ── Import ────────────────────────────────────────────────────────────────
    const loadFromBase64 = createPatternLoader({
        base64Input,
        tileWidthInput,
        tileHeightInput,
        tileWidthValue,
        tileHeightValue,
        scaleInput: { value: "0", addEventListener: () => { } },
        scaleValue: { textContent: "" },
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
    let floatingPtr = null;
    let fStartX = 0, fStartY = 0, fLeft = 0, fTop = 0;
    floatPreviewBtn.addEventListener("click", () => {
        previewPanel.classList.add("floating");
        dockPreviewBtn.hidden = false;
        floatPreviewBtn.hidden = true;
    });
    dockPreviewBtn.addEventListener("click", () => {
        previewPanel.classList.remove("floating");
        previewPanel.style.left = "";
        previewPanel.style.top = "";
        dockPreviewBtn.hidden = true;
        floatPreviewBtn.hidden = false;
    });
    dockPreviewBtn.hidden = true;
    previewHeader.addEventListener("pointerdown", (e) => {
        if (!previewPanel.classList.contains("floating"))
            return;
        if (e.target.closest("button"))
            return;
        e.preventDefault();
        floatingPtr = e.pointerId;
        const r = previewPanel.getBoundingClientRect();
        fStartX = e.clientX;
        fStartY = e.clientY;
        fLeft = r.left;
        fTop = r.top;
        previewHeader.setPointerCapture(e.pointerId);
    });
    previewHeader.addEventListener("pointermove", (e) => {
        if (floatingPtr !== e.pointerId)
            return;
        const maxL = window.innerWidth - previewPanel.offsetWidth - 8;
        const maxT = window.innerHeight - previewPanel.offsetHeight - 8;
        previewPanel.style.left = `${Math.max(8, Math.min(maxL, fLeft + e.clientX - fStartX))}px`;
        previewPanel.style.top = `${Math.max(8, Math.min(maxT, fTop + e.clientY - fStartY))}px`;
    });
    ["pointerup", "pointercancel"].forEach((ev) => previewHeader.addEventListener(ev, (e) => {
        if (floatingPtr !== e.pointerId)
            return;
        floatingPtr = null;
        previewHeader.releasePointerCapture(e.pointerId);
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
    // ── Pane resize ────────────────────────────────────────────────────────────
    initPaneResizeControls({
        shell: document.querySelector(".editor-shell"),
        workspaceSplit: document.querySelector(".workspace-split"),
        toolbarHandle: document.getElementById("toolbarResizeHandle"),
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
    const normalizeHex = (v) => {
        if (!v)
            return null;
        const c = v.trim().replace(/^#/, "");
        if (!/^[0-9a-fA-F]{6}$/.test(c))
            return null;
        return `#${c.toLowerCase()}`;
    };
    if (!window.location.hash) {
        const isEasterEgg = Math.random() < 0.25;
        const injectedHash = isEasterEgg
            ? "#AFlhAAAAAADg______8DAAAAAAA4sbvhzgBRIVFEBGBOZIaZA0SRRBFRgKuRK-4MAAAAAADg______8DAAAAAADgAHAAOAAiABGACCAIMAQIAgICi4GAQECgIBAQBBCCCAGEqsIooaqwaggirBoCCAmGAEJVoaJQVVg1JBhWDQICIYGAgCBAGiAI4APwAfgAAAAAAAAA?primary=fedd67&secondary=000000"
            : "#AAEiAAAAAAAAAAAAAAAAAAAAAIDD8YnweTiiD5FIYEIgEpkIRCKBCoFIpCIQeTwyPB6RjEAkEIgQKEQiApFAIEIgEYkIOAKfCIGIIyIAAAAAAAAAAAA?primary=ffffff&secondary=000000";
        window.history.replaceState(null, "", injectedHash);
    }
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
