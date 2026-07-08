import { getCircleCells } from "./circleGeometry.js";
import { invertPattern, rotateSelection, shiftPatternDown, shiftPatternLeft, shiftPatternRight, shiftPatternUp, shiftSelection, } from "./patternTransforms.js";
// ─── Implementation ───────────────────────────────────────────────────────────
export function createGridManager(options) {
    const { gridDiv, tileWidthInput, tileHeightInput, tileWidthValue, tileHeightValue, gridScaleInput, guideState, toolState, clipboard, drawingTools: initialDrawingTools, onPatternChange, } = options;
    // ── State ─────────────────────────────────────────────────────────────────
    let drawingTools = initialDrawingTools !== null && initialDrawingTools !== void 0 ? initialDrawingTools : null;
    let tileWidth = parseInt(tileWidthInput.value);
    let tileHeight = parseInt(tileHeightInput.value);
    let isMouseDown = false;
    let penToggleState = null;
    let currentHeight = 0;
    let currentWidth = 0;
    let patternState = [];
    let cellMatrix = [];
    // Circle preview
    let circlePreviewCells = [];
    // Star preview (dim overlay)
    let starPreviewCells = [];
    // Line start
    let lineStart = null;
    let linePreviews = [];
    // ── UNIFIED SELECTION ─────────────────────────────────────────────────────
    let activeSelection = new Set();
    // For Select Area tool: track drag rect
    let selectAreaStart = null;
    let selectAreaEnd = null;
    let selectAreaAdding = true; // true = add to sel, false = remove
    let selectAreaPreview = new Set(); // visual rect preview
    // Paste preview
    let pastePreviewCells = [];
    let pastePreviewOrigin = null;
    const baseCellSize = 20;
    // ── Helpers ───────────────────────────────────────────────────────────────
    const isInBounds = (x, y) => x >= 0 && y >= 0 && x < tileWidth && y < tileHeight;
    const key = (x, y) => `${x},${y}`;
    const getGridScale = () => {
        const s = gridScaleInput ? parseFloat(gridScaleInput.value) : 1;
        return Number.isFinite(s) && s > 0 ? s : 1;
    };
    const applyGridSizing = () => {
        const cellSize = baseCellSize * getGridScale();
        gridDiv.style.setProperty("--cell-size", `${cellSize}px`);
        gridDiv.style.gridTemplateColumns = `repeat(${tileWidth}, var(--cell-size))`;
    };
    const setCellActive = (x, y, active) => {
        var _a, _b;
        if (!isInBounds(x, y))
            return;
        patternState[y][x] = active ? 1 : 0;
        (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.toggle("active", active);
    };
    const isCellActive = (x, y) => isInBounds(x, y) && patternState[y][x] === 1;
    const setDrawingTools = (tools) => (drawingTools = tools);
    // ── Selection rendering ──────────────────────────────────────────────────
    const applySelectionClass = (sel, add) => {
        sel.forEach((k) => {
            var _a, _b;
            const [x, y] = k.split(",").map(Number);
            (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.toggle("selection-cell", add);
        });
    };
    const renderSelection = () => {
        var _a, _b;
        // Clear all selection classes first then re-apply current selection
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.remove("selection-cell", "select-area-preview");
            }
        }
        applySelectionClass(activeSelection, true);
        // show area preview
        selectAreaPreview.forEach((k) => {
            var _a, _b;
            const [x, y] = k.split(",").map(Number);
            (_b = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x]) === null || _b === void 0 ? void 0 : _b.classList.add("select-area-preview");
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
    const hasSelection = () => activeSelection.size > 0;
    // ── Area preview for Select Area tool ─────────────────────────────────────
    const buildRectSet = (start, end) => {
        const s = new Set();
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
        circlePreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("circle-hover"); });
        circlePreviewCells = [];
    };
    const previewCircle = (center, radius) => {
        clearCirclePreview();
        circlePreviewCells =
            radius === 0
                ? isInBounds(center.x, center.y)
                    ? [center]
                    : []
                : getCircleCells(center, Math.max(0, radius), false, tileWidth, tileHeight);
        circlePreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("circle-hover"); });
    };
    const clearStarPreview = () => {
        starPreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("star-hover"); });
        starPreviewCells = [];
    };
    // ── Line preview ──────────────────────────────────────────────────────────
    const clearLinePreview = () => {
        var _a, _b;
        linePreviews.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("line-hover"); });
        linePreviews = [];
        if (lineStart) {
            (_b = (_a = cellMatrix[lineStart.y]) === null || _a === void 0 ? void 0 : _a[lineStart.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("line-start");
        }
    };
    const setLineStart = (pt) => {
        var _a, _b;
        clearLinePreview();
        lineStart = pt;
        if (pt)
            (_b = (_a = cellMatrix[pt.y]) === null || _a === void 0 ? void 0 : _a[pt.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-start");
    };
    const previewLine = (x1, y1) => {
        var _a, _b;
        clearLinePreview();
        if (!lineStart)
            return;
        if (lineStart)
            (_b = (_a = cellMatrix[lineStart.y]) === null || _a === void 0 ? void 0 : _a[lineStart.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-start");
        // Bresenham
        let x0 = lineStart.x, y0 = lineStart.y;
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, e2;
        const pts = [];
        while (true) {
            if (isInBounds(x0, y0))
                pts.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1)
                break;
            e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
        linePreviews = pts;
        linePreviews.forEach((p) => {
            var _a, _b;
            if (p.x === lineStart.x && p.y === lineStart.y)
                return;
            (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-hover");
        });
    };
    // ── Paste preview ─────────────────────────────────────────────────────────
    const clearPastePreview = () => {
        pastePreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("paste-hover"); });
        pastePreviewCells = [];
        pastePreviewOrigin = null;
    };
    const showPastePreview = (anchorX, anchorY, entry) => {
        var _a, _b;
        clearPastePreview();
        pastePreviewOrigin = { ox: entry.originX, oy: entry.originY };
        const pts = [];
        for (const c of entry.cells) {
            if (!c.active)
                continue;
            const tx = anchorX + (c.x - entry.originX);
            const ty = anchorY + (c.y - entry.originY);
            if (isInBounds(tx, ty)) {
                pts.push({ x: tx, y: ty });
                (_b = (_a = cellMatrix[ty]) === null || _a === void 0 ? void 0 : _a[tx]) === null || _b === void 0 ? void 0 : _b.classList.add("paste-hover");
            }
        }
        pastePreviewCells = pts;
    };
    // ── Pencil brush ──────────────────────────────────────────────────────────
    const applyPencilBrush = (cx, cy, activate) => {
        const size = toolState.getPencilSize();
        const radius = Math.floor(size / 2);
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        for (let by = cy - radius; by <= cy + radius; by++) {
            for (let bx = cx - radius; bx <= cx + radius; bx++) {
                if (!isInBounds(bx, by))
                    continue;
                if (sel && !sel.has(key(bx, by)))
                    continue;
                setCellActive(bx, by, activate);
            }
        }
    };
    // ── Paste commit ──────────────────────────────────────────────────────────
    const paste = (anchorX, anchorY, clipboard) => {
        clearPastePreview();
        const entry = clipboard.paste();
        if (!entry)
            return;
        for (const c of entry.cells) {
            if (!c.active)
                continue;
            const tx = anchorX + (c.x - entry.originX);
            const ty = anchorY + (c.y - entry.originY);
            setCellActive(tx, ty, c.active);
        }
        clearSelection();
        onPatternChange();
    };
    // ── Cut ───────────────────────────────────────────────────────────────────
    const cutSelection = (clipboard) => {
        if (!hasSelection())
            return;
        copySelection(clipboard);
        activeSelection.forEach((k) => {
            const [x, y] = k.split(",").map(Number);
            setCellActive(x, y, false);
        });
        clearSelection();
        onPatternChange();
    };
    // ── Copy ──────────────────────────────────────────────────────────────────
    const copySelection = (clipboard) => {
        if (!hasSelection())
            return;
        // Compute bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        activeSelection.forEach((k) => {
            const [x, y] = k.split(",").map(Number);
            if (x < minX)
                minX = x;
            if (y < minY)
                minY = y;
            if (x > maxX)
                maxX = x;
            if (y > maxY)
                maxY = y;
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
        clearSelection();
    };
    // ── Invert ────────────────────────────────────────────────────────────────
    const invertGrid = () => {
        if (hasSelection()) {
            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.invertSelection(activeSelection);
        }
        else {
            applyPattern(invertPattern(patternState));
        }
        onPatternChange();
    };
    // ── Shift ─────────────────────────────────────────────────────────────────
    const shiftDir = (dx, dy) => {
        if (hasSelection()) {
            const { pattern: next, movedSelection } = shiftSelection(patternState, activeSelection, dx, dy);
            patternState = next;
            activeSelection = movedSelection;
            applyPattern(patternState);
            renderSelection();
        }
        else {
            if (dx === -1)
                applyPattern(shiftPatternLeft(patternState));
            else if (dx === 1)
                applyPattern(shiftPatternRight(patternState));
            else if (dy === 1)
                applyPattern(shiftPatternDown(patternState));
            else if (dy === -1)
                applyPattern(shiftPatternUp(patternState));
        }
        onPatternChange();
    };
    // ── Rotate ────────────────────────────────────────────────────────────────
    const rotateDir = (direction) => {
        if (!hasSelection())
            return;
        const { pattern: next, rotatedSelection } = rotateSelection(patternState, activeSelection, direction);
        patternState = next;
        activeSelection = rotatedSelection;
        applyPattern(patternState);
        renderSelection();
        onPatternChange();
    };
    // ── Pattern application ───────────────────────────────────────────────────
    const applyPattern = (next) => {
        var _a;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                setCellActive(x, y, ((_a = next[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1);
            }
        }
    };
    // ── Mouse & Key state ─────────────────────────────────────────────────────
    let isShiftDown = false;
    document.addEventListener("keydown", (e) => {
        if (e.key === "Shift")
            isShiftDown = true;
    });
    document.addEventListener("keyup", (e) => {
        if (e.key === "Shift") {
            isShiftDown = false;
            // if tool is overridden via shift, release drag
            if (selectAreaStart && !isMouseDown) {
                // handle release
            }
        }
    });
    document.body.addEventListener("mousedown", () => (isMouseDown = true));
    document.body.addEventListener("mouseup", () => {
        isMouseDown = false;
        penToggleState = null;
        // Commit Select Area drag
        if (toolState.getCurrentTool() === "selectArea" && selectAreaStart && selectAreaEnd) {
            const rect = buildRectSet(selectAreaStart, selectAreaEnd);
            if (selectAreaAdding) {
                rect.forEach((k) => activeSelection.add(k));
            }
            else {
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
        clearLinePreview();
        clearPastePreview();
    });
    // ── Grid generation ───────────────────────────────────────────────────────
    function generateGrid(pattern) {
        var _a, _b, _c, _d, _e, _f;
        tileWidth = parseInt(tileWidthInput.value);
        tileHeight = parseInt(tileHeightInput.value);
        setLineStart(null);
        clearCirclePreview();
        clearStarPreview();
        clearPastePreview();
        clearSelection();
        applyGridSizing();
        const base = pattern !== null && pattern !== void 0 ? pattern : patternState;
        patternState = Array.from({ length: tileHeight }, (_, y) => Array.from({ length: tileWidth }, (_, x) => { var _a; return ((_a = base[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1 ? 1 : 0; }));
        const nextMatrix = Array.from({ length: tileHeight }, () => []);
        // Remove extra rows
        for (let y = tileHeight; y < currentHeight; y++) {
            (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a.forEach((c) => c.remove());
        }
        // Remove extra cols from kept rows
        for (let y = 0; y < Math.min(tileHeight, currentHeight); y++) {
            for (let x = tileWidth; x < currentWidth; x++) {
                (_c = (_b = cellMatrix[y]) === null || _b === void 0 ? void 0 : _b[x]) === null || _c === void 0 ? void 0 : _c.remove();
            }
        }
        currentWidth = tileWidth;
        currentHeight = tileHeight;
        // Guide columns/rows
        let centerV = [];
        let centerH = [];
        if (guideState.isCenterEnabled()) {
            centerV = tileWidth % 2 === 0
                ? [tileWidth / 2]
                : [(tileWidth - 1) / 2, (tileWidth - 1) / 2 + 1];
            centerH = tileHeight % 2 === 0
                ? [tileHeight / 2]
                : [(tileHeight - 1) / 2, (tileHeight - 1) / 2 + 1];
        }
        let lastCell;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                let cell = (_e = (_d = cellMatrix[y]) === null || _d === void 0 ? void 0 : _d[x]) !== null && _e !== void 0 ? _e : document.createElement("div");
                if (!((_f = cellMatrix[y]) === null || _f === void 0 ? void 0 : _f[x])) {
                    cell.className = "cell";
                    cell.dataset.x = x.toString();
                    cell.dataset.y = y.toString();
                }
                // DOM position
                if (lastCell !== undefined) {
                    if (cell.previousSibling !== lastCell) {
                        gridDiv.insertBefore(cell, lastCell.nextSibling);
                    }
                }
                else if (!cell.parentElement) {
                    gridDiv.appendChild(cell);
                }
                nextMatrix[y][x] = cell;
                lastCell = cell;
                // Reset classes
                cell.className = "cell";
                cell.classList.toggle("active", patternState[y][x] === 1);
                if (guideState.isBlackEnabled()) {
                    if (x !== 0 && x % 5 === 0)
                        cell.classList.add("guide-v");
                    if (y !== 0 && y % 5 === 0)
                        cell.classList.add("guide-h");
                }
                if (guideState.isCenterEnabled()) {
                    if (centerV.indexOf(x) !== -1)
                        cell.classList.add("center-v");
                    if (centerH.indexOf(y) !== -1)
                        cell.classList.add("center-h");
                }
                // ── Event handlers ─────────────────────────────────────────────
                // Capture x/y in closure (re-assign to avoid stale capture issue)
                const cx = x, cy = y;
                cell.onmousedown = () => {
                    const actualTool = toolState.getCurrentTool();
                    const tool = isShiftDown ? "selectArea" : actualTool;
                    if (tool === "selectArea") {
                        selectAreaStart = { x: cx, y: cy };
                        selectAreaEnd = { x: cx, y: cy };
                        // If starting on a selected cell, we're removing
                        selectAreaAdding = !activeSelection.has(key(cx, cy));
                        selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
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
                    }
                    else if (tool === "line") {
                        if (!lineStart) {
                            setLineStart({ x: cx, y: cy });
                            return;
                        }
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawLine(lineStart.x, lineStart.y, cx, cy, sel);
                        setLineStart(null);
                        onPatternChange();
                    }
                    else if (tool === "fill") {
                        if (hasSelection()) {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.invertSelection(activeSelection);
                        }
                        else {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.floodFill(cx, cy, sel);
                        }
                        onPatternChange();
                    }
                    else if (tool === "shade") {
                        if (hasSelection()) {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.shadeSelection(activeSelection);
                        }
                        else {
                            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.floodShade(cx, cy, sel);
                        }
                        onPatternChange();
                    }
                    else if (tool === "shape") {
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawShape(toolState.getShapeType(), cx, cy, toolState.getShapeRadius(), sel);
                        clearStarPreview(); // using same dim overlay for shape if added later
                        onPatternChange();
                    }
                    else if (tool === "circle") {
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawCircle(cx, cy, toolState.getCircleRadius(), sel);
                        clearCirclePreview();
                        onPatternChange();
                    }
                    else if (tool === "paste") {
                        // paste handled in app.ts via clipboard
                    }
                };
                cell.onmouseover = () => {
                    const actualTool = toolState.getCurrentTool();
                    const tool = isShiftDown ? "selectArea" : actualTool;
                    const sel = activeSelection.size > 0 ? activeSelection : undefined;
                    if (tool === "selectArea" && isMouseDown && selectAreaStart) {
                        selectAreaEnd = { x: cx, y: cy };
                        selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
                        renderSelection();
                        return;
                    }
                    if (isMouseDown && tool === "pencil") {
                        if (penToggleState === null)
                            penToggleState = !isCellActive(cx, cy);
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
                    if (!isMouseDown && tool === "paste" && (clipboard === null || clipboard === void 0 ? void 0 : clipboard.hasContent())) {
                        const entry = clipboard.paste();
                        if (entry)
                            showPastePreview(cx, cy, entry);
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
    gridScaleInput === null || gridScaleInput === void 0 ? void 0 : gridScaleInput.addEventListener("change", applyGridSizing);
    // ── Tool change listener ──────────────────────────────────────────────────
    toolState.subscribeToToolChanges((tool) => {
        if (tool !== "line")
            setLineStart(null);
        if (tool !== "circle")
            clearCirclePreview();
        if (tool !== "shape")
            clearStarPreview();
        if (tool !== "paste")
            clearPastePreview();
        if (tool !== "selectArea") {
            selectAreaStart = null;
            selectAreaEnd = null;
            selectAreaPreview.clear();
        }
    });
    // ── Clear grid ────────────────────────────────────────────────────────────
    function clearGrid() {
        setLineStart(null);
        clearCirclePreview();
        clearStarPreview();
        clearPastePreview();
        if (hasSelection() && drawingTools) {
            drawingTools.clearSelection(activeSelection);
        }
        else {
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
