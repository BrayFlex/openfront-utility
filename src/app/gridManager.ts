import { getCircleCells, type GridPoint } from "./circleGeometry.js";
import type { ClipboardManager } from "./clipboard.js";
import type { DrawingTools } from "./drawingTools.js";
import type { GuideState } from "./gridGuides.js";
import {
  invertPattern,
  rotateSelection,
  shiftPatternDown,
  shiftPatternLeft,
  shiftPatternRight,
  shiftPatternUp,
  shiftSelection,
} from "./patternTransforms.js";
import type { ToolState } from "./toolState.js";

// ─── Public API ───────────────────────────────────────────────────────────────

export type GridManager = {
  generateGrid: (pattern?: number[][]) => void;
  getCurrentPattern: () => number[][];
  clearGrid: () => void;
  getTileWidth: () => number;
  getTileHeight: () => number;
  isCellActive: (x: number, y: number) => boolean;
  setCellActive: (x: number, y: number, active: boolean) => void;
  setDrawingTools: (tools: DrawingTools) => void;
  /** Returns the active selection (shared reference — read-only externally) */
  getActiveSelection: () => Set<string>;
  clearSelection: () => void;
  hasSelection: () => boolean;
  /** Invert all cells in selection (or full canvas if no selection) */
  invertGrid: () => void;
  /** Cut selection to clipboard */
  cutSelection: (clipboard: ClipboardManager) => void;
  /** Copy selection to clipboard */
  copySelection: (clipboard: ClipboardManager) => void;
  /** Paste clipboard at (x,y) as top-left anchor */
  paste: (x: number, y: number, clipboard: ClipboardManager) => void;
  /** Shift selection (or full canvas) in direction */
  shiftDir: (dx: number, dy: number) => void;
  /** Rotate selection around its centroid */
  rotateDir: (direction: "left" | "right") => void;
};

// ─── Options ──────────────────────────────────────────────────────────────────

type GridManagerOptions = {
  gridDiv: HTMLElement;
  tileWidthInput: HTMLInputElement;
  tileHeightInput: HTMLInputElement;
  tileWidthValue: HTMLInputElement;
  tileHeightValue: HTMLInputElement;
  gridScaleInput?: HTMLSelectElement;
  guideState: GuideState;
  toolState: ToolState;
  drawingTools?: DrawingTools;
  onPatternChange: () => void;
};

// ─── Implementation ───────────────────────────────────────────────────────────

export function createGridManager(options: GridManagerOptions): GridManager {
  const {
    gridDiv,
    tileWidthInput,
    tileHeightInput,
    tileWidthValue,
    tileHeightValue,
    gridScaleInput,
    guideState,
    toolState,
    drawingTools: initialDrawingTools,
    onPatternChange,
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────
  let drawingTools: DrawingTools | null = initialDrawingTools ?? null;
  let tileWidth = parseInt(tileWidthInput.value);
  let tileHeight = parseInt(tileHeightInput.value);
  let isMouseDown = false;
  let penToggleState: boolean | null = null;
  let currentHeight = 0;
  let currentWidth = 0;
  let patternState: number[][] = [];
  let cellMatrix: HTMLDivElement[][] = [];

  // Circle preview
  let circlePreviewCells: GridPoint[] = [];

  // Star preview (dim overlay)
  let starPreviewCells: GridPoint[] = [];

  // Line start
  let lineStart: GridPoint | null = null;
  let linePreviews: GridPoint[] = [];

  // ── UNIFIED SELECTION ─────────────────────────────────────────────────────
  let activeSelection = new Set<string>();
  // For Select Area tool: track drag rect
  let selectAreaStart: GridPoint | null = null;
  let selectAreaEnd: GridPoint | null = null;
  let selectAreaAdding = true; // true = add to sel, false = remove
  let selectAreaPreview = new Set<string>(); // visual rect preview
  // For Select Custom tool: track drag add/remove mode
  let selectCustomMode: "add" | "remove" | null = null;
  // Paste preview
  let pastePreviewCells: GridPoint[] = [];
  let pastePreviewOrigin: { ox: number; oy: number } | null = null;

  const baseCellSize = 20;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isInBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < tileWidth && y < tileHeight;

  const key = (x: number, y: number) => `${x},${y}`;

  const getGridScale = () => {
    const s = gridScaleInput ? parseFloat(gridScaleInput.value) : 1;
    return Number.isFinite(s) && s > 0 ? s : 1;
  };

  const applyGridSizing = () => {
    const cellSize = baseCellSize * getGridScale();
    gridDiv.style.setProperty("--cell-size", `${cellSize}px`);
    gridDiv.style.gridTemplateColumns = `repeat(${tileWidth}, var(--cell-size))`;
  };

  const setCellActive = (x: number, y: number, active: boolean) => {
    if (!isInBounds(x, y)) return;
    patternState[y][x] = active ? 1 : 0;
    cellMatrix[y]?.[x]?.classList.toggle("active", active);
  };

  const isCellActive = (x: number, y: number) =>
    isInBounds(x, y) && patternState[y][x] === 1;

  const setDrawingTools = (tools: DrawingTools) => (drawingTools = tools);

  // ── Selection rendering ──────────────────────────────────────────────────
  const applySelectionClass = (sel: Set<string>, add: boolean) => {
    sel.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      cellMatrix[y]?.[x]?.classList.toggle("selection-cell", add);
    });
  };

  const renderSelection = () => {
    // Clear all selection classes first then re-apply current selection
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        cellMatrix[y]?.[x]?.classList.remove("selection-cell", "select-area-preview");
      }
    }
    applySelectionClass(activeSelection, true);
    // show area preview
    selectAreaPreview.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      cellMatrix[y]?.[x]?.classList.add("select-area-preview");
    });
    gridDiv.classList.toggle("selection-active", activeSelection.size > 0);
  };

  const clearSelection = () => {
    activeSelection.clear();
    selectAreaStart = null;
    selectAreaEnd = null;
    selectAreaPreview.clear();
    selectCustomMode = null;
    renderSelection();
  };

  const hasSelection = () => activeSelection.size > 0;

  // ── Area preview for Select Area tool ─────────────────────────────────────
  const buildRectSet = (start: GridPoint, end: GridPoint) => {
    const s = new Set<string>();
    const x1 = Math.max(0, Math.min(start.x, end.x));
    const y1 = Math.max(0, Math.min(start.y, end.y));
    const x2 = Math.min(tileWidth - 1, Math.max(start.x, end.x));
    const y2 = Math.min(tileHeight - 1, Math.max(start.y, end.y));
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        s.add(key(x, y));
      }
    }
    return s;
  };

  // ── Circle preview ────────────────────────────────────────────────────────
  const clearCirclePreview = () => {
    circlePreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("circle-hover")
    );
    circlePreviewCells = [];
  };

  const previewCircle = (center: GridPoint, radius: number) => {
    clearCirclePreview();
    circlePreviewCells =
      radius === 0
        ? isInBounds(center.x, center.y)
          ? [center]
          : []
        : getCircleCells(center, Math.max(0, radius), false, tileWidth, tileHeight);
    circlePreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.add("circle-hover")
    );
  };

  // ── Star preview ──────────────────────────────────────────────────────────
  const clearStarPreview = () => {
    starPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("star-hover")
    );
    starPreviewCells = [];
  };

  // ── Line preview ──────────────────────────────────────────────────────────
  const clearLinePreview = () => {
    linePreviews.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("line-hover")
    );
    linePreviews = [];
    if (lineStart) {
      cellMatrix[lineStart.y]?.[lineStart.x]?.classList.remove("line-start");
    }
  };

  const setLineStart = (pt: GridPoint | null) => {
    clearLinePreview();
    lineStart = pt;
    if (pt) cellMatrix[pt.y]?.[pt.x]?.classList.add("line-start");
  };

  const previewLine = (x1: number, y1: number) => {
    clearLinePreview();
    if (!lineStart) return;
    if (lineStart) cellMatrix[lineStart.y]?.[lineStart.x]?.classList.add("line-start");
    // Bresenham
    let x0 = lineStart.x, y0 = lineStart.y;
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2;
    const pts: GridPoint[] = [];
    while (true) {
      if (isInBounds(x0, y0)) pts.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    linePreviews = pts;
    linePreviews.forEach((p) => {
      if (p.x === lineStart!.x && p.y === lineStart!.y) return;
      cellMatrix[p.y]?.[p.x]?.classList.add("line-hover");
    });
  };

  // ── Paste preview ─────────────────────────────────────────────────────────
  const clearPastePreview = () => {
    pastePreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("paste-hover")
    );
    pastePreviewCells = [];
    pastePreviewOrigin = null;
  };

  const showPastePreview = (
    anchorX: number,
    anchorY: number,
    entry: { cells: Array<{ x: number; y: number; active: boolean }>; originX: number; originY: number }
  ) => {
    clearPastePreview();
    pastePreviewOrigin = { ox: entry.originX, oy: entry.originY };
    const pts: GridPoint[] = [];
    for (const c of entry.cells) {
      if (!c.active) continue;
      const tx = anchorX + (c.x - entry.originX);
      const ty = anchorY + (c.y - entry.originY);
      if (isInBounds(tx, ty)) {
        pts.push({ x: tx, y: ty });
        cellMatrix[ty]?.[tx]?.classList.add("paste-hover");
      }
    }
    pastePreviewCells = pts;
  };

  // ── Pencil brush ──────────────────────────────────────────────────────────
  const applyPencilBrush = (cx: number, cy: number, activate: boolean) => {
    const size = toolState.getPencilSize();
    const radius = Math.floor(size / 2);
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    for (let by = cy - radius; by <= cy + radius; by++) {
      for (let bx = cx - radius; bx <= cx + radius; bx++) {
        if (!isInBounds(bx, by)) continue;
        if (sel && !sel.has(key(bx, by))) continue;
        setCellActive(bx, by, activate);
      }
    }
  };

  // ── Paste commit ──────────────────────────────────────────────────────────
  const paste = (anchorX: number, anchorY: number, clipboard: ClipboardManager) => {
    clearPastePreview();
    const entry = clipboard.paste();
    if (!entry) return;
    for (const c of entry.cells) {
      if (!c.active) continue;
      const tx = anchorX + (c.x - entry.originX);
      const ty = anchorY + (c.y - entry.originY);
      setCellActive(tx, ty, c.active);
    }
    onPatternChange();
  };

  // ── Cut ───────────────────────────────────────────────────────────────────
  const cutSelection = (clipboard: ClipboardManager) => {
    if (!hasSelection()) return;
    copySelection(clipboard);
    activeSelection.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      setCellActive(x, y, false);
    });
    onPatternChange();
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const copySelection = (clipboard: ClipboardManager) => {
    if (!hasSelection()) return;
    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    activeSelection.forEach((k) => {
      const [x, y] = k.split(",").map(Number);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    const cells = Array.from(activeSelection).map((k) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y, active: isCellActive(x, y) };
    });
    clipboard.copy({
      cells,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      originX: minX,
      originY: minY,
    });
  };

  // ── Invert ────────────────────────────────────────────────────────────────
  const invertGrid = () => {
    if (hasSelection()) {
      drawingTools?.invertSelection(activeSelection);
    } else {
      applyPattern(invertPattern(patternState));
    }
    onPatternChange();
  };

  // ── Shift ─────────────────────────────────────────────────────────────────
  const shiftDir = (dx: number, dy: number) => {
    if (hasSelection()) {
      const { pattern: next, movedSelection } = shiftSelection(patternState, activeSelection, dx, dy);
      patternState = next;
      activeSelection = movedSelection;
      applyPattern(patternState);
      renderSelection();
    } else {
      if (dx === -1) applyPattern(shiftPatternLeft(patternState));
      else if (dx === 1) applyPattern(shiftPatternRight(patternState));
      else if (dy === 1) applyPattern(shiftPatternDown(patternState));
      else if (dy === -1) applyPattern(shiftPatternUp(patternState));
    }
    onPatternChange();
  };

  // ── Rotate ────────────────────────────────────────────────────────────────
  const rotateDir = (direction: "left" | "right") => {
    if (!hasSelection()) return;
    const { pattern: next, rotatedSelection } = rotateSelection(patternState, activeSelection, direction);
    patternState = next;
    activeSelection = rotatedSelection;
    applyPattern(patternState);
    renderSelection();
    onPatternChange();
  };

  // ── Pattern application ───────────────────────────────────────────────────
  const applyPattern = (next: number[][]) => {
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        setCellActive(x, y, next[y]?.[x] === 1);
      }
    }
  };

  // ── Mouse state ───────────────────────────────────────────────────────────
  document.body.addEventListener("mousedown", () => (isMouseDown = true));
  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
    penToggleState = null;
    // Commit Select Area drag
    if (toolState.getCurrentTool() === "selectArea" && selectAreaStart && selectAreaEnd) {
      const rect = buildRectSet(selectAreaStart, selectAreaEnd);
      if (selectAreaAdding) {
        rect.forEach((k) => activeSelection.add(k));
      } else {
        rect.forEach((k) => activeSelection.delete(k));
      }
      selectAreaStart = null;
      selectAreaEnd = null;
      selectAreaPreview.clear();
      selectCustomMode = null;
      renderSelection();
    }
    if (toolState.getCurrentTool() === "selectCustom") {
      selectCustomMode = null;
    }
  });

  gridDiv.addEventListener("mouseleave", () => {
    clearCirclePreview();
    clearStarPreview();
    clearLinePreview();
    clearPastePreview();
  });

  // ── Grid generation ───────────────────────────────────────────────────────
  function generateGrid(pattern?: number[][]) {
    tileWidth = parseInt(tileWidthInput.value);
    tileHeight = parseInt(tileHeightInput.value);
    setLineStart(null);
    clearCirclePreview();
    clearStarPreview();
    clearPastePreview();
    clearSelection();
    applyGridSizing();

    const base = pattern ?? patternState;
    patternState = Array.from({ length: tileHeight }, (_, y) =>
      Array.from({ length: tileWidth }, (_, x) =>
        base[y]?.[x] === 1 ? 1 : 0
      )
    );

    const nextMatrix: HTMLDivElement[][] = Array.from({ length: tileHeight }, () => []);

    // Remove extra rows
    for (let y = tileHeight; y < currentHeight; y++) {
      cellMatrix[y]?.forEach((c) => c.remove());
    }
    // Remove extra cols from kept rows
    for (let y = 0; y < Math.min(tileHeight, currentHeight); y++) {
      for (let x = tileWidth; x < currentWidth; x++) {
        cellMatrix[y]?.[x]?.remove();
      }
    }
    currentWidth = tileWidth;
    currentHeight = tileHeight;

    // Guide columns/rows
    let centerV: number[] = [];
    let centerH: number[] = [];
    if (guideState.isCenterEnabled()) {
      centerV = tileWidth % 2 === 0
        ? [tileWidth / 2]
        : [(tileWidth - 1) / 2, (tileWidth - 1) / 2 + 1];
      centerH = tileHeight % 2 === 0
        ? [tileHeight / 2]
        : [(tileHeight - 1) / 2, (tileHeight - 1) / 2 + 1];
    }

    let lastCell: HTMLDivElement | undefined;

    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        let cell: HTMLDivElement = cellMatrix[y]?.[x] ?? document.createElement("div");
        if (!cellMatrix[y]?.[x]) {
          cell.className = "cell";
          cell.dataset.x = x.toString();
          cell.dataset.y = y.toString();
        }

        // DOM position
        if (lastCell !== undefined) {
          if (cell.previousSibling !== lastCell) {
            gridDiv.insertBefore(cell, lastCell.nextSibling);
          }
        } else if (!cell.parentElement) {
          gridDiv.appendChild(cell);
        }

        nextMatrix[y][x] = cell;
        lastCell = cell;

        // Reset classes
        cell.className = "cell";
        cell.classList.toggle("active", patternState[y][x] === 1);

        if (guideState.isBlackEnabled()) {
          if (x !== 0 && x % 5 === 0) cell.classList.add("guide-v");
          if (y !== 0 && y % 5 === 0) cell.classList.add("guide-h");
        }
        if (guideState.isCenterEnabled()) {
          if (centerV.indexOf(x) !== -1) cell.classList.add("center-v");
          if (centerH.indexOf(y) !== -1) cell.classList.add("center-h");
        }

        // ── Event handlers ─────────────────────────────────────────────
        // Capture x/y in closure (re-assign to avoid stale capture issue)
        const cx = x, cy = y;

        cell.onmousedown = () => {
          const tool = toolState.getCurrentTool();

          if (tool === "selectArea") {
            selectAreaStart = { x: cx, y: cy };
            selectAreaEnd = { x: cx, y: cy };
            // If starting on a selected cell, we're removing
            selectAreaAdding = !activeSelection.has(key(cx, cy));
            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
            renderSelection();
            return;
          }

          if (tool === "selectCustom") {
            selectCustomMode = activeSelection.has(key(cx, cy)) ? "remove" : "add";
            if (selectCustomMode === "add") activeSelection.add(key(cx, cy));
            else activeSelection.delete(key(cx, cy));
            renderSelection();
            return;
          }
        };

        cell.onmouseup = () => {
          // (commit handled on document body mouseup)
        };

        cell.onclick = () => {
          const tool = toolState.getCurrentTool();
          const sel = activeSelection.size > 0 ? activeSelection : undefined;

          if (tool === "pencil") {
            const shouldActivate = !isCellActive(cx, cy);
            applyPencilBrush(cx, cy, shouldActivate);
            onPatternChange();
          } else if (tool === "line") {
            if (!lineStart) {
              setLineStart({ x: cx, y: cy });
              return;
            }
            drawingTools?.drawLine(lineStart.x, lineStart.y, cx, cy, sel);
            setLineStart(null);
            onPatternChange();
          } else if (tool === "fill") {
            if (hasSelection()) {
              drawingTools?.invertSelection(activeSelection);
            } else {
              drawingTools?.floodFill(cx, cy, sel);
            }
            onPatternChange();
          } else if (tool === "shade") {
            if (hasSelection()) {
              drawingTools?.shadeSelection(activeSelection);
            } else {
              drawingTools?.floodShade(cx, cy, sel);
            }
            onPatternChange();
          } else if (tool === "star") {
            drawingTools?.drawStar(cx, cy, toolState.getStarRadius(), sel);
            clearStarPreview();
            onPatternChange();
          } else if (tool === "circle") {
            drawingTools?.drawCircle(cx, cy, toolState.getCircleRadius(), sel);
            clearCirclePreview();
            onPatternChange();
          } else if (tool === "paste") {
            // paste handled in app.ts via clipboard
          }
        };

        cell.onmouseover = () => {
          const tool = toolState.getCurrentTool();
          const sel = activeSelection.size > 0 ? activeSelection : undefined;

          if (tool === "selectArea" && isMouseDown && selectAreaStart) {
            selectAreaEnd = { x: cx, y: cy };
            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
            renderSelection();
            return;
          }

          if (tool === "selectCustom" && isMouseDown && selectCustomMode) {
            if (selectCustomMode === "add") activeSelection.add(key(cx, cy));
            else activeSelection.delete(key(cx, cy));
            renderSelection();
            return;
          }

          if (isMouseDown && tool === "pencil") {
            if (penToggleState === null) penToggleState = !isCellActive(cx, cy);
            applyPencilBrush(cx, cy, penToggleState);
            onPatternChange();
            return;
          }

          if (!isMouseDown && tool === "circle") {
            previewCircle({ x: cx, y: cy }, toolState.getCircleRadius());
            return;
          }

          if (!isMouseDown && tool === "line" && lineStart) {
            previewLine(cx, cy);
            return;
          }

          if (isMouseDown && tool === "line" && lineStart) {
            previewLine(cx, cy);
            return;
          }

          if (!isMouseDown && tool === "paste") {
            // paste preview handled externally via app.ts clipboard ref
          }
        };
      }
    }

    cellMatrix = nextMatrix;
    onPatternChange();
  }

  // ── Input listeners ───────────────────────────────────────────────────────
  tileWidthInput.addEventListener("input", () => {
    tileWidthValue.value = tileWidthInput.value;
    generateGrid();
  });
  tileHeightInput.addEventListener("input", () => {
    tileHeightValue.value = tileHeightInput.value;
    generateGrid();
  });
  tileWidthValue.addEventListener("change", () => {
    tileWidthInput.value = tileWidthValue.value;
    generateGrid();
  });
  tileHeightValue.addEventListener("change", () => {
    tileHeightInput.value = tileHeightValue.value;
    generateGrid();
  });
  gridScaleInput?.addEventListener("change", applyGridSizing);

  // ── Tool change listener ──────────────────────────────────────────────────
  toolState.subscribeToToolChanges((tool) => {
    if (tool !== "line") setLineStart(null);
    if (tool !== "circle") clearCirclePreview();
    if (tool !== "star") clearStarPreview();
    if (tool !== "paste") clearPastePreview();
    if (tool !== "selectArea" && tool !== "selectCustom") {
      selectAreaStart = null;
      selectAreaEnd = null;
      selectAreaPreview.clear();
      selectCustomMode = null;
    }
  });

  // ── Clear grid ────────────────────────────────────────────────────────────
  function clearGrid() {
    setLineStart(null);
    clearCirclePreview();
    clearStarPreview();
    clearPastePreview();
    clearSelection();
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        setCellActive(x, y, false);
      }
    }
    onPatternChange();
  }

  function getCurrentPattern() {
    return patternState;
  }

  return {
    generateGrid,
    getCurrentPattern,
    clearGrid,
    getTileWidth: () => tileWidth,
    getTileHeight: () => tileHeight,
    isCellActive,
    setCellActive,
    setDrawingTools,
    getActiveSelection: () => activeSelection,
    clearSelection,
    hasSelection,
    invertGrid,
    cutSelection,
    copySelection,
    paste,
    shiftDir,
    rotateDir,
  };
}
