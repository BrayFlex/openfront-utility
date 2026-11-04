import { getCircleCells, type GridPoint } from "./circleGeometry.js";
import type { ClipboardManager } from "./clipboard.js";
import type { BrushTip, DrawingTools } from "./drawingTools.js";
import { getFillStyle } from "./fillStyles.js";
import type { GuideState } from "./gridGuides.js";
import {
  invertPattern,
  rotateSelection,
  shiftPatternDown,
  shiftPatternLeft,
  shiftPatternRight,
  shiftPatternUp,
  shiftSelection,
  flipSelectionH,
  flipSelectionV,
} from "./patternTransforms.js";
import type { ShapeRatio, ShapeType, ToolState } from "./toolState.js";

// ─── Public API ───────────────────────────────────────────────────────────────

export type GridManager = {
  generateGrid: (pattern?: number[][]) => void;
  /** Re-apply guide/center/ruler visuals to the existing grid without rebuilding cells. */
  refreshGuides: () => void;
  getCurrentPattern: () => number[][];
  clearGrid: () => void;
  getTileWidth: () => number;
  getTileHeight: () => number;
  isCellActive: (x: number, y: number) => boolean;
  setCellActive: (x: number, y: number, active: boolean) => void;
  setDrawingTools: (tools: DrawingTools) => void;
  /** Returns the active selection (shared reference — read-only externally) */
  getActiveSelection: () => Set<string>;
  /** Replace the active selection, dropping any cells outside the canvas. */
  restoreSelection: (selection: Iterable<string>) => void;
  clearSelection: () => void;
  hasSelection: () => boolean;
  /** Invert all cells in selection (or full canvas if no selection) */
  invertGrid: () => void;
  /** Invert the selection itself — select all unselected cells, deselect all selected */
  invertSelection: () => void;
  /** Cut selection to clipboard */
  cutSelection: (clipboard: ClipboardManager) => void;
  /** Copy selection to clipboard */
  copySelection: (clipboard: ClipboardManager) => void;
  /** Paste clipboard centered on (x,y) */
  paste: (x: number, y: number, clipboard: ClipboardManager) => void;
  /** Shift selection (or full canvas) in direction */
  shiftDir: (dx: number, dy: number) => void;
  /** Rotate selection around its centroid */
  rotateDir: (direction: "left" | "right") => void;
  /** Flip selection along horizontal or vertical axis */
  flipDir: (direction: "h" | "v") => void;
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
  clipboard?: ClipboardManager;
  drawingTools?: DrawingTools;
  /** When set, the grid ignores the shared size inputs and uses a fixed size. */
  fixedWidth?: number;
  fixedHeight?: number;
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
    clipboard,
    drawingTools: initialDrawingTools,
    fixedWidth,
    fixedHeight,
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

  // Fill preview (which cells a fill would touch, and which it would ink)
  let fillPreviewCells: { x: number; y: number; active: boolean }[] = [];

  // Pencil preview (brush footprint under the cursor)
  let pencilPreviewCells: GridPoint[] = [];
  // Last cell touched by the current pencil stroke, used to fill in gaps when
  // the pointer moves quickly between cells.
  let lastPencilCell: GridPoint | null = null;

  // Line start
  let lineStart: GridPoint | null = null;
  let lineStartMarker: GridPoint | null = null;
  let linePreviews: GridPoint[] = [];

  // Editable curved line: the straight line stays a preview while the pointer
  // moves to bend it, then the next click solidifies it onto the canvas.
  type CurveDraft = {
    start: GridPoint;
    end: GridPoint;
    control: GridPoint;
  };
  let curveDraft: CurveDraft | null = null;

  const LINE_BRUSH_TIP: BrushTip = "soft";

  // ── UNIFIED SELECTION ─────────────────────────────────────────────────────
  let activeSelection = new Set<string>();
  // For Select Area tool: track drag rect
  let selectAreaStart: GridPoint | null = null;
  let selectAreaEnd: GridPoint | null = null;
  let selectAreaAdding = true; // true = add to sel, false = remove
  let selectAreaPreview = new Set<string>(); // visual rect preview
  // Paste preview
  let pastePreviewCells: GridPoint[] = [];
  let pastePreviewOrigin: { ox: number; oy: number } | null = null;

  const baseCellSize = 20;

  // The workspace is pannable while Space / Ctrl / ⌘ is held. While one of
  // those pan keys is down we suppress previews (and accidental drawing) so the
  // canvas stays clean during a pan gesture.
  const isPanKeyHeld = () =>
    gridDiv.closest(".canvas-workspace")?.classList.contains("pan-key-held") ?? false;

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
    // Keep the ruler frame tracks in sync with the cell size.
    gridDiv.parentElement?.style.setProperty("--cell-size", `${cellSize}px`);
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
    renderSelection();
  };

  const restoreSelection = (selection: Iterable<string>) => {
    activeSelection = new Set<string>();
    for (const cellKey of selection) {
      const [x, y] = cellKey.split(",").map(Number);
      if (isInBounds(x, y)) activeSelection.add(cellKey);
    }
    selectAreaStart = null;
    selectAreaEnd = null;
    selectAreaPreview.clear();
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

  const clearStarPreview = () => {
    starPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("star-hover")
    );
    starPreviewCells = [];
  };

  const previewShape = (
    type: ShapeType,
    center: GridPoint,
    size: number,
    ratio: ShapeRatio
  ) => {
    clearStarPreview();
    if (!drawingTools) return;
    const pts = drawingTools.getShapeCells(type, center.x, center.y, size, ratio, activeSelection.size > 0 ? activeSelection : undefined);
    // Deduplicate and filter bounds
    const unique = new Set<string>();
    pts.forEach(p => {
      if (isInBounds(p.x, p.y)) unique.add(`${p.x},${p.y}`);
    });
    starPreviewCells = Array.from(unique).map(k => {
      const [x, y] = k.split(',').map(Number);
      return {x, y};
    });
    starPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.add("star-hover")
    );
  };

  // ── Fill preview ──────────────────────────────────────────────────────────
  const clearFillPreview = () => {
    fillPreviewCells.forEach((p) => {
      cellMatrix[p.y]?.[p.x]?.classList.remove("fill-hover", "fill-hover-mark");
    });
    fillPreviewCells = [];
  };

  const previewFill = (pt: GridPoint) => {
    clearFillPreview();
    if (!drawingTools) return;
    const targets = drawingTools.getFillTargets(
      pt.x,
      pt.y,
      getFillStyle(toolState.getFillStyle()),
      activeSelection.size > 0 ? activeSelection : undefined
    );
    fillPreviewCells = targets.filter((p) => isInBounds(p.x, p.y));
    fillPreviewCells.forEach((p) => {
      cellMatrix[p.y]?.[p.x]?.classList.add(
        p.active ? "fill-hover-mark" : "fill-hover"
      );
    });
  };

  // ── Pencil preview ────────────────────────────────────────────────────────
  const getPencilCells = (cx: number, cy: number) =>
    drawingTools?.getBrushCells(
      cx,
      cy,
      toolState.getPencilSize(),
      toolState.getPencilTip()
    ) ?? [];

  const clearPencilPreview = () => {
    pencilPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("pencil-hover")
    );
    pencilPreviewCells = [];
  };

  const previewPencil = (pt: GridPoint) => {
    clearPencilPreview();
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    pencilPreviewCells = getPencilCells(pt.x, pt.y).filter(
      (p) => isInBounds(p.x, p.y) && (!sel || sel.has(key(p.x, p.y)))
    );
    pencilPreviewCells.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.add("pencil-hover")
    );
  };

  // ── Line preview ──────────────────────────────────────────────────────────
  const markLineStart = (pt: GridPoint) => {
    lineStartMarker = pt;
    cellMatrix[pt.y]?.[pt.x]?.classList.add("line-start");
  };

  const clearLinePreview = () => {
    linePreviews.forEach((p) =>
      cellMatrix[p.y]?.[p.x]?.classList.remove("line-hover")
    );
    linePreviews = [];
    if (lineStartMarker) {
      cellMatrix[lineStartMarker.y]?.[lineStartMarker.x]?.classList.remove("line-start");
    }
    lineStartMarker = null;
  };

  const setLineStart = (pt: GridPoint | null) => {
    clearLinePreview();
    lineStart = pt;
    if (pt) markLineStart(pt);
  };

  const renderLineCells = (cells: GridPoint[], start: GridPoint) => {
    linePreviews = cells.filter((p) => isInBounds(p.x, p.y));
    markLineStart(start);
    linePreviews.forEach((p) => {
      if (p.x === start.x && p.y === start.y) return;
      cellMatrix[p.y]?.[p.x]?.classList.add("line-hover");
    });
  };

  const previewLine = (x1: number, y1: number) => {
    clearLinePreview();
    if (!lineStart) return;
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    const cells = drawingTools?.getLineCells(
      lineStart.x,
      lineStart.y,
      x1,
      y1,
      toolState.getLineSize(),
      LINE_BRUSH_TIP,
      sel
    ) ?? [{ x: lineStart.x, y: lineStart.y }, { x: x1, y: y1 }];
    renderLineCells(cells, lineStart);
  };

  // ── Curved line draft ─────────────────────────────────────────────────────
  const previewCurve = () => {
    clearLinePreview();
    if (!curveDraft) return;
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    const cells = drawingTools?.getCurveCells(
      curveDraft.start.x,
      curveDraft.start.y,
      curveDraft.control.x,
      curveDraft.control.y,
      curveDraft.end.x,
      curveDraft.end.y,
      toolState.getLineSize(),
      LINE_BRUSH_TIP,
      sel
    ) ?? [];
    renderLineCells(cells, curveDraft.start);
  };

  const beginCurveDraft = (start: GridPoint, end: GridPoint) => {
    clearLinePreview();
    lineStart = null;
    curveDraft = {
      start: { ...start },
      end: { ...end },
      control: {
        x: Math.round((start.x + end.x) / 2),
        y: Math.round((start.y + end.y) / 2),
      },
    };
    previewCurve();
  };

  const updateCurveControl = (pt: GridPoint) => {
    if (!curveDraft) return;
    // A quadratic Bézier passes through its control path midpoint at t=0.5.
    // Solve for the control point so the curve passes through the pixel the
    // user is dragging: C = 2M - (P0 + P2) / 2.
    curveDraft.control = {
      x: Math.round(2 * pt.x - (curveDraft.start.x + curveDraft.end.x) / 2),
      y: Math.round(2 * pt.y - (curveDraft.start.y + curveDraft.end.y) / 2),
    };
    previewCurve();
  };

  const clearCurveDraft = () => {
    const hadDraft = curveDraft !== null;
    curveDraft = null;
    if (hadDraft) clearLinePreview();
  };

  const commitCurveDraft = () => {
    if (!curveDraft || !drawingTools) return;
    const draft = curveDraft;
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    drawingTools.drawCurve(
      draft.start.x,
      draft.start.y,
      draft.control.x,
      draft.control.y,
      draft.end.x,
      draft.end.y,
      sel,
      toolState.getLineSize(),
      LINE_BRUSH_TIP
    );
    clearCurveDraft();
    onPatternChange();
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
    entry: { cells: Array<{ x: number; y: number; active: boolean }>; originX: number; originY: number; width: number; height: number }
  ) => {
    clearPastePreview();
    pastePreviewOrigin = { ox: entry.originX, oy: entry.originY };
    // Center the paste on the cursor cell
    const halfW = Math.floor(entry.width / 2);
    const halfH = Math.floor(entry.height / 2);
    const pts: GridPoint[] = [];
    for (const c of entry.cells) {
      if (!c.active) continue;
      const tx = anchorX + (c.x - entry.originX) - halfW;
      const ty = anchorY + (c.y - entry.originY) - halfH;
      if (isInBounds(tx, ty)) {
        pts.push({ x: tx, y: ty });
        cellMatrix[ty]?.[tx]?.classList.add("paste-hover");
      }
    }
    pastePreviewCells = pts;
  };

  // ── Pencil brush ──────────────────────────────────────────────────────────
  const applyPencilBrush = (cx: number, cy: number, activate: boolean) => {
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    for (const p of getPencilCells(cx, cy)) {
      if (!isInBounds(p.x, p.y)) continue;
      if (sel && !sel.has(key(p.x, p.y))) continue;
      setCellActive(p.x, p.y, activate);
    }
    lastPencilCell = { x: cx, y: cy };
  };

  /**
   * Continue a pencil stroke from the last touched cell to the new one. Using
   * the drawing tool's line helper stamps the brush along every skipped cell,
   * so fast drags stay continuous instead of leaving dotted gaps.
   */
  const continuePencilStroke = (
    cx: number,
    cy: number,
    activate: boolean
  ) => {
    const sel = activeSelection.size > 0 ? activeSelection : undefined;
    const size = toolState.getPencilSize();
    const tip = toolState.getPencilTip();
    if (lastPencilCell && (lastPencilCell.x !== cx || lastPencilCell.y !== cy)) {
      drawingTools?.drawLine(
        lastPencilCell.x,
        lastPencilCell.y,
        cx,
        cy,
        sel,
        size,
        tip,
        activate
      );
      lastPencilCell = { x: cx, y: cy };
      return;
    }
    applyPencilBrush(cx, cy, activate);
  };

  // ── Paste commit ──────────────────────────────────────────────────────────
  const paste = (anchorX: number, anchorY: number, clipboard: ClipboardManager) => {
    clearPastePreview();
    const entry = clipboard.paste();
    if (!entry) return;
    // Center on the anchor cell
    const halfW = Math.floor(entry.width / 2);
    const halfH = Math.floor(entry.height / 2);
    for (const c of entry.cells) {
      if (!c.active) continue;
      const tx = anchorX + (c.x - entry.originX) - halfW;
      const ty = anchorY + (c.y - entry.originY) - halfH;
      // Respect active selection boundary if one exists
      if (activeSelection.size > 0 && !activeSelection.has(key(tx, ty))) continue;
      setCellActive(tx, ty, c.active);
    }
    onPatternChange();
  };

  // ── Cut ───────────────────────────────────────────────────────────────────
  const cutSelection = (clipboard: ClipboardManager) => {
    if (!hasSelection()) return;
    // Snapshot selection keys before copySelection clears them
    const toErase = new Set(activeSelection);
    copySelection(clipboard); // internally calls clearSelection()
    toErase.forEach((k) => {
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
    // Copy is a completed selection action, so deselect automatically; this
    // keeps a following paste unconstrained by the old selection.
    clearSelection();
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

  // ── Invert Selection ─────────────────────────────────────────────────────
  // Toggles which cells are selected: everything not selected becomes selected.
  const invertSelection = () => {
    const newSel = new Set<string>();
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        if (!activeSelection.has(key(x, y))) {
          newSel.add(key(x, y));
        }
      }
    }
    activeSelection = newSel;
    renderSelection();
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

  // ── Flip ──────────────────────────────────────────────────────────────────
  const flipDir = (direction: "h" | "v") => {
    if (!hasSelection()) return;
    const { pattern: next, flippedSelection } = direction === "h"
      ? flipSelectionH(patternState, activeSelection)
      : flipSelectionV(patternState, activeSelection);
    patternState = next;
    activeSelection = flippedSelection;
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

  // ── Mouse & Key state ─────────────────────────────────────────────────────
  let isShiftDown = false;
  // Button element for the selectArea tool — used for unified shift highlight
  const selectAreaBtn = document.getElementById("tool-selectArea");

  document.addEventListener("keydown", (e) => {
    if (e.key === "Shift") {
      isShiftDown = true;
      // Highlight the select tool button while shift is held
      selectAreaBtn?.classList.add("selected");
      // Show select-mode cursor on the grid
      gridDiv.classList.add("select-mode");
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      isShiftDown = false;
      // Only remove highlight if select tool isn't permanently active
      if (toolState.getCurrentTool() !== "selectArea") {
        selectAreaBtn?.classList.remove("selected");
      }
      gridDiv.classList.remove("select-mode");
    }
  });

  document.body.addEventListener("mousedown", () => (isMouseDown = true));
  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
    penToggleState = null;
    lastPencilCell = null;
    // Commit Select Area drag regardless of current tool if we started one
    if (selectAreaStart && selectAreaEnd) {
      const rect = buildRectSet(selectAreaStart, selectAreaEnd);
      if (selectAreaAdding) {
        rect.forEach((k) => activeSelection.add(k));
      } else {
        rect.forEach((k) => activeSelection.delete(k));
      }
      selectAreaStart = null;
      selectAreaEnd = null;
      selectAreaPreview.clear();
      renderSelection();
    }
  });

  gridDiv.addEventListener("mouseleave", () => {
    clearCirclePreview();
    clearStarPreview();
    clearFillPreview();
    clearPencilPreview();
    lastPencilCell = null;
    // Keep a curved-line draft visible if the pointer briefly leaves the grid
    // (for example while moving toward the Draw button).
    if (!curveDraft) clearLinePreview();
    clearPastePreview();
  });

  // ── Guides: center overlay + outside rulers ───────────────────────────────
  const updateCenterOverlay = () => {
    let centerCross = gridDiv.querySelector('.center-cross-overlay') as HTMLDivElement | null;
    if (!centerCross) {
      centerCross = document.createElement("div");
      centerCross.className = "center-cross-overlay";
      gridDiv.appendChild(centerCross);
    }
    if (guideState.isCenterEnabled()) {
      centerCross.style.display = "block";
      centerCross.style.top = "50%";
      centerCross.style.left = "50%";
    } else {
      centerCross.style.display = "none";
    }
  };

  // Ruler ticks + labels on the outside of the drawable grid. Top/left rulers
  // mark every grid line (numbered every 5). Center ticks render on all four
  // sides when the center guide is enabled — and show even without the ruler.
  const renderRulers = () => {
    const frame = gridDiv.parentElement;
    if (!frame) return;
    const topRuler = frame.querySelector<HTMLElement>(".grid-ruler-top");
    const bottomRuler = frame.querySelector<HTMLElement>(".grid-ruler-bottom");
    const leftRuler = frame.querySelector<HTMLElement>(".grid-ruler-left");
    const rightRuler = frame.querySelector<HTMLElement>(".grid-ruler-right");
    if (!topRuler || !bottomRuler || !leftRuler || !rightRuler) return;

    const rulerEnabled = guideState.isRulerEnabled();
    const centerEnabled = guideState.isCenterEnabled();
    // Keep the ruler strips visible if either the ruler or the center ticks are shown
    frame.classList.toggle("ruler-off", !rulerEnabled && !centerEnabled);
    // With center ticks only, the strips are a transparent overlay so they do
    // not hide the workspace/ghost tiling around the canvas.
    frame.classList.toggle("center-only", centerEnabled && !rulerEnabled);

    [topRuler, bottomRuler, leftRuler, rightRuler].forEach((r) => r.replaceChildren());

    // Nothing to render when both toggles are off
    if (!rulerEnabled && !centerEnabled) return;

    const cellSize = baseCellSize * getGridScale();
    const tickMinor = Math.max(4, cellSize * 0.45);
    // Numbers sit at the outer edge of the strip; the increment ticks span from
    // the grid side up to the numbers but never intersect them.
    const numberZone = Math.max(10, cellSize * 0.5);
    const labelPos = Math.floor(numberZone / 2);

    if (rulerEnabled) {
      // Top + bottom rulers: vertical ticks at each column boundary
      for (const ruler of [topRuler, bottomRuler]) {
        for (let i = 0; i <= tileWidth; i++) {
          const x = i * cellSize;
          const major = i % 5 === 0;
          const tick = document.createElement("div");
          tick.className =
            "grid-ruler-tick grid-ruler-tick-v" + (major ? " grid-ruler-tick-major" : "");
          if (major) {
            tick.style.left = `${x}px`;
            tick.style.top = `${numberZone}px`;
            tick.style.height = `${cellSize - numberZone}px`;
          } else {
            tick.style.left = `${x}px`;
            tick.style.top = `${cellSize - tickMinor}px`;
            tick.style.height = `${tickMinor}px`;
          }
          ruler.appendChild(tick);
          if (major && i > 0) {
            const label = document.createElement("div");
            label.className = "grid-ruler-label";
            label.textContent = String(i);
            label.style.left = `${x}px`;
            label.style.top = `${labelPos}px`;
            ruler.appendChild(label);
          }
        }
      }

      // Left + right rulers: horizontal ticks at each row boundary
      for (const ruler of [leftRuler, rightRuler]) {
        for (let i = 0; i <= tileHeight; i++) {
          const y = i * cellSize;
          const major = i % 5 === 0;
          const tick = document.createElement("div");
          tick.className =
            "grid-ruler-tick grid-ruler-tick-h" + (major ? " grid-ruler-tick-major" : "");
          if (major) {
            tick.style.top = `${y}px`;
            tick.style.left = `${numberZone}px`;
            tick.style.width = `${cellSize - numberZone}px`;
          } else {
            tick.style.top = `${y}px`;
            tick.style.left = `${cellSize - tickMinor}px`;
            tick.style.width = `${tickMinor}px`;
          }
          ruler.appendChild(tick);
          if (major && i > 0) {
            const label = document.createElement("div");
            label.className = "grid-ruler-label";
            label.textContent = String(i);
            label.style.top = `${y}px`;
            label.style.left = `${labelPos}px`;
            ruler.appendChild(label);
          }
        }
      }
    }

    // Center ruler ticks — one on each side when the center guide is on.
    if (centerEnabled) {
      const centerX = (tileWidth / 2) * cellSize;
      const centerY = (tileHeight / 2) * cellSize;
      const addCenterTick = (ruler: HTMLElement, vertical: boolean, pos: number) => {
        const tick = document.createElement("div");
        tick.className = "grid-ruler-tick grid-ruler-tick-center";
        if (vertical) {
          tick.style.left = `${pos}px`;
          tick.style.top = "0";
          tick.style.height = "100%";
          tick.style.width = "2px";
        } else {
          tick.style.top = `${pos}px`;
          tick.style.left = "0";
          tick.style.width = "100%";
          tick.style.height = "2px";
        }
        ruler.appendChild(tick);
      };
      addCenterTick(topRuler, true, centerX);
      addCenterTick(bottomRuler, true, centerX);
      addCenterTick(leftRuler, false, centerY);
      addCenterTick(rightRuler, false, centerY);
    }
  };

  // Re-apply guide/center/ruler visuals to the existing grid (no rebuild).
  const refreshGuides = () => {
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        const cell = cellMatrix[y]?.[x];
        if (!cell) continue;
        cell.classList.remove("guide-v", "guide-h");
        if (guideState.isBlackEnabled()) {
          if (x !== 0 && x % 5 === 0) cell.classList.add("guide-v");
          if (y !== 0 && y % 5 === 0) cell.classList.add("guide-h");
        }
      }
    }
    updateCenterOverlay();
    renderRulers();
  };

  // ── Grid generation ───────────────────────────────────────────────────────
  function generateGrid(pattern?: number[][]) {
    tileWidth = fixedWidth ?? parseInt(tileWidthInput.value);
    tileHeight = fixedHeight ?? parseInt(tileHeightInput.value);
    setLineStart(null);
    clearCurveDraft();
    clearPencilPreview();
    lastPencilCell = null;
    clearCirclePreview();
    clearStarPreview();
    clearFillPreview();
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

    updateCenterOverlay();

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

        // ── Event handlers ─────────────────────────────────────────────
        // Capture x/y in closure (re-assign to avoid stale capture issue)
        const cx = x, cy = y;

        cell.onmousedown = () => {
          if (isPanKeyHeld()) return;
          const actualTool = toolState.getCurrentTool();
          const tool = isShiftDown ? "selectArea" : actualTool;

          // While a curved line is being edited, moving the pointer bends the
          // curve. The click that follows solidifies it.
          if (tool === "line" && curveDraft) {
            return;
          }

          if (tool === "selectArea") {
            selectAreaStart = { x: cx, y: cy };
            selectAreaEnd = { x: cx, y: cy };
            // If starting on a selected cell, we're removing
            selectAreaAdding = !activeSelection.has(key(cx, cy));
            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
            renderSelection();
            return;
          }

          if (tool === "pencil") {
            // Start the stroke on the press so the very first pixel is drawn
            // even when the pointer is dragged straight off this cell.
            clearPencilPreview();
            penToggleState = !isCellActive(cx, cy);
            applyPencilBrush(cx, cy, penToggleState);
            onPatternChange();
            return;
          }
        };

        cell.onmouseup = () => {
          // (commit handled on document body mouseup)
        };

        cell.onclick = () => {
          if (isPanKeyHeld()) return;
          // If shift is held, the mousedown already handled the selectArea logic — don't draw.
          if (isShiftDown) return;
          const tool = toolState.getCurrentTool();
          const sel = activeSelection.size > 0 ? activeSelection : undefined;

          if (tool === "line") {
            // A click while editing a curve solidifies it immediately.
            if (curveDraft) {
              commitCurveDraft();
              return;
            }
            if (!lineStart) {
              setLineStart({ x: cx, y: cy });
              return;
            }
            if (toolState.getLineMode() === "curve") {
              beginCurveDraft(lineStart, { x: cx, y: cy });
              return;
            }
            drawingTools?.drawLine(
              lineStart.x,
              lineStart.y,
              cx,
              cy,
              sel,
              toolState.getLineSize(),
              LINE_BRUSH_TIP
            );
            setLineStart(null);
            onPatternChange();
          } else if (tool === "fill") {
            drawingTools?.fillWithStyle(
              cx,
              cy,
              getFillStyle(toolState.getFillStyle()),
              sel
            );
            clearFillPreview();
            onPatternChange();
          } else if (tool === "shape") {
            drawingTools?.drawShape(
              toolState.getShapeType(),
              cx,
              cy,
              toolState.getShapeSize(),
              toolState.getShapeRatio(),
              sel
            );
            clearStarPreview(); // using same dim overlay for shape if added later
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
          if (isPanKeyHeld()) return;
          const actualTool = toolState.getCurrentTool();
          const tool = isShiftDown ? "selectArea" : actualTool;
          const sel = activeSelection.size > 0 ? activeSelection : undefined;

          if (tool === "selectArea" && isMouseDown && selectAreaStart) {
            selectAreaEnd = { x: cx, y: cy };
            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
            renderSelection();
            return;
          }

          if (tool === "line" && curveDraft) {
            updateCurveControl({ x: cx, y: cy });
            return;
          }

          if (isMouseDown && tool === "pencil") {
            if (penToggleState === null) penToggleState = !isCellActive(cx, cy);
            continuePencilStroke(cx, cy, penToggleState);
            onPatternChange();
            return;
          }

          if (!isMouseDown && tool === "pencil") {
            previewPencil({ x: cx, y: cy });
            return;
          }

          if (!isMouseDown && tool === "fill") {
            previewFill({ x: cx, y: cy });
            return;
          }

          if (!isMouseDown && tool === "circle") {
            previewCircle({ x: cx, y: cy }, toolState.getCircleRadius());
            return;
          }

          if (!isMouseDown && tool === "shape") {
            previewShape(
              toolState.getShapeType(),
              { x: cx, y: cy },
              toolState.getShapeSize(),
              toolState.getShapeRatio()
            );
            return;
          }

          if (tool === "line" && lineStart) {
            previewLine(cx, cy);
            return;
          }

          if (!isMouseDown && tool === "paste" && clipboard?.hasContent()) {
            const entry = clipboard.paste();
            if (entry) showPastePreview(cx, cy, entry);
          }
        };
      }
    }

    cellMatrix = nextMatrix;
    renderRulers();
    onPatternChange();
  }

  // ── Input listeners ───────────────────────────────────────────────────────
  tileWidthInput.addEventListener("input", () => {
    if (fixedWidth !== undefined) return;
    tileWidthValue.value = tileWidthInput.value;
    generateGrid();
  });
  tileHeightInput.addEventListener("input", () => {
    if (fixedHeight !== undefined) return;
    tileHeightValue.value = tileHeightInput.value;
    generateGrid();
  });
  tileWidthValue.addEventListener("change", () => {
    if (fixedWidth !== undefined) return;
    tileWidthInput.value = tileWidthValue.value;
    generateGrid();
  });
  tileHeightValue.addEventListener("change", () => {
    if (fixedHeight !== undefined) return;
    tileHeightInput.value = tileHeightValue.value;
    generateGrid();
  });
  gridScaleInput?.addEventListener("change", applyGridSizing);

  // ── Tool change listener ──────────────────────────────────────────────────
  toolState.subscribeToToolChanges((tool) => {
    if (tool !== "line") {
      setLineStart(null);
      clearCurveDraft();
    }
    if (tool !== "circle") clearCirclePreview();
    if (tool !== "shape") clearStarPreview();
    if (tool !== "fill") clearFillPreview();
    if (tool !== "pencil") clearPencilPreview();
    if (tool !== "paste") clearPastePreview();
    if (tool !== "selectArea") {
      selectAreaStart = null;
      selectAreaEnd = null;
      selectAreaPreview.clear();
    }
    // Sync select-mode cursor class with tool state
    if (tool === "selectArea") {
      gridDiv.classList.add("select-mode");
    } else if (!isShiftDown) {
      gridDiv.classList.remove("select-mode");
    }
  });

  toolState.subscribeToLineChanges(() => {
    if (toolState.getLineMode() !== "curve") clearCurveDraft();
  });

  toolState.subscribeToPencilChanges(() => {
    clearPencilPreview();
  });

  // ── Clear grid ────────────────────────────────────────────────────────────
  function clearGrid() {
    setLineStart(null);
    clearCurveDraft();
    clearPencilPreview();
    lastPencilCell = null;
    clearCirclePreview();
    clearStarPreview();
    clearFillPreview();
    clearPastePreview();
    
    if (hasSelection() && drawingTools) {
      drawingTools.clearSelection(activeSelection);
    } else {
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          setCellActive(x, y, false);
        }
      }
    }
    onPatternChange();
  }

  function getCurrentPattern() {
    return patternState;
  }

  return {
    generateGrid,
    refreshGuides,
    getCurrentPattern,
    clearGrid,
    getTileWidth: () => tileWidth,
    getTileHeight: () => tileHeight,
    isCellActive,
    setCellActive,
    setDrawingTools,
    getActiveSelection: () => activeSelection,
    restoreSelection,
    clearSelection,
    hasSelection,
    invertGrid,
    invertSelection,
    cutSelection,
    copySelection,
    paste,
    shiftDir,
    rotateDir,
    flipDir,
  };
}
