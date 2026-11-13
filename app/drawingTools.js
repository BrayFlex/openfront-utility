import { getCircleCells, getCircleCellsBySize } from "./circleGeometry.js";
function isInSelection(x, y, selection) {
    if (!selection || selection.size === 0)
        return true;
    return selection.has(`${x},${y}`);
}
export function createDrawingTools(options) {
    const { getTileWidth, getTileHeight, isCellActive, setCellActive } = options;
    // Allow intercepting setIfAllowed for previews
    let currentSetCellActive = setCellActive;
    // Shapes tile across the canvas seams: a shape that crosses an edge continues
    // on the opposite side. Set only while a shape is being drawn so the pencil,
    // line and other tools keep their existing edge behaviour.
    let wrapShapeEdits = false;
    const wrapIndex = (value, size) => {
        if (size <= 0)
            return value;
        return ((value % size) + size) % size;
    };
    function setIfAllowed(x, y, active, selection) {
        if (wrapShapeEdits) {
            x = wrapIndex(x, getTileWidth());
            y = wrapIndex(y, getTileHeight());
        }
        if (!isInSelection(x, y, selection))
            return;
        currentSetCellActive(x, y, active);
    }
    /**
     * Footprint of one brush stamp, as offsets from the stamp centre. Size 1 is
     * always a single pixel. Sharp tips are square (matching the long-standing
     * pencil behaviour), soft tips are a filled circle. Computed once per stroke
     * so stamping a line doesn't rebuild the footprint at every step.
     */
    function getBrushOffsets(size, tip) {
        const offsets = [];
        if (size <= 1) {
            offsets.push({ x: 0, y: 0 });
            return offsets;
        }
        // Keep the footprint exactly `size` cells wide/tall. Using a radius alone
        // made even sizes one cell larger than requested (4 -> 5x5).
        const start = -Math.floor(size / 2);
        const end = start + size - 1;
        if (tip === "soft") {
            // Circle inscribed in the size x size box. For even sizes the box has no
            // single centre cell, so measure from its true centre.
            const centre = start + (size - 1) / 2;
            const limit = (size / 2) * (size / 2);
            for (let dy = start; dy <= end; dy++) {
                for (let dx = start; dx <= end; dx++) {
                    const ox = dx - centre;
                    const oy = dy - centre;
                    if (ox * ox + oy * oy <= limit)
                        offsets.push({ x: dx, y: dy });
                }
            }
            return offsets;
        }
        for (let dy = start; dy <= end; dy++) {
            for (let dx = start; dx <= end; dx++) {
                offsets.push({ x: dx, y: dy });
            }
        }
        return offsets;
    }
    function getBrushCells(cx, cy, size, tip) {
        return getBrushOffsets(size, tip).map((o) => ({ x: cx + o.x, y: cy + o.y }));
    }
    /** Stamp the brush at every step along a Bresenham line. */
    function stampLine(x0, y0, x1, y1, selection, size, tip, active = true) {
        const offsets = getBrushOffsets(size, tip);
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, e2;
        while (true) {
            for (const o of offsets) {
                setIfAllowed(x0 + o.x, y0 + o.y, active, selection);
            }
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
    }
    /** Bresenham line with an optional thickness (thickness 1 = old behaviour). */
    function drawLine(x0, y0, x1, y1, selection, size = 1, tip = "sharp", active = true) {
        stampLine(x0, y0, x1, y1, selection, size, tip, active);
    }
    /** Rounded sample points along a quadratic Bézier curve. */
    function sampleQuadratic(x0, y0, cx, cy, x1, y1) {
        const polygonLength = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
        const steps = Math.max(2, Math.ceil(polygonLength * 1.5));
        const points = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const mt = 1 - t;
            points.push({
                x: Math.round(mt * mt * x0 + 2 * mt * t * cx + t * t * x1),
                y: Math.round(mt * mt * y0 + 2 * mt * t * cy + t * t * y1),
            });
        }
        return points;
    }
    /** Quadratic curve drawn as short, brush-stamped line segments. */
    function drawCurve(x0, y0, cx, cy, x1, y1, selection, size = 1, tip = "sharp") {
        var _a;
        const points = sampleQuadratic(x0, y0, cx, cy, x1, y1);
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = (_a = points[i + 1]) !== null && _a !== void 0 ? _a : a;
            stampLine(a.x, a.y, b.x, b.y, selection, size, tip);
        }
    }
    /** Collect the cells a drawing function would touch, without committing. */
    function collectCells(draw) {
        const originalSet = currentSetCellActive;
        const cells = [];
        const seen = new Set();
        currentSetCellActive = (x, y) => {
            const k = `${x},${y}`;
            if (seen.has(k))
                return;
            seen.add(k);
            cells.push({ x, y });
        };
        try {
            draw();
        }
        finally {
            currentSetCellActive = originalSet;
        }
        return cells;
    }
    function getLineCells(x0, y0, x1, y1, size, tip, selection) {
        return collectCells(() => drawLine(x0, y0, x1, y1, selection, size, tip));
    }
    function getCurveCells(x0, y0, cx, cy, x1, y1, size, tip, selection) {
        return collectCells(() => drawCurve(x0, y0, cx, cy, x1, y1, selection, size, tip));
    }
    /** Circle outline only (Bresenham midpoint), respects selection constraint.
     *  r=0 → single pixel. */
    function drawCircle(cx, cy, r, selection) {
        const width = getTileWidth();
        const height = getTileHeight();
        // Always outline only
        const points = getCircleCells({ x: cx, y: cy }, r, false, width, height);
        // r=0: just the center pixel
        if (r === 0) {
            setIfAllowed(cx, cy, true, selection);
            return;
        }
        points.forEach((p) => setIfAllowed(p.x, p.y, true, selection));
    }
    /**
     * Fit a unit-space polygon into an exact `width`-cell horizontal span while
     * preserving its aspect ratio. Both the leftmost and rightmost vertices land
     * on the bounding-box edges, so the drawn shape is exactly as wide as the
     * Size slider says.
     */
    function fitPolygonToWidth(points, cx, cy, width) {
        const targetWidth = Math.max(1, Math.round(width));
        const span = targetWidth - 1;
        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const unitWidth = maxX - minX;
        const centerY = (minY + maxY) / 2;
        if (unitWidth === 0) {
            return points.map(([, y]) => [cx, Math.round(cy + (y - centerY))]);
        }
        const scale = span / unitWidth;
        const left = cx - Math.floor(span / 2);
        return points.map(([x, y]) => [
            Math.round(left + ((x - minX) / unitWidth) * span),
            Math.round(cy + (y - centerY) * scale),
        ]);
    }
    /** Shape tool: draws a circle, isometric cube, star, or regular polygon */
    function drawShape(type, cx, cy, size, ratio, selection) {
        // Every cell a shape touches is wrapped at the canvas seams, so the shape
        // (and its preview) continues on the opposite side instead of being cut off.
        const previousWrap = wrapShapeEdits;
        wrapShapeEdits = true;
        try {
            drawShapeUnwrapped(type, cx, cy, size, ratio, selection);
        }
        finally {
            wrapShapeEdits = previousWrap;
        }
    }
    function drawShapeUnwrapped(type, cx, cy, size, ratio, selection) {
        if (size <= 0) {
            // size=0: just place the center pixel
            setIfAllowed(cx, cy, true, selection);
            return;
        }
        if (type === "circle") {
            // Unlimited bounds keep the part of the outline that falls outside the
            // canvas so setIfAllowed can wrap it onto the opposite edge.
            getCircleCellsBySize({ x: cx, y: cy }, size, Infinity, Infinity)
                .forEach((p) => setIfAllowed(p.x, p.y, true, selection));
            return;
        }
        if (type === "cube") {
            // Width/height are ratios of the size slider so the cube can be squashed
            // or stretched directly from the Shape sub-bar. The bounding box is
            // exactly the rounded target size (no extra off-by-one cell).
            const w = Math.max(1, Math.round(size * ratio.width));
            const h = Math.max(1, Math.round(size * ratio.height));
            const left = cx - Math.floor((w - 1) / 2);
            const right = left + w - 1;
            const top = cy - Math.floor((h - 1) / 2);
            const bottom = top + h - 1;
            const midY = Math.round((top + bottom) / 2);
            const topMidY = Math.round((top + midY) / 2);
            const bottomMidY = Math.round((midY + bottom) / 2);
            // Top face
            drawLine(cx, top, right, topMidY, selection);
            drawLine(right, topMidY, cx, midY, selection);
            drawLine(cx, midY, left, topMidY, selection);
            drawLine(left, topMidY, cx, top, selection);
            // Bottom edges
            drawLine(left, topMidY, left, bottomMidY, selection);
            drawLine(right, topMidY, right, bottomMidY, selection);
            drawLine(left, bottomMidY, cx, bottom, selection);
            drawLine(right, bottomMidY, cx, bottom, selection);
            // Center vertical
            drawLine(cx, midY, cx, bottom, selection);
            return;
        }
        if (type === "star") {
            // Hollow star outline: alternating outer/inner points joined as one
            // closed polygon, with no spokes to the center.
            const innerRadius = 0.382;
            const pts = [];
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? 1 : innerRadius;
                const angle = (Math.PI / 5) * i - Math.PI / 2;
                pts.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
            }
            const fitted = fitPolygonToWidth(pts, cx, cy, size);
            for (let i = 0; i < fitted.length; i++) {
                const a = fitted[i];
                const b = fitted[(i + 1) % fitted.length];
                drawLine(a[0], a[1], b[0], b[1], selection);
            }
            return;
        }
        // Regular polygons: triangle (3), diamond (4), hexagon (6).
        const sides = type === "triangle" ? 3 : type === "diamond" ? 4 : 6;
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / sides;
            pts.push([Math.cos(angle), Math.sin(angle)]);
        }
        const fitted = fitPolygonToWidth(pts, cx, cy, size);
        for (let i = 0; i < sides; i++) {
            const a = fitted[i];
            const b = fitted[(i + 1) % sides];
            drawLine(a[0], a[1], b[0], b[1], selection);
        }
    }
    function getShapeCells(type, cx, cy, size, ratio, selection) {
        const width = getTileWidth();
        const height = getTileHeight();
        const pts = [];
        const originalSet = currentSetCellActive;
        // Intercept setCellActive, filter out-of-bounds
        currentSetCellActive = (x, y) => {
            if (x >= 0 && y >= 0 && x < width && y < height)
                pts.push({ x, y });
        };
        try {
            drawShape(type, cx, cy, size, ratio, selection);
        }
        finally {
            currentSetCellActive = originalSet;
        }
        return pts;
    }
    function floodTraverse(sx, sy, selection) {
        const width = getTileWidth();
        const height = getTileHeight();
        const target = isCellActive(sx, sy) ? 1 : 0;
        const visited = Array.from({ length: height }, () => new Array(width).fill(false));
        const stack = [[sx, sy]];
        const toApply = [];
        while (stack.length) {
            const [x, y] = stack.pop();
            if (x < 0 || y < 0 || x >= width || y >= height)
                continue;
            if (visited[y][x])
                continue;
            if (!isInSelection(x, y, selection))
                continue;
            if ((isCellActive(x, y) ? 1 : 0) !== target)
                continue;
            visited[y][x] = true;
            toApply.push([x, y]);
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        return toApply;
    }
    /**
     * Resolve which cells a fill touches and what state it leaves them in. With
     * a selection, only the selection is filled; otherwise the connected area of
     * same-state cells around the seed is filled. The pattern is always anchored
     * at the cell under the cursor so it moves with the pointer and lines up
     * predictably with the preview.
     */
    function getFillTargets(sx, sy, style, selection) {
        if (selection && selection.size > 0) {
            const targets = [];
            selection.forEach((cellKey) => {
                const [x, y] = cellKey.split(",").map(Number);
                targets.push({ x, y, active: style.isMarked(x - sx, y - sy) });
            });
            return targets;
        }
        return floodTraverse(sx, sy).map(([x, y]) => ({
            x,
            y,
            active: style.isMarked(x - sx, y - sy),
        }));
    }
    function fillWithStyle(sx, sy, style, selection) {
        getFillTargets(sx, sy, style, selection).forEach(({ x, y, active }) => {
            setCellActive(x, y, active);
        });
    }
    /** Invert all pixels within an explicit selection set */
    function invertSelection(selection) {
        selection.forEach((key) => {
            const [xs, ys] = key.split(",").map(Number);
            setCellActive(xs, ys, !isCellActive(xs, ys));
        });
    }
    /** Clear all pixels within an explicit selection set */
    function clearSelectionPixels(selection) {
        selection.forEach((key) => {
            const [xs, ys] = key.split(",").map(Number);
            setCellActive(xs, ys, false);
        });
    }
    return {
        drawLine,
        drawCurve,
        getBrushCells,
        getLineCells,
        getCurveCells,
        drawCircle,
        drawShape,
        fillWithStyle,
        getFillTargets,
        invertSelection,
        clearSelection: clearSelectionPixels,
        getShapeCells
    };
}
