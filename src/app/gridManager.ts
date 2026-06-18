import {
  getCircleCells,
  type GridPoint,
} from "./circleGeometry.js";
import type { DrawingTools } from "./drawingTools.js";
import type { GuideState } from "./gridGuides.js";
import { invertPattern, shiftPatternDown, shiftPatternLeft, shiftPatternRight, shiftPatternUp } from "./patternTransforms.js";
import type { ToolState } from "./toolState.js";

type GridManagerOptions = {
  gridDiv: HTMLElement;
  tileWidthInput: HTMLInputElement;
  tileHeightInput: HTMLInputElement;
  tileWidthValue: HTMLInputElement;
  tileHeightValue: HTMLInputElement;
  gridScaleInput?: HTMLSelectElement;
  shiftUpBtn: HTMLButtonElement;
  shiftDownBtn: HTMLButtonElement;
  shiftLeftBtn: HTMLButtonElement;
  shiftRightBtn: HTMLButtonElement;
  invertBtn?: HTMLButtonElement;
  rotateLeftBtn?: HTMLButtonElement;
  rotateRightBtn?: HTMLButtonElement;
  guideState: GuideState;
  toolState: ToolState;
  drawingTools?: DrawingTools;
  onPatternChange: () => void;
};

export type GridManager = {
  generateGrid: (pattern?: number[][]) => void;
  getCurrentPattern: () => number[][];
  clearGrid: () => void;
  getTileWidth: () => number;
  getTileHeight: () => number;
  isCellActive: (x: number, y: number) => boolean;
  setCellActive: (x: number, y: number, active: boolean) => void;
  setDrawingTools: (tools: DrawingTools) => void;
  getStampSelection: () => GridPoint[];
  setShiftSelectionMode: (mode: "all" | "partial") => void;
  setShiftOverwriteMode: (overwrite: boolean) => void;
  enableShiftSelect: (enabled: boolean) => void;
  clearShiftSelect: () => void;
};

export function createGridManager(options: GridManagerOptions): GridManager {
  const {
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
    invertBtn,
    rotateLeftBtn,
    rotateRightBtn,
    guideState,
    toolState,
    drawingTools: initialDrawingTools,
    onPatternChange,
  } = options;

  let drawingTools: DrawingTools | null = initialDrawingTools ?? null;
  let tileWidth = parseInt(tileWidthInput.value);
  let tileHeight = parseInt(tileHeightInput.value);
  let isMouseDown = false;
  let toggleState: boolean | null = null;
  let currentHeight = 0;
  let currentWidth = 0;
  let lineStart: GridPoint | null = null;
  let circlePreviewCells: GridPoint[] = [];
  let selectionStart: GridPoint | null = null;
  let selectionEnd: GridPoint | null = null;
  let selectionTimeout: number | null = null;
  let isSelectionActive = false;
  let selectionCells: GridPoint[] = [];
  let selectionAnchorCell: GridPoint | null = null;
  let shiftSelectionStart: GridPoint | null = null;
  let shiftSelectionEnd: GridPoint | null = null;
  let shiftSelectionCells: GridPoint[] = [];
  let shiftSelectionAnchorCell: GridPoint | null = null;
  let shiftSelectionActive = false;
  let shiftSelectionMode: "all" | "partial" = "all";
  let shiftOverwriteMode = true;
  let isShiftSelectEnabled = false;
  let stampSelectionCells: GridPoint[] = [];
  let stampSelectionVisited = new Set<string>();
  let stampSelectionLastPoint: GridPoint | null = null;
  let patternState: number[][] = [];
  let cellMatrix: HTMLDivElement[][] = [];
  const baseCellSize = 20;
  const selectionHoldDelay = 250;

  const getGridScale = () => {
    const nextScale = gridScaleInput ? parseFloat(gridScaleInput.value) : 1;
    return Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
  };

  const applyGridSizing = () => {
    const cellSize = baseCellSize * getGridScale();
    gridDiv.style.setProperty("--cell-size", `${cellSize}px`);
    gridDiv.style.gridTemplateColumns = `repeat(${tileWidth}, var(--cell-size))`;
  };

  document.body.onmousedown = () => (isMouseDown = true);
  document.body.onmouseup = () => {
    isMouseDown = false;
    toggleState = null;
  };

  tileWidthInput.addEventListener("input", () => {
    tileWidthValue.value = tileWidthInput.value;
    generateGrid();
  });
  tileHeightInput.addEventListener("input", () => {
    tileHeightValue.value = tileHeightInput.value;
    generateGrid();
  });
  tileWidthValue.addEventListener("input", () => {
    tileWidthInput.value = tileWidthValue.value;
    generateGrid();
  });
  tileHeightValue.addEventListener("input", () => {
    tileHeightInput.value = tileHeightValue.value;
    generateGrid();
  });
  gridScaleInput?.addEventListener("change", applyGridSizing);

  const isInBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < tileWidth && y < tileHeight;

  const setCellActive = (x: number, y: number, active: boolean) => {
    if (!isInBounds(x, y)) return;
    patternState[y][x] = active ? 1 : 0;
    const cell = cellMatrix[y]?.[x];
    if (cell) {
      cell.classList.toggle("active", active);
    }
  };

  const isCellActive = (x: number, y: number) =>
    isInBounds(x, y) && patternState[y][x] === 1;

  const setDrawingTools = (tools: DrawingTools) => (drawingTools = tools);

  const clearStampSelection = () => {
    stampSelectionCells.forEach((point) => {
      cellMatrix[point.y]?.[point.x]?.classList.remove("stamp-selection-cell");
    });
    stampSelectionCells = [];
    stampSelectionVisited = new Set<string>();
    stampSelectionLastPoint = null;
  };

  const addStampCell = (x: number, y: number) => {
    if (!isInBounds(x, y)) return;
    const key = `${x},${y}`;
    if (stampSelectionVisited.has(key)) return;
    stampSelectionVisited.add(key);
    stampSelectionCells.push({ x, y });
    cellMatrix[y]?.[x]?.classList.add("stamp-selection-cell");
  };

  const addStampCircle = (center: GridPoint) => {
    const points = getCircleCells(
      center,
      Math.max(0, toolState.getStampBrushRadius()),
      true,
      tileWidth,
      tileHeight
    );
    points.forEach((point) => addStampCell(point.x, point.y));
  };

  const addStampPath = (from: GridPoint, to: GridPoint) => {
    let x = from.x;
    let y = from.y;
    let dx = Math.abs(to.x - from.x);
    let sx = from.x < to.x ? 1 : -1;
    let dy = -Math.abs(to.y - from.y);
    let sy = from.y < to.y ? 1 : -1;
    let err = dx + dy;
    while (true) {
      addStampCircle({ x, y });
      if (x === to.x && y === to.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  };

  const clearSelection = () => {
    selectionCells.forEach((point) => {
      cellMatrix[point.y]?.[point.x]?.classList.remove("selection-cell");
    });
    selectionCells = [];
    selectionStart = null;
    selectionEnd = null;
    selectionAnchorCell = null;
    isSelectionActive = false;
    gridDiv.classList.remove("selection-active");
  };

  const clearShiftSelection = () => {
    shiftSelectionCells.forEach((point) => {
      cellMatrix[point.y]?.[point.x]?.classList.remove("shift-selection-cell");
    });
    if (shiftSelectionAnchorCell) {
      cellMatrix[shiftSelectionAnchorCell.y]?.[shiftSelectionAnchorCell.x]?.classList.remove(
        "shift-selection-anchor"
      );
    }
    shiftSelectionCells = [];
    shiftSelectionStart = null;
    shiftSelectionEnd = null;
    shiftSelectionAnchorCell = null;
    shiftSelectionActive = false;
    gridDiv.classList.remove("shift-selection-active");
  };

  const clearSelectionTimer = () => {
    if (selectionTimeout !== null) {
      window.clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }
  };

  const renderSelection = () => {
    selectionCells.forEach((point) => {
      cellMatrix[point.y]?.[point.x]?.classList.remove("selection-cell");
    });
    selectionCells = [];
    if (!selectionStart || !selectionEnd) return;
    const rect = getSelectionCorner(selectionStart, selectionEnd);
    for (let y = rect.y; y < rect.y + rect.size; y++) {
      for (let x = rect.x; x < rect.x + rect.size; x++) {
        if (!isInBounds(x, y)) continue;
        selectionCells.push({ x, y });
        cellMatrix[y]?.[x]?.classList.add("selection-cell");
      }
    }
    selectionAnchorCell = { x: selectionStart.x, y: selectionStart.y };
    cellMatrix[selectionAnchorCell.y]?.[selectionAnchorCell.x]?.classList.add(
      "selection-anchor"
    );
    gridDiv.classList.add("selection-active");
  };

  const renderShiftSelection = () => {
    shiftSelectionCells.forEach((point) => {
      cellMatrix[point.y]?.[point.x]?.classList.remove("shift-selection-cell");
    });
    if (shiftSelectionAnchorCell) {
      cellMatrix[shiftSelectionAnchorCell.y]?.[shiftSelectionAnchorCell.x]?.classList.remove(
        "shift-selection-anchor"
      );
    }
    shiftSelectionCells = [];
    if (!shiftSelectionStart || !shiftSelectionEnd) return;
    const x1 = Math.min(shiftSelectionStart.x, shiftSelectionEnd.x);
    const y1 = Math.min(shiftSelectionStart.y, shiftSelectionEnd.y);
    const x2 = Math.max(shiftSelectionStart.x, shiftSelectionEnd.x);
    const y2 = Math.max(shiftSelectionStart.y, shiftSelectionEnd.y);
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (!isInBounds(x, y)) continue;
        shiftSelectionCells.push({ x, y });
        cellMatrix[y]?.[x]?.classList.add("shift-selection-cell");
      }
    }
    shiftSelectionAnchorCell = { x: shiftSelectionStart.x, y: shiftSelectionStart.y };
    cellMatrix[shiftSelectionAnchorCell.y]?.[shiftSelectionAnchorCell.x]?.classList.add(
      "shift-selection-anchor"
    );
    gridDiv.classList.add("shift-selection-active");
  };

  const getSelectedSquare = () => {
    if (!selectionStart || !selectionEnd) return null;
    const rect = getSelectionCorner(selectionStart, selectionEnd);
    if (rect.size <= 0) return null;
    if (rect.x + rect.size > tileWidth || rect.y + rect.size > tileHeight) return null;
    return rect;
  };

  const getShiftSelectionRect = () => {
    if (!shiftSelectionStart || !shiftSelectionEnd) return null;
    return {
      x1: Math.min(shiftSelectionStart.x, shiftSelectionEnd.x),
      y1: Math.min(shiftSelectionStart.y, shiftSelectionEnd.y),
      x2: Math.max(shiftSelectionStart.x, shiftSelectionEnd.x),
      y2: Math.max(shiftSelectionStart.y, shiftSelectionEnd.y),
    };
  };

  const shiftSelectedArea = (dx: number, dy: number) => {
    const rect = getShiftSelectionRect();
    if (!rect || shiftSelectionMode !== "partial") return false;
    const source = patternState.map((row) => row.slice());
    const next = patternState.map((row) => row.slice());
    const isInsideSelection = (x: number, y: number) =>
      x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
    const movingCells: Array<{ x: number; y: number }> = [];
    for (let y = rect.y1; y <= rect.y2; y++) {
      for (let x = rect.x1; x <= rect.x2; x++) {
        if (source[y]?.[x] === 1) movingCells.push({ x, y });
      }
    }
    if (!movingCells.length) return false;
    const movedTargets = movingCells
      .map((cell) => ({ x: cell.x + dx, y: cell.y + dy }))
      .filter((point) => isInBounds(point.x, point.y));
    if (!shiftOverwriteMode) {
      const blocked = movedTargets.some(
        (point) => !isInsideSelection(point.x, point.y) && source[point.y]?.[point.x] === 1
      );
      if (blocked) return false;
    }
    for (const cell of movingCells) {
      next[cell.y][cell.x] = 0;
    }
    for (const cell of movingCells) {
      const targetX = cell.x + dx;
      const targetY = cell.y + dy;
      if (!isInBounds(targetX, targetY)) continue;
      next[targetY][targetX] = 1;
    }
    patternState = next;
    shiftSelectionStart = shiftSelectionStart
      ? { x: shiftSelectionStart.x + dx, y: shiftSelectionStart.y + dy }
      : null;
    shiftSelectionEnd = shiftSelectionEnd
      ? { x: shiftSelectionEnd.x + dx, y: shiftSelectionEnd.y + dy }
      : null;
    applyPattern(patternState);
    renderShiftSelection();
    onPatternChange();
    return true;
  };

  const rotateSelection = (direction: "left" | "right") => {
    const rect = getSelectedSquare();
    if (!rect) return;
    const square = Array.from({ length: rect.size }, (_, y) =>
      Array.from({ length: rect.size }, (_, x) => patternState[rect.y + y][rect.x + x])
    );
    const rotated = Array.from({ length: rect.size }, () => new Array(rect.size).fill(0));
    for (let y = 0; y < rect.size; y++) {
      for (let x = 0; x < rect.size; x++) {
        if (direction === "right") {
          rotated[x][rect.size - 1 - y] = square[y][x];
        } else {
          rotated[rect.size - 1 - x][y] = square[y][x];
        }
      }
    }
    for (let y = 0; y < rect.size; y++) {
      for (let x = 0; x < rect.size; x++) {
        setCellActive(rect.x + x, rect.y + y, rotated[y][x] === 1);
      }
    }
    renderSelection();
    onPatternChange();
  };

  const setLineStart = (point: GridPoint | null) => {
    if (lineStart) {
      cellMatrix[lineStart.y]?.[lineStart.x]?.classList.remove("line-start");
    }
    lineStart = point;
    if (lineStart) {
      cellMatrix[lineStart.y]?.[lineStart.x]?.classList.add("line-start");
    }
  };

  const clearCirclePreview = () => {
    circlePreviewCells.forEach((point) =>
      cellMatrix[point.y]?.[point.x]?.classList.remove("circle-hover")
    );
    circlePreviewCells = [];
  };

  const previewCircle = (center: GridPoint, radius: number) => {
    clearCirclePreview();
    circlePreviewCells = getCircleCells(
      center,
      Math.max(0, radius),
      toolState.isCircleFilled(),
      tileWidth,
      tileHeight
    );
    circlePreviewCells.forEach((cell) =>
      cellMatrix[cell.y]?.[cell.x]?.classList.add("circle-hover")
    );
  };

  gridDiv.onmouseleave = clearCirclePreview;

  toolState.subscribeToToolChanges((tool) => {
    if (tool !== "line") setLineStart(null);
    if (tool !== "circle") clearCirclePreview();
    if (tool !== "select") {
      clearSelectionTimer();
      clearSelection();
    }
    if (tool !== "select" && !isShiftSelectEnabled) {
      clearShiftSelection();
    }
    if (tool !== "stamp") {
      clearStampSelection();
    }
  });

  const applyPattern = (nextPattern: number[][]) => {
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        setCellActive(x, y, nextPattern[y]?.[x] === 1);
      }
    }
  };

  const applyPatternTransform = (transform: (pattern: number[][]) => number[][]) => {
    setLineStart(null);
    clearCirclePreview();
    clearSelection();
    clearShiftSelection();
    clearStampSelection();
    applyPattern(transform(patternState));
    onPatternChange();
  };

  shiftLeftBtn.addEventListener("click", () => {
    if (isShiftSelectEnabled && shiftSelectionMode === "partial") {
      if (!shiftSelectedArea(-1, 0)) window.alert("No shift area selected or target area is occupied.");
      return;
    }
    applyPatternTransform(shiftPatternLeft);
  });

  shiftRightBtn.addEventListener("click", () => {
    if (isShiftSelectEnabled && shiftSelectionMode === "partial") {
      if (!shiftSelectedArea(1, 0)) window.alert("No shift area selected or target area is occupied.");
      return;
    }
    applyPatternTransform(shiftPatternRight);
  });

  shiftDownBtn.addEventListener("click", () => {
    if (isShiftSelectEnabled && shiftSelectionMode === "partial") {
      if (!shiftSelectedArea(0, 1)) window.alert("No shift area selected or target area is occupied.");
      return;
    }
    applyPatternTransform(shiftPatternDown);
  });

  shiftUpBtn.addEventListener("click", () => {
    if (isShiftSelectEnabled && shiftSelectionMode === "partial") {
      if (!shiftSelectedArea(0, -1)) window.alert("No shift area selected or target area is occupied.");
      return;
    }
    applyPatternTransform(shiftPatternUp);
  });

  invertBtn?.addEventListener("click", () => {
    applyPatternTransform(invertPattern);
  });

  rotateLeftBtn?.addEventListener("click", () => rotateSelection("left"));
  rotateRightBtn?.addEventListener("click", () => rotateSelection("right"));

  const startSelection = (x: number, y: number) => {
    clearSelectionTimer();
    clearSelection();
    selectionStart = { x, y };
    selectionEnd = { x, y };
    selectionTimeout = window.setTimeout(() => {
      isSelectionActive = true;
      renderSelection();
    }, selectionHoldDelay);
  };

  const startShiftSelection = (x: number, y: number) => {
    clearShiftSelection();
    shiftSelectionStart = { x, y };
    shiftSelectionEnd = { x, y };
    shiftSelectionActive = true;
    renderShiftSelection();
  };

  const startStampSelection = (x: number, y: number) => {
    clearStampSelection();
    addStampCircle({ x, y });
    stampSelectionLastPoint = { x, y };
  };

  const updateSelection = (x: number, y: number) => {
    if (!selectionStart) return;
    selectionEnd = { x, y };
    if (isSelectionActive) renderSelection();
  };

  const updateShiftSelection = (x: number, y: number) => {
    if (!shiftSelectionStart) return;
    shiftSelectionEnd = { x, y };
    if (shiftSelectionActive) renderShiftSelection();
  };

  const updateStampSelection = (x: number, y: number) => {
    if (!stampSelectionLastPoint) {
      startStampSelection(x, y);
      return;
    }
    addStampPath(stampSelectionLastPoint, { x, y });
    stampSelectionLastPoint = { x, y };
  };

  const getSelectionCorner = (start: GridPoint, end: GridPoint) => {
    const side = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    const x = end.x >= start.x ? start.x : start.x - side;
    const y = end.y >= start.y ? start.y : start.y - side;
    return {
      x: Math.max(0, Math.min(x, tileWidth - (side + 1))),
      y: Math.max(0, Math.min(y, tileHeight - (side + 1))),
      size: side + 1,
    };
  };

  const finishSelection = () => {
    clearSelectionTimer();
    if (!isSelectionActive) {
      clearSelection();
      return;
    }
    renderSelection();
  };

  const finishShiftSelection = () => {
    if (!shiftSelectionStart) return;
    if (!shiftSelectionActive) {
      clearShiftSelection();
      return;
    }
    renderShiftSelection();
  };

  document.body.addEventListener("mouseup", () => {
    isMouseDown = false;
    toggleState = null;
    if (isShiftSelectEnabled) {
      finishShiftSelection();
    } else if (toolState.getCurrentTool() === "select") {
      finishSelection();
    }
  });

  function getCurrentPattern(): number[][] {
    return patternState;
  }

  function generateGrid(pattern?: number[][]) {
    tileWidth = parseInt(tileWidthInput.value);
    tileHeight = parseInt(tileHeightInput.value);
    setLineStart(null);
    clearCirclePreview();
    clearSelection();
    clearShiftSelection();
    clearStampSelection();
    applyGridSizing();
    const basePattern = pattern ?? patternState;
    patternState = Array.from({ length: tileHeight }, (_, y) =>
      Array.from({ length: tileWidth }, (_, x) =>
        basePattern[y] && basePattern[y][x] === 1 ? 1 : 0
      )
    );

    const nextCellMatrix: HTMLDivElement[][] = Array.from(
      { length: tileHeight },
      () => []
    );

    for (let y = tileHeight; y < currentHeight; y++) {
      const row = cellMatrix[y];
      if (!row) continue;
      row.forEach((cell) => cell.remove());
    }

    for (let y = 0; y < Math.min(tileHeight, currentHeight); y++) {
      const row = cellMatrix[y];
      if (!row) continue;
      for (let x = tileWidth; x < currentWidth; x++) {
        row[x]?.remove();
      }
    }
    currentWidth = tileWidth;
    currentHeight = tileHeight;

    let lastCell: HTMLDivElement | undefined;
    let centerV: number[] = [];
    let centerH: number[] = [];
    if (guideState.isCenterEnabled()) {
      if (tileWidth % 2 === 0) {
        centerV = [Math.floor(tileWidth / 2)];
      } else {
        centerV = [(tileWidth - 1) / 2, (tileWidth - 1) / 2 + 1];
      }
      if (tileHeight % 2 === 0) {
        centerH = [Math.floor(tileHeight / 2)];
      } else {
        centerH = [(tileHeight - 1) / 2, (tileHeight - 1) / 2 + 1];
      }
    }

    const applyPenBrush = (cx: number, cy: number, activate: boolean) => {
      const size = toolState.getPenSize();
      const radius = Math.floor(size / 2);
      for (let by = cy - radius; by <= cy + radius; by++) {
        if (by < 0 || by >= tileHeight) continue;
        for (let bx = cx - radius; bx <= cx + radius; bx++) {
          if (bx < 0 || bx >= tileWidth) continue;
          setCellActive(bx, by, activate);
        }
      }
    };

    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        let cell: HTMLDivElement | null = cellMatrix[y]?.[x] ?? null;
        if (cell === null) {
          cell = document.createElement("div");
          cell.className = "cell";
          cell.dataset.x = x.toString();
          cell.dataset.y = y.toString();
        }
        if (lastCell !== undefined) {
          if (cell.previousSibling !== lastCell) {
            gridDiv.insertBefore(cell, lastCell.nextSibling);
          }
        } else if (!cell.parentElement) {
          gridDiv.appendChild(cell);
        }
        nextCellMatrix[y][x] = cell;
        lastCell = cell;

        cell.classList.remove("guide-v", "guide-h", "center-v", "center-h");
        cell.classList.remove("line-start", "circle-hover");
        cell.classList.remove("selection-cell");
        cell.classList.remove("selection-anchor");
        cell.classList.remove("stamp-selection-cell");
        cell.classList.remove("shift-selection-cell");
        cell.classList.remove("shift-selection-anchor");
        cell.classList.toggle("active", patternState[y][x] === 1);

        if (guideState.isBlackEnabled()) {
          if (x !== 0 && x % 5 === 0) cell.classList.add("guide-v");
          if (y !== 0 && y % 5 === 0) cell.classList.add("guide-h");
        }
        if (guideState.isCenterEnabled()) {
          if (centerV.indexOf(x) !== -1) cell.classList.add("center-v");
          if (centerH.indexOf(y) !== -1) cell.classList.add("center-h");
        }

        cell.onclick = () => {
          if (isShiftSelectEnabled) {
            return;
          }
          const tool = toolState.getCurrentTool();
          if (tool === "pen") {
            const shouldActivate = !isCellActive(x, y);
            applyPenBrush(x, y, shouldActivate);
          } else if (tool === "line") {
            if (!lineStart) {
              setLineStart({ x, y });
              return;
            }
            drawingTools?.drawLine(lineStart.x, lineStart.y, x, y);
            setLineStart(null);
          } else if (tool === "fill") {
            drawingTools?.floodFill(x, y);
          } else if (tool === "star") {
            const r = toolState.getStarRadius();
            drawingTools?.drawStar(x, y, r);
          } else if (tool === "circle") {
            clearCirclePreview();
            drawingTools?.drawCircle(
              x,
              y,
              toolState.getCircleRadius(),
              toolState.isCircleFilled()
            );
          } else if (tool === "stamp") {
            return;
          } else {
            return;
          }
          onPatternChange();
        };

        cell.onmouseover = () => {
          if (isShiftSelectEnabled) {
            if (isMouseDown) updateShiftSelection(x, y);
            return;
          }
          const tool = toolState.getCurrentTool();
          if (isMouseDown && tool === "pen") {
            if (toggleState === null) {
              toggleState = !isCellActive(x, y);
            }
            applyPenBrush(x, y, toggleState);
            onPatternChange();
          } else if (!isMouseDown && tool === "circle") {
            previewCircle({ x, y }, toolState.getCircleRadius());
          } else if (isMouseDown && tool === "select") {
            updateSelection(x, y);
          } else if (isMouseDown && isShiftSelectEnabled) {
            updateShiftSelection(x, y);
          } else if (isMouseDown && tool === "stamp") {
            updateStampSelection(x, y);
          }
        };

        cell.onmousedown = () => {
          if (isShiftSelectEnabled) {
            startShiftSelection(x, y);
          } else if (toolState.getCurrentTool() === "select") {
            startSelection(x, y);
          } else if (toolState.getCurrentTool() === "stamp") {
            startStampSelection(x, y);
          }
        };
        cell.onmouseup = () => {
          if (isShiftSelectEnabled) {
            finishShiftSelection();
          } else if (toolState.getCurrentTool() === "select") {
            finishSelection();
          } else if (toolState.getCurrentTool() === "stamp") {
            stampSelectionLastPoint = null;
          }
        };
      }
    }
    cellMatrix = nextCellMatrix;
    onPatternChange();
  }

  function clearGrid() {
    setLineStart(null);
    clearCirclePreview();
    clearSelection();
    clearShiftSelection();
    clearStampSelection();
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        setCellActive(x, y, false);
      }
    }
    onPatternChange();
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
    getStampSelection: () => stampSelectionCells,
    setShiftSelectionMode: (mode) => {
      shiftSelectionMode = mode;
      if (mode === "all") clearShiftSelection();
    },
    setShiftOverwriteMode: (overwrite) => {
      shiftOverwriteMode = overwrite;
    },
    enableShiftSelect: (enabled) => {
      isShiftSelectEnabled = enabled;
      if (!enabled) clearShiftSelection();
    },
    clearShiftSelect: () => {
      isShiftSelectEnabled = false;
      clearShiftSelection();
    },
  };
}
