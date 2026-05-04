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
import { initialPattern } from "./app/initialPattern.js";
import {
  decodePatternBase64,
  generatePatternBase64,
} from "./app/patternEncoding.js";
import { createPatternLoader } from "./app/patternLoader.js";
import { createPreviewRenderer } from "./app/previewRenderer.js";
import { createToolState } from "./app/toolState.js";
import { createHistoryManager } from "./app/undoRedo.js";

document.addEventListener("DOMContentLoaded", () => {
  const toolbox = document.getElementById("toolbox");
  const base64Input = document.getElementById(
    "base64Input"
  ) as HTMLInputElement;
  const toolPenBtn = document.getElementById("tool-pen") as HTMLButtonElement;
  const penSizeInput = document.getElementById(
    "pen-size"
  ) as HTMLInputElement;
  const toolLineBtn = document.getElementById("tool-line") as HTMLButtonElement;
  const toolFillBtn = document.getElementById("tool-fill") as HTMLButtonElement;
  const toolStarBtn = document.getElementById("tool-star") as HTMLButtonElement;
  const toolCircleBtn = document.getElementById(
    "tool-circle"
  ) as HTMLButtonElement;
  const toolSelectBtn = document.getElementById(
    "tool-select"
  ) as HTMLButtonElement;
  const starSizeInput = document.getElementById(
    "star-size"
  ) as HTMLInputElement;
  const circleSizeInput = document.getElementById(
    "circle-size"
  ) as HTMLInputElement;
  const circleFillInput = document.getElementById(
    "circle-fill"
  ) as HTMLInputElement;
  const loadBtn = document.getElementById("loadBtn") as HTMLButtonElement;
  const tileWidthInput = document.getElementById(
    "tileWidth"
  ) as HTMLInputElement;
  const tileWidthValue = document.getElementById(
    "tileWidth-value"
  ) as HTMLInputElement;
  const tileHeightInput = document.getElementById(
    "tileHeight"
  ) as HTMLInputElement;
  const tileHeightValue = document.getElementById(
    "tileHeight-value"
  ) as HTMLInputElement;
  const scaleInput = document.getElementById("scale") as HTMLInputElement;
  const scaleValue = document.getElementById("scale-value") as HTMLSpanElement;
  const gridScaleInput = document.getElementById(
    "gridScale"
  ) as HTMLSelectElement;
  const clearGridBtn = document.getElementById(
    "clearGridBtn"
  ) as HTMLButtonElement;
  const undoBtn = document.getElementById("undoBtn") as HTMLButtonElement;
  const redoBtn = document.getElementById("redoBtn") as HTMLButtonElement;
  const shiftUpBtn = document.getElementById("shiftUpBtn") as HTMLButtonElement;
  const shiftLeftBtn = document.getElementById(
    "shiftLeftBtn"
  ) as HTMLButtonElement;
  const shiftRightBtn = document.getElementById(
    "shiftRightBtn"
  ) as HTMLButtonElement;
  const shiftDownBtn = document.getElementById(
    "shiftDownBtn"
  ) as HTMLButtonElement;
  const rotateLeftBtn = document.getElementById(
    "rotateLeftBtn"
  ) as HTMLButtonElement;
  const rotateRightBtn = document.getElementById(
    "rotateRightBtn"
  ) as HTMLButtonElement;
  const gridDiv = document.getElementById("grid")!;
  const outputTextarea = document.getElementById(
    "output"
  ) as HTMLTextAreaElement;
  const discordOutputTextarea = document.getElementById(
    "discordOutput"
  ) as HTMLTextAreaElement;
  const previewLinkTextarea = document.getElementById(
    "previewLinkOutput"
  ) as HTMLTextAreaElement;
  const devStorageTextarea = document.getElementById(
    "devStorageOutput"
  ) as HTMLTextAreaElement;
  const copyOutputBtn = document.getElementById(
    "copyOutputBtn"
  ) as HTMLButtonElement;
  const copyDiscordBtn = document.getElementById(
    "copyDiscordBtn"
  ) as HTMLButtonElement;
  const copyPreviewLinkBtn = document.getElementById(
    "copyPreviewLinkBtn"
  ) as HTMLButtonElement;
  const copyDevStorageBtn = document.getElementById(
    "copyDevStorageBtn"
  ) as HTMLButtonElement;
  const previewCanvas = document.getElementById("preview") as HTMLCanvasElement;
  const previewPrimaryColorInput = document.getElementById(
    "previewPrimaryColor"
  ) as HTMLInputElement;
  const previewSecondaryColorInput = document.getElementById(
    "previewSecondaryColor"
  ) as HTMLInputElement;
  const swapColorsBtn = document.getElementById(
    "swapColorsBtn"
  ) as HTMLButtonElement;
  const colorPresetContainer = document.getElementById(
    "colorPresetContainer"
  ) as HTMLDivElement;
  const layoutTabsInput = document.getElementById(
    "layout-tabs"
  ) as HTMLInputElement | null;
  const viewPreviewInput = document.getElementById(
    "view-preview"
  ) as HTMLInputElement | null;
  const tabActionsInput = document.getElementById(
    "tab-actions"
  ) as HTMLInputElement;
  const tabToolsInput = document.getElementById(
    "tab-tools"
  ) as HTMLInputElement;
  const tabGridInput = document.getElementById(
    "tab-grid"
  ) as HTMLInputElement;
  const previewPanel = document.querySelector(
    ".preview-panel"
  ) as HTMLElement | null;

  if (!colorPresetContainer) {
    throw new Error("Missing color preset container");
  }

  const previewContext = previewCanvas.getContext("2d");
  if (!previewContext) throw new Error("2D context not supported");

  let handleGuideChange = () => {};
  const guideState = setupGridGuides(toolbox, () => handleGuideChange());

  const toolState = createToolState({
    toolPenBtn,
    toolLineBtn,
    toolFillBtn,
    toolStarBtn,
    toolCircleBtn,
    toolSelectBtn,
    penSizeInput,
    starSizeInput,
    circleSizeInput,
    circleFillInput,
  });

  let updateOutput = () => {};
  const gridManager = createGridManager({
    gridDiv,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    gridScaleInput,
    shiftUpBtn,
    shiftDownBtn,
    shiftLeftBtn,
    shiftRightBtn,
    invertBtn: document.getElementById("invertGridBtn") as HTMLButtonElement,
    rotateLeftBtn,
    rotateRightBtn,
    initialPattern,
    guideState,
    toolState,
    onPatternChange: () => updateOutput(),
  });
  const drawingTools = createDrawingTools({
    getTileWidth: gridManager.getTileWidth,
    getTileHeight: gridManager.getTileHeight,
    isCellActive: gridManager.isCellActive,
    setCellActive: gridManager.setCellActive,
  });
  gridManager.setDrawingTools(drawingTools);
  handleGuideChange = () => gridManager.generateGrid();

  const renderPreview = createPreviewRenderer({
    canvas: previewCanvas,
    context: previewContext,
    primaryColorInput: previewPrimaryColorInput,
    secondaryColorInput: previewSecondaryColorInput,
  });

  const historyManager = createHistoryManager();
  let isApplyingHistory = false;

  const updateHistoryButtons = () => {
    undoBtn.disabled = !historyManager.canUndo();
    redoBtn.disabled = !historyManager.canRedo();
  };

  const applyHistoryState = (base64: string) => {
    let decoded;
    try {
      decoded = decodePatternBase64(base64);
    } catch (error) {
      console.warn("Failed to decode history state", error);
      return;
    }
    const { pattern, tileWidth, tileHeight, scale } = decoded;
    tileWidthInput.value = tileWidth.toString();
    tileHeightInput.value = tileHeight.toString();
    tileWidthValue.value = tileWidthInput.value;
    tileHeightValue.value = tileHeightInput.value;
    scaleInput.value = scale.toString();
    scaleValue.textContent = String(1 << parseInt(scaleInput.value));
    isApplyingHistory = true;
    gridManager.generateGrid(pattern);
    isApplyingHistory = false;
  };

  updateOutput = () => {
    const pattern = gridManager.getCurrentPattern();
    const scale = parseInt(scaleInput.value);
    const base64 = generatePatternBase64(
      pattern,
      gridManager.getTileWidth(),
      gridManager.getTileHeight(),
      scale
    );
    outputTextarea.value = base64;
    discordOutputTextarea.value = buildDiscordOutput(
      base64,
      previewPrimaryColorInput.value,
      previewSecondaryColorInput.value
    );
    previewLinkTextarea.value = buildPreviewLink(
      window.location.href,
      base64,
      previewPrimaryColorInput.value,
      previewSecondaryColorInput.value
    );
    devStorageTextarea.value = buildDevStorageOutput(
      base64,
      previewPrimaryColorInput.value,
      previewSecondaryColorInput.value
    );
    renderPreview(base64);
    const params = new URLSearchParams({
      primary: previewPrimaryColorInput.value.replace("#", ""),
      secondary: previewSecondaryColorInput.value.replace("#", ""),
    });
    window.history.replaceState(null, "", `#${base64}?${params.toString()}`);
    if (!isApplyingHistory) {
      historyManager.record(base64);
    }
    updateHistoryButtons();
  };

  scaleInput.addEventListener("input", () => {
    scaleValue.textContent = String(1 << parseInt(scaleInput.value));
    updateOutput();
  });

  const loadFromBase64 = createPatternLoader({
    base64Input,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    scaleInput,
    scaleValue,
    onPatternLoaded: (pattern) => gridManager.generateGrid(pattern),
  });

  const normalizeHex = (value: string | null) => {
    if (!value) return null;
    const cleaned = value.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
    return `#${cleaned.toLowerCase()}`;
  };

  const hashValue = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  let initialColors: { primary: string; secondary: string } | null = null;
  let shouldFocusPreview = false;
  if (hashValue) {
    const [patternPart, queryPart] = hashValue.split("?");
    if (patternPart) {
      base64Input.value = patternPart;
      setTimeout(loadFromBase64, 0);
    }
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const primary =
        normalizeHex(params.get("primary")) ?? normalizeHex(params.get("p"));
      const secondary =
        normalizeHex(params.get("secondary")) ?? normalizeHex(params.get("s"));
      if (primary || secondary) {
        initialColors = {
          primary: primary ?? previewPrimaryColorInput.value,
          secondary: secondary ?? previewSecondaryColorInput.value,
        };
      }
      const previewFlag = params.get("preview");
      if (
        previewFlag !== null &&
        previewFlag !== "0" &&
        previewFlag !== "false"
      ) {
        shouldFocusPreview = true;
      }
    }
  }

  const colorPresetControls = initColorPresetControls({
    container: colorPresetContainer,
    primaryColorInput: previewPrimaryColorInput,
    secondaryColorInput: previewSecondaryColorInput,
    initialColors,
    onChange: () => updateOutput(),
  });

  initImageImportOverlay({
    onApply: (pattern, size) => {
      tileWidthInput.value = size.width.toString();
      tileHeightInput.value = size.height.toString();
      tileWidthValue.value = tileWidthInput.value;
      tileHeightValue.value = tileHeightInput.value;
      gridManager.generateGrid(pattern);
    },
  });

  function copyOutput() {
    copyText(outputTextarea.value);
  }

  function copyDiscordOutput() {
    copyText(discordOutputTextarea.value);
  }

  function copyPreviewLink() {
    const link = buildPreviewLink(
      window.location.href,
      outputTextarea.value.trim(),
      previewPrimaryColorInput.value,
      previewSecondaryColorInput.value
    );
    previewLinkTextarea.value = link;
    copyText(link);
  }

  function copyDevStorageOutput() {
    copyText(devStorageTextarea.value);
  }

  const handleUndo = () => {
    const base64 = historyManager.undo();
    if (!base64) return;
    applyHistoryState(base64);
  };

  const handleRedo = () => {
    const base64 = historyManager.redo();
    if (!base64) return;
    applyHistoryState(base64);
  };

  loadBtn.onclick = loadFromBase64;
  clearGridBtn.onclick = gridManager.clearGrid;
  copyOutputBtn.onclick = copyOutput;
  copyDiscordBtn.onclick = copyDiscordOutput;
  copyPreviewLinkBtn.onclick = copyPreviewLink;
  copyDevStorageBtn.onclick = copyDevStorageOutput;
  undoBtn.onclick = handleUndo;
  redoBtn.onclick = handleRedo;
  swapColorsBtn.onclick = () => {
    const primary = previewPrimaryColorInput.value;
    previewPrimaryColorInput.value = previewSecondaryColorInput.value;
    previewSecondaryColorInput.value = primary;
    colorPresetControls.setCustomSelection();
    updateOutput();
  };
  setupHistoryShortcuts({ onUndo: handleUndo, onRedo: handleRedo });

  const syncRotateSelectWithActionsTab = () => {
    if (!tabActionsInput.checked && toolState.getCurrentTool() === "select") {
      toolSelectBtn.click();
    }
  };

  tabActionsInput.addEventListener("change", syncRotateSelectWithActionsTab);
  tabToolsInput.addEventListener("change", syncRotateSelectWithActionsTab);
  tabGridInput.addEventListener("change", syncRotateSelectWithActionsTab);

  gridManager.generateGrid();

  if (shouldFocusPreview) {
    if (layoutTabsInput) {
      layoutTabsInput.checked = true;
    }
    if (viewPreviewInput) {
      viewPreviewInput.checked = true;
    }
    const scrollTarget = previewPanel ?? previewCanvas;
    setTimeout(() => {
      scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }
});
