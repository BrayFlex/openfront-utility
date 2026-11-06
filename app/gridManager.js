import { getCircleCells } from "./circleGeometry.js";
import { getFillStyle } from "./fillStyles.js";
import { invertPattern, matchesSelectionColor, rotateSelection, shiftPatternDown, shiftPatternLeft, shiftPatternRight, shiftPatternUp, shiftSelection, flipSelectionH, flipSelectionV, } from "./patternTransforms.js";
// ─── Implementation ───────────────────────────────────────────────────────────
export function createGridManager(options) {
    const { gridDiv, tileWidthInput, tileHeightInput, tileWidthValue, tileHeightValue, gridScaleInput, guideState, toolState, clipboard, drawingTools: initialDrawingTools, fixedWidth, fixedHeight, onPatternChange, } = options;
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
    // Fill preview (which cells a fill would touch, and which it would ink)
    let fillPreviewCells = [];
    // Pencil preview (brush footprint under the cursor)
    let pencilPreviewCells = [];
    // Last cell touched by the current pencil stroke, used to fill in gaps when
    // the pointer moves quickly between cells.
    let lastPencilCell = null;
    // Line start
    let lineStart = null;
    let lineStartMarker = null;
    let linePreviews = [];
    let curveDraft = null;
    const LINE_BRUSH_TIP = "soft";
    // ── UNIFIED SELECTION ─────────────────────────────────────────────────────
    let activeSelection = new Set();
    // For Select Area tool: track a rectangle or freehand drag
    let selectAreaStart = null;
    let selectAreaEnd = null;
    let selectAreaAdding = true; // true = add to sel, false = remove
    let selectAreaPreview = new Set(); // visual selection preview
    let selectDragMode = null;
    // Ordered polygon vertices for a freehand lasso. The closing edge back to the
    // first point is implicit, so an unfinished loop still selects a closed area.
    let selectLassoPoints = [];
    // Paste preview
    let pastePreviewCells = [];
    let pastePreviewOrigin = null;
    const baseCellSize = 20;
    // The workspace is pannable while Space / Ctrl / ⌘ is held. While one of
    // those pan keys is down we suppress previews (and accidental drawing) so the
    // canvas stays clean during a pan gesture.
    const isPanKeyHeld = () => { var _a, _b; return (_b = (_a = gridDiv.closest(".canvas-workspace")) === null || _a === void 0 ? void 0 : _a.classList.contains("pan-key-held")) !== null && _b !== void 0 ? _b : false; };
    // ── Helpers ───────────────────────────────────────────────────────────────
    const isInBounds = (x, y) => x >= 0 && y >= 0 && x < tileWidth && y < tileHeight;
    const key = (x, y) => `${x},${y}`;
    const getGridScale = () => {
        const s = gridScaleInput ? parseFloat(gridScaleInput.value) : 1;
        return Number.isFinite(s) && s > 0 ? s : 1;
    };
    const applyGridSizing = () => {
        var _a;
        const cellSize = baseCellSize * getGridScale();
        gridDiv.style.setProperty("--cell-size", `${cellSize}px`);
        gridDiv.style.gridTemplateColumns = `repeat(${tileWidth}, var(--cell-size))`;
        // Keep the ruler frame tracks in sync with the cell size.
        (_a = gridDiv.parentElement) === null || _a === void 0 ? void 0 : _a.style.setProperty("--cell-size", `${cellSize}px`);
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
        gridDiv.classList.toggle("selection-remove", selectAreaPreview.size > 0 && !selectAreaAdding);
        gridDiv.classList.toggle("selection-active", activeSelection.size > 0);
    };
    const clearSelection = () => {
        activeSelection.clear();
        selectAreaStart = null;
        selectAreaEnd = null;
        selectAreaPreview.clear();
        selectDragMode = null;
        selectLassoPoints = [];
        renderSelection();
    };
    const restoreSelection = (selection) => {
        activeSelection = new Set();
        for (const cellKey of selection) {
            const [x, y] = cellKey.split(",").map(Number);
            if (!isInBounds(x, y))
                continue;
            // A restored cell may have changed colour through undo/redo; keep the
            // selection consistent with the current Select filter.
            if (!matchesSelectionColor(isCellActive(x, y), toolState.getSelectColor()))
                continue;
            activeSelection.add(cellKey);
        }
        selectAreaStart = null;
        selectAreaEnd = null;
        selectAreaPreview.clear();
        selectDragMode = null;
        selectLassoPoints = [];
        renderSelection();
    };
    const hasSelection = () => activeSelection.size > 0;
    const getSelectColor = () => toolState.getSelectColor();
    const getOverwriteColor = () => toolState.getOverwriteColor();
    const passesSelectFilter = (active) => matchesSelectionColor(active, getSelectColor());
    const passesOverwriteFilter = (active) => matchesSelectionColor(active, getOverwriteColor());
    const selectAll = () => {
        activeSelection = new Set();
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                // The Select filter decides which pixels may enter a selection.
                if (!passesSelectFilter(isCellActive(x, y)))
                    continue;
                activeSelection.add(key(x, y));
            }
        }
        renderSelection();
    };
    // ── Area preview for Select Area tool ─────────────────────────────────────
    const buildRectSet = (start, end) => {
        const s = new Set();
        const x1 = Math.max(0, Math.min(start.x, end.x));
        const y1 = Math.max(0, Math.min(start.y, end.y));
        const x2 = Math.min(tileWidth - 1, Math.max(start.x, end.x));
        const y2 = Math.min(tileHeight - 1, Math.max(start.y, end.y));
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                // The Select filter decides which pixels may enter a selection.
                if (!passesSelectFilter(isCellActive(x, y)))
                    continue;
                s.add(key(x, y));
            }
        }
        return s;
    };
    /**
     * Turn a freehand lasso outline into a filled selection. The path points are
     * treated as an implicitly closed polygon: every traced cell is included, and
     * a ray-cast fill adds the cells inside it. This means an unfinished loop
     * still selects the area it encloses.
     */
    const buildLassoSet = (points) => {
        const s = new Set();
        if (points.length === 0)
            return s;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const point of points) {
            if (isInBounds(point.x, point.y) &&
                passesSelectFilter(isCellActive(point.x, point.y))) {
                s.add(key(point.x, point.y));
            }
            if (point.x < minX)
                minX = point.x;
            if (point.y < minY)
                minY = point.y;
            if (point.x > maxX)
                maxX = point.x;
            if (point.y > maxY)
                maxY = point.y;
        }
        // A single point or a line has no interior; the traced cells are enough.
        if (points.length < 3)
            return s;
        minX = Math.max(0, minX);
        minY = Math.max(0, minY);
        maxX = Math.min(tileWidth - 1, maxX);
        maxY = Math.min(tileHeight - 1, maxY);
        const isInside = (x, y) => {
            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i].x;
                const yi = points[i].y;
                const xj = points[j].x;
                const yj = points[j].y;
                if (yi > y !== yj > y) {
                    const intersectionX = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
                    if (x < intersectionX)
                        inside = !inside;
                }
            }
            return inside;
        };
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (isInside(x, y) &&
                    passesSelectFilter(isCellActive(x, y))) {
                    s.add(key(x, y));
                }
            }
        }
        return s;
    };
    /** Object selection: every connected pixel of the same colour as the click. */
    const getConnectedRegion = (start) => {
        const targetActive = isCellActive(start.x, start.y);
        if (!matchesSelectionColor(targetActive, getSelectColor()))
            return [];
        const visited = new Set();
        const region = [];
        const stack = [Object.assign({}, start)];
        while (stack.length) {
            const point = stack.pop();
            if (!isInBounds(point.x, point.y))
                continue;
            const cellKey = key(point.x, point.y);
            if (visited.has(cellKey))
                continue;
            if (isCellActive(point.x, point.y) !== targetActive)
                continue;
            visited.add(cellKey);
            region.push(cellKey);
            stack.push({ x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y }, { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 });
        }
        return region;
    };
    /** Cells along a freehand lasso segment, including gaps on fast drags. */
    const getLassoPath = (from, to) => {
        var _a;
        const cells = (_a = drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.getLineCells(from.x, from.y, to.x, to.y, 1, "sharp")) !== null && _a !== void 0 ? _a : [];
        return cells.length > 0 ? cells : [to];
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
    const previewShape = (type, center, size, ratio) => {
        clearStarPreview();
        if (!drawingTools)
            return;
        const pts = drawingTools.getShapeCells(type, center.x, center.y, size, ratio, activeSelection.size > 0 ? activeSelection : undefined);
        // Deduplicate and filter bounds
        const unique = new Set();
        pts.forEach(p => {
            if (isInBounds(p.x, p.y))
                unique.add(`${p.x},${p.y}`);
        });
        starPreviewCells = Array.from(unique).map(k => {
            const [x, y] = k.split(',').map(Number);
            return { x, y };
        });
        starPreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("star-hover"); });
    };
    // ── Fill preview ──────────────────────────────────────────────────────────
    const clearFillPreview = () => {
        fillPreviewCells.forEach((p) => {
            var _a, _b;
            (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("fill-hover", "fill-hover-mark");
        });
        fillPreviewCells = [];
    };
    const previewFill = (pt) => {
        clearFillPreview();
        if (!drawingTools)
            return;
        const targets = drawingTools.getFillTargets(pt.x, pt.y, getFillStyle(toolState.getFillStyle()), activeSelection.size > 0 ? activeSelection : undefined);
        fillPreviewCells = targets.filter((p) => isInBounds(p.x, p.y));
        fillPreviewCells.forEach((p) => {
            var _a, _b;
            (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add(p.active ? "fill-hover-mark" : "fill-hover");
        });
    };
    // ── Pencil preview ────────────────────────────────────────────────────────
    const getPencilCells = (cx, cy) => {
        var _a;
        return (_a = drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.getBrushCells(cx, cy, toolState.getPencilSize(), toolState.getPencilTip())) !== null && _a !== void 0 ? _a : [];
    };
    const clearPencilPreview = () => {
        pencilPreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("pencil-hover"); });
        pencilPreviewCells = [];
    };
    const previewPencil = (pt) => {
        clearPencilPreview();
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        pencilPreviewCells = getPencilCells(pt.x, pt.y).filter((p) => isInBounds(p.x, p.y) && (!sel || sel.has(key(p.x, p.y))));
        pencilPreviewCells.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("pencil-hover"); });
    };
    // ── Line preview ──────────────────────────────────────────────────────────
    const markLineStart = (pt) => {
        var _a, _b;
        lineStartMarker = pt;
        (_b = (_a = cellMatrix[pt.y]) === null || _a === void 0 ? void 0 : _a[pt.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-start");
    };
    const clearLinePreview = () => {
        var _a, _b;
        linePreviews.forEach((p) => { var _a, _b; return (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("line-hover"); });
        linePreviews = [];
        if (lineStartMarker) {
            (_b = (_a = cellMatrix[lineStartMarker.y]) === null || _a === void 0 ? void 0 : _a[lineStartMarker.x]) === null || _b === void 0 ? void 0 : _b.classList.remove("line-start");
        }
        lineStartMarker = null;
    };
    const setLineStart = (pt) => {
        clearLinePreview();
        lineStart = pt;
        if (pt)
            markLineStart(pt);
    };
    const renderLineCells = (cells, start) => {
        linePreviews = cells.filter((p) => isInBounds(p.x, p.y));
        markLineStart(start);
        linePreviews.forEach((p) => {
            var _a, _b;
            if (p.x === start.x && p.y === start.y)
                return;
            (_b = (_a = cellMatrix[p.y]) === null || _a === void 0 ? void 0 : _a[p.x]) === null || _b === void 0 ? void 0 : _b.classList.add("line-hover");
        });
    };
    const previewLine = (x1, y1) => {
        var _a;
        clearLinePreview();
        if (!lineStart)
            return;
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        const cells = (_a = drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.getLineCells(lineStart.x, lineStart.y, x1, y1, toolState.getLineSize(), LINE_BRUSH_TIP, sel)) !== null && _a !== void 0 ? _a : [{ x: lineStart.x, y: lineStart.y }, { x: x1, y: y1 }];
        renderLineCells(cells, lineStart);
    };
    // ── Curved line draft ─────────────────────────────────────────────────────
    const previewCurve = () => {
        var _a;
        clearLinePreview();
        if (!curveDraft)
            return;
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        const cells = (_a = drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.getCurveCells(curveDraft.start.x, curveDraft.start.y, curveDraft.control.x, curveDraft.control.y, curveDraft.end.x, curveDraft.end.y, toolState.getLineSize(), LINE_BRUSH_TIP, sel)) !== null && _a !== void 0 ? _a : [];
        renderLineCells(cells, curveDraft.start);
    };
    const beginCurveDraft = (start, end) => {
        clearLinePreview();
        lineStart = null;
        curveDraft = {
            start: Object.assign({}, start),
            end: Object.assign({}, end),
            control: {
                x: Math.round((start.x + end.x) / 2),
                y: Math.round((start.y + end.y) / 2),
            },
        };
        previewCurve();
    };
    const updateCurveControl = (pt) => {
        if (!curveDraft)
            return;
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
        if (hadDraft)
            clearLinePreview();
    };
    const commitCurveDraft = () => {
        if (!curveDraft || !drawingTools)
            return;
        const draft = curveDraft;
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        drawingTools.drawCurve(draft.start.x, draft.start.y, draft.control.x, draft.control.y, draft.end.x, draft.end.y, sel, toolState.getLineSize(), LINE_BRUSH_TIP);
        clearCurveDraft();
        onPatternChange();
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
        // Center the paste on the cursor cell
        const halfW = Math.floor(entry.width / 2);
        const halfH = Math.floor(entry.height / 2);
        const pts = [];
        for (const c of entry.cells) {
            const tx = anchorX + (c.x - entry.originX) - halfW;
            const ty = anchorY + (c.y - entry.originY) - halfH;
            if (!isInBounds(tx, ty))
                continue;
            if (activeSelection.size > 0 && !activeSelection.has(key(tx, ty)))
                continue;
            if (!passesOverwriteFilter(isCellActive(tx, ty)))
                continue;
            pts.push({ x: tx, y: ty });
            (_b = (_a = cellMatrix[ty]) === null || _a === void 0 ? void 0 : _a[tx]) === null || _b === void 0 ? void 0 : _b.classList.add("paste-hover");
        }
        pastePreviewCells = pts;
    };
    // ── Pencil brush ──────────────────────────────────────────────────────────
    const applyPencilBrush = (cx, cy, activate) => {
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        for (const p of getPencilCells(cx, cy)) {
            if (!isInBounds(p.x, p.y))
                continue;
            if (sel && !sel.has(key(p.x, p.y)))
                continue;
            setCellActive(p.x, p.y, activate);
        }
        lastPencilCell = { x: cx, y: cy };
    };
    /**
     * Continue a pencil stroke from the last touched cell to the new one. Using
     * the drawing tool's line helper stamps the brush along every skipped cell,
     * so fast drags stay continuous instead of leaving dotted gaps.
     */
    const continuePencilStroke = (cx, cy, activate) => {
        const sel = activeSelection.size > 0 ? activeSelection : undefined;
        const size = toolState.getPencilSize();
        const tip = toolState.getPencilTip();
        if (lastPencilCell && (lastPencilCell.x !== cx || lastPencilCell.y !== cy)) {
            drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawLine(lastPencilCell.x, lastPencilCell.y, cx, cy, sel, size, tip, activate);
            lastPencilCell = { x: cx, y: cy };
            return;
        }
        applyPencilBrush(cx, cy, activate);
    };
    // ── Paste commit ──────────────────────────────────────────────────────────
    const paste = (anchorX, anchorY, clipboard) => {
        clearPastePreview();
        const entry = clipboard.paste();
        if (!entry)
            return;
        // Center on the anchor cell
        const halfW = Math.floor(entry.width / 2);
        const halfH = Math.floor(entry.height / 2);
        for (const c of entry.cells) {
            const tx = anchorX + (c.x - entry.originX) - halfW;
            const ty = anchorY + (c.y - entry.originY) - halfH;
            // Respect active selection boundary if one exists
            if (activeSelection.size > 0 && !activeSelection.has(key(tx, ty)))
                continue;
            // The Overwrite filter decides which destination pixels can be replaced.
            if (!passesOverwriteFilter(isCellActive(tx, ty)))
                continue;
            setCellActive(tx, ty, c.active);
        }
        onPatternChange();
    };
    // ── Cut ───────────────────────────────────────────────────────────────────
    const cutSelection = (clipboard) => {
        if (!hasSelection())
            return;
        // Snapshot the cells that should be erased before copySelection clears the
        // selection. The Select and Overwrite filters both apply to clearing.
        const toErase = [];
        activeSelection.forEach((k) => {
            const [x, y] = k.split(",").map(Number);
            const active = isCellActive(x, y);
            if (passesSelectFilter(active) && passesOverwriteFilter(active)) {
                toErase.push(k);
            }
        });
        copySelection(clipboard); // internally calls clearSelection()
        toErase.forEach((k) => {
            const [x, y] = k.split(",").map(Number);
            setCellActive(x, y, false);
        });
        onPatternChange();
    };
    // ── Copy ──────────────────────────────────────────────────────────────────
    const copySelection = (clipboard) => {
        if (!hasSelection())
            return;
        // Only pixels passing the Select filter are copied.
        const cells = Array.from(activeSelection)
            .map((k) => {
            const [x, y] = k.split(",").map(Number);
            return { x, y, active: isCellActive(x, y) };
        })
            .filter((cell) => passesSelectFilter(cell.active));
        if (cells.length === 0)
            return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const cell of cells) {
            if (cell.x < minX)
                minX = cell.x;
            if (cell.y < minY)
                minY = cell.y;
            if (cell.x > maxX)
                maxX = cell.x;
            if (cell.y > maxY)
                maxY = cell.y;
        }
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
            // Select filters which pixels are read; Overwrite filters which of those
            // pixels may be changed.
            activeSelection.forEach((k) => {
                const [x, y] = k.split(",").map(Number);
                const active = isCellActive(x, y);
                if (!passesSelectFilter(active) || !passesOverwriteFilter(active))
                    return;
                setCellActive(x, y, !active);
            });
        }
        else {
            applyPattern(invertPattern(patternState));
        }
        onPatternChange();
    };
    // ── Invert Selection ─────────────────────────────────────────────────────
    // Toggles which cells are selected: everything not selected becomes selected.
    // Cells that fail the Select filter can never enter the selection, so they
    // are skipped when building the inverted set.
    const invertSelection = () => {
        const newSel = new Set();
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                if (activeSelection.has(key(x, y)))
                    continue;
                if (!passesSelectFilter(isCellActive(x, y)))
                    continue;
                newSel.add(key(x, y));
            }
        }
        activeSelection = newSel;
        renderSelection();
    };
    // ── Shift ─────────────────────────────────────────────────────────────────
    const shiftDir = (dx, dy) => {
        if (hasSelection()) {
            const { pattern: next, movedSelection } = shiftSelection(patternState, activeSelection, dx, dy, getSelectColor(), getOverwriteColor());
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
        const { pattern: next, rotatedSelection } = rotateSelection(patternState, activeSelection, direction, getSelectColor(), getOverwriteColor());
        patternState = next;
        activeSelection = rotatedSelection;
        applyPattern(patternState);
        renderSelection();
        onPatternChange();
    };
    // ── Flip ──────────────────────────────────────────────────────────────────
    const flipDir = (direction) => {
        if (!hasSelection())
            return;
        const { pattern: next, flippedSelection } = direction === "h"
            ? flipSelectionH(patternState, activeSelection, getSelectColor(), getOverwriteColor())
            : flipSelectionV(patternState, activeSelection, getSelectColor(), getOverwriteColor());
        patternState = next;
        activeSelection = flippedSelection;
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
    let isAltDown = false;
    // Button element for the selectArea tool — used for unified shift highlight
    const selectAreaBtn = document.getElementById("tool-selectArea");
    /**
     * Shift+Alt always means freehand lasso. With the Select tool active the
     * options-strip mode is used; otherwise holding Shift falls back to the
     * regular rectangular marquee.
     */
    const resolveSelectMode = () => {
        if (isShiftDown && isAltDown)
            return "lasso";
        // Holding Shift temporarily overrides Object mode with a regular marquee,
        // so quick Shift / Shift+Alt selections still work while Object is active.
        if (isShiftDown && toolState.getSelectMode() === "object")
            return "regular";
        if (toolState.getCurrentTool() === "selectArea")
            return toolState.getSelectMode();
        return "regular";
    };
    const isSelectionGesture = () => isShiftDown || toolState.getCurrentTool() === "selectArea";
    const updateSelectCursor = () => {
        const showSelectCursor = isSelectionGesture();
        gridDiv.classList.toggle("select-mode", showSelectCursor);
        if (showSelectCursor) {
            // Selection gestures take over the pointer, so drop any drawing preview
            // that was left over from the previous tool or Shift state.
            clearCirclePreview();
            clearStarPreview();
            clearFillPreview();
            clearPencilPreview();
            clearPastePreview();
            clearLinePreview();
            selectAreaBtn === null || selectAreaBtn === void 0 ? void 0 : selectAreaBtn.classList.add("selected");
        }
        else {
            selectAreaBtn === null || selectAreaBtn === void 0 ? void 0 : selectAreaBtn.classList.remove("selected");
        }
    };
    document.addEventListener("keydown", (e) => {
        if (e.key === "Shift") {
            isShiftDown = true;
            updateSelectCursor();
        }
        else if (e.key === "Alt") {
            isAltDown = true;
        }
    });
    document.addEventListener("keyup", (e) => {
        if (e.key === "Shift") {
            isShiftDown = false;
            updateSelectCursor();
        }
        else if (e.key === "Alt") {
            isAltDown = false;
        }
    });
    window.addEventListener("blur", () => {
        isShiftDown = false;
        isAltDown = false;
        updateSelectCursor();
    });
    if (!isSelectionGesture())
        selectAreaBtn === null || selectAreaBtn === void 0 ? void 0 : selectAreaBtn.classList.remove("selected");
    document.body.addEventListener("mousedown", () => (isMouseDown = true));
    document.body.addEventListener("mouseup", () => {
        isMouseDown = false;
        penToggleState = null;
        lastPencilCell = null;
        // Commit a rectangle or lasso drag regardless of the current tool, since
        // Shift / Shift+Alt can start one from any tool.
        if (selectDragMode) {
            if (selectAreaAdding) {
                selectAreaPreview.forEach((k) => activeSelection.add(k));
            }
            else {
                selectAreaPreview.forEach((k) => activeSelection.delete(k));
            }
            selectAreaStart = null;
            selectAreaEnd = null;
            selectDragMode = null;
            selectLassoPoints = [];
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
        if (!curveDraft)
            clearLinePreview();
        clearPastePreview();
    });
    // ── Guides: center overlay + outside rulers ───────────────────────────────
    const updateCenterOverlay = () => {
        let centerCross = gridDiv.querySelector('.center-cross-overlay');
        if (!centerCross) {
            centerCross = document.createElement("div");
            centerCross.className = "center-cross-overlay";
            gridDiv.appendChild(centerCross);
        }
        if (guideState.isCenterEnabled()) {
            centerCross.style.display = "block";
            centerCross.style.top = "50%";
            centerCross.style.left = "50%";
        }
        else {
            centerCross.style.display = "none";
        }
    };
    // Ruler ticks + labels on the outside of the drawable grid. Top/left rulers
    // mark every grid line (numbered every 5). Center ticks render on all four
    // sides when the center guide is enabled — and show even without the ruler.
    const renderRulers = () => {
        const frame = gridDiv.parentElement;
        if (!frame)
            return;
        const topRuler = frame.querySelector(".grid-ruler-top");
        const bottomRuler = frame.querySelector(".grid-ruler-bottom");
        const leftRuler = frame.querySelector(".grid-ruler-left");
        const rightRuler = frame.querySelector(".grid-ruler-right");
        if (!topRuler || !bottomRuler || !leftRuler || !rightRuler)
            return;
        const rulerEnabled = guideState.isRulerEnabled();
        const centerEnabled = guideState.isCenterEnabled();
        // Keep the ruler strips visible if either the ruler or the center ticks are shown
        frame.classList.toggle("ruler-off", !rulerEnabled && !centerEnabled);
        // With center ticks only, the strips are a transparent overlay so they do
        // not hide the workspace/ghost tiling around the canvas.
        frame.classList.toggle("center-only", centerEnabled && !rulerEnabled);
        [topRuler, bottomRuler, leftRuler, rightRuler].forEach((r) => r.replaceChildren());
        // Nothing to render when both toggles are off
        if (!rulerEnabled && !centerEnabled)
            return;
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
                    }
                    else {
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
                    }
                    else {
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
            const addCenterTick = (ruler, vertical, pos) => {
                const tick = document.createElement("div");
                tick.className = "grid-ruler-tick grid-ruler-tick-center";
                if (vertical) {
                    tick.style.left = `${pos}px`;
                    tick.style.top = "0";
                    tick.style.height = "100%";
                    tick.style.width = "2px";
                }
                else {
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
        var _a;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                const cell = (_a = cellMatrix[y]) === null || _a === void 0 ? void 0 : _a[x];
                if (!cell)
                    continue;
                cell.classList.remove("guide-v", "guide-h");
                if (guideState.isBlackEnabled()) {
                    if (x !== 0 && x % 5 === 0)
                        cell.classList.add("guide-v");
                    if (y !== 0 && y % 5 === 0)
                        cell.classList.add("guide-h");
                }
            }
        }
        updateCenterOverlay();
        renderRulers();
    };
    // ── Grid generation ───────────────────────────────────────────────────────
    function generateGrid(pattern) {
        var _a, _b, _c, _d, _e, _f;
        tileWidth = fixedWidth !== null && fixedWidth !== void 0 ? fixedWidth : parseInt(tileWidthInput.value);
        tileHeight = fixedHeight !== null && fixedHeight !== void 0 ? fixedHeight : parseInt(tileHeightInput.value);
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
        updateCenterOverlay();
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
                // ── Event handlers ─────────────────────────────────────────────
                // Capture x/y in closure (re-assign to avoid stale capture issue)
                const cx = x, cy = y;
                cell.onmousedown = () => {
                    if (isPanKeyHeld())
                        return;
                    const tool = toolState.getCurrentTool();
                    if (isSelectionGesture()) {
                        const mode = resolveSelectMode();
                        // If starting on a selected cell, the gesture removes instead of adds.
                        selectAreaAdding = !activeSelection.has(key(cx, cy));
                        if (mode === "object") {
                            const region = getConnectedRegion({ x: cx, y: cy });
                            region.forEach((k) => selectAreaAdding ? activeSelection.add(k) : activeSelection.delete(k));
                            if (region.length > 0)
                                renderSelection();
                            return;
                        }
                        selectAreaStart = { x: cx, y: cy };
                        selectAreaEnd = { x: cx, y: cy };
                        selectDragMode = mode === "lasso" ? "lasso" : "rect";
                        if (selectDragMode === "lasso") {
                            selectLassoPoints = [{ x: cx, y: cy }];
                            selectAreaPreview = buildLassoSet(selectLassoPoints);
                        }
                        else {
                            selectLassoPoints = [];
                            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
                        }
                        renderSelection();
                        return;
                    }
                    // While a curved line is being edited, moving the pointer bends the
                    // curve. The click that follows solidifies it.
                    if (tool === "line" && curveDraft) {
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
                    if (isPanKeyHeld())
                        return;
                    // Selection gestures are handled on mouse-down, so never draw here.
                    if (isSelectionGesture())
                        return;
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
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawLine(lineStart.x, lineStart.y, cx, cy, sel, toolState.getLineSize(), LINE_BRUSH_TIP);
                        setLineStart(null);
                        onPatternChange();
                    }
                    else if (tool === "fill") {
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.fillWithStyle(cx, cy, getFillStyle(toolState.getFillStyle()), sel);
                        clearFillPreview();
                        onPatternChange();
                    }
                    else if (tool === "shape") {
                        drawingTools === null || drawingTools === void 0 ? void 0 : drawingTools.drawShape(toolState.getShapeType(), cx, cy, toolState.getShapeSize(), toolState.getShapeRatio(), sel);
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
                    if (isPanKeyHeld())
                        return;
                    const tool = toolState.getCurrentTool();
                    const sel = activeSelection.size > 0 ? activeSelection : undefined;
                    if (isMouseDown && selectDragMode && selectAreaStart) {
                        selectAreaEnd = { x: cx, y: cy };
                        if (selectDragMode === "lasso") {
                            // Add every cell along the drag path (so fast strokes stay
                            // continuous), then re-fill the implicitly closed polygon.
                            const last = selectLassoPoints[selectLassoPoints.length - 1];
                            if (last) {
                                getLassoPath(last, { x: cx, y: cy }).forEach((point, index) => {
                                    if (index === 0 && point.x === last.x && point.y === last.y)
                                        return;
                                    const previous = selectLassoPoints[selectLassoPoints.length - 1];
                                    if (previous && previous.x === point.x && previous.y === point.y)
                                        return;
                                    selectLassoPoints.push({ x: point.x, y: point.y });
                                });
                            }
                            else {
                                selectLassoPoints.push({ x: cx, y: cy });
                            }
                            selectAreaPreview = buildLassoSet(selectLassoPoints);
                        }
                        else {
                            selectAreaPreview = buildRectSet(selectAreaStart, selectAreaEnd);
                        }
                        renderSelection();
                        return;
                    }
                    // While a selection gesture is active, never show drawing previews.
                    if (isSelectionGesture())
                        return;
                    if (tool === "line" && curveDraft) {
                        updateCurveControl({ x: cx, y: cy });
                        return;
                    }
                    if (isMouseDown && tool === "pencil") {
                        if (penToggleState === null)
                            penToggleState = !isCellActive(cx, cy);
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
                        previewShape(toolState.getShapeType(), { x: cx, y: cy }, toolState.getShapeSize(), toolState.getShapeRatio());
                        return;
                    }
                    if (tool === "line" && lineStart) {
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
        renderRulers();
        onPatternChange();
    }
    // ── Input listeners ───────────────────────────────────────────────────────
    tileWidthInput.addEventListener("input", () => {
        if (fixedWidth !== undefined)
            return;
        tileWidthValue.value = tileWidthInput.value;
        generateGrid();
    });
    tileHeightInput.addEventListener("input", () => {
        if (fixedHeight !== undefined)
            return;
        tileHeightValue.value = tileHeightInput.value;
        generateGrid();
    });
    tileWidthValue.addEventListener("change", () => {
        if (fixedWidth !== undefined)
            return;
        tileWidthInput.value = tileWidthValue.value;
        generateGrid();
    });
    tileHeightValue.addEventListener("change", () => {
        if (fixedHeight !== undefined)
            return;
        tileHeightInput.value = tileHeightValue.value;
        generateGrid();
    });
    gridScaleInput === null || gridScaleInput === void 0 ? void 0 : gridScaleInput.addEventListener("change", applyGridSizing);
    // ── Tool change listener ──────────────────────────────────────────────────
    toolState.subscribeToToolChanges((tool) => {
        if (tool !== "line") {
            setLineStart(null);
            clearCurveDraft();
        }
        if (tool !== "circle")
            clearCirclePreview();
        if (tool !== "shape")
            clearStarPreview();
        if (tool !== "fill")
            clearFillPreview();
        if (tool !== "pencil")
            clearPencilPreview();
        if (tool !== "paste")
            clearPastePreview();
        if (tool !== "selectArea") {
            selectAreaStart = null;
            selectAreaEnd = null;
            selectAreaPreview.clear();
            selectDragMode = null;
            selectLassoPoints = [];
        }
        // Sync select-mode cursor class and toolbar highlight with tool state
        updateSelectCursor();
    });
    toolState.subscribeToLineChanges(() => {
        if (toolState.getLineMode() !== "curve")
            clearCurveDraft();
    });
    toolState.subscribeToPencilChanges(() => {
        clearPencilPreview();
    });
    toolState.subscribeToSelectChanges(() => {
        // Keep the selection consistent with the Select filter: switching to Black
        // or White must not leave opposite-coloured cells selected.
        const filtered = new Set();
        activeSelection.forEach((k) => {
            const [x, y] = k.split(",").map(Number);
            if (passesSelectFilter(isCellActive(x, y)))
                filtered.add(k);
        });
        activeSelection = filtered;
        // Mid-drag mode switches should not leave stale lasso state behind.
        selectDragMode = null;
        selectLassoPoints = [];
        selectAreaPreview.clear();
        renderSelection();
        updateSelectCursor();
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
        if (hasSelection()) {
            // Clear obeys both filters: a cell is only erased when its current
            // colour passes Select and may be replaced under Overwrite.
            activeSelection.forEach((k) => {
                const [x, y] = k.split(",").map(Number);
                const active = isCellActive(x, y);
                if (!passesSelectFilter(active) || !passesOverwriteFilter(active))
                    return;
                setCellActive(x, y, false);
            });
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
        selectAll,
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
