import { getCircleCells } from "./circleGeometry.js";
function isInSelection(x, y, selection) {
    if (!selection || selection.size === 0)
        return true;
    return selection.has(`${x},${y}`);
}
export function createDrawingTools(options) {
    const { getTileWidth, getTileHeight, isCellActive, setCellActive } = options;
    // Allow intercepting setIfAllowed for previews
    let currentSetCellActive = setCellActive;
    function setIfAllowed(x, y, active, selection) {
        if (!isInSelection(x, y, selection))
            return;
        currentSetCellActive(x, y, active);
    }
    /** Bresenham line, respects selection constraint */
    function drawLine(x0, y0, x1, y1, selection) {
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, e2;
        while (true) {
            setIfAllowed(x0, y0, true, selection);
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
    /** Shape tool: draws a circle, isometric cube, star, or regular polygon */
    function drawShape(type, cx, cy, r, ratio, selection) {
        if (r <= 0) {
            // r=0: just place the center pixel
            setIfAllowed(cx, cy, true, selection);
            return;
        }
        if (type === "circle") {
            drawCircle(cx, cy, r, selection);
            return;
        }
        if (type === "cube") {
            // Width/height are ratios of the size slider so the cube can be squashed
            // or stretched directly from the Shape sub-bar.
            const h = Math.max(1, Math.round(r * ratio.height));
            const w = Math.max(1, Math.round(r * ratio.width));
            // Top face
            drawLine(cx, cy - h, cx + w, cy - Math.round(h / 2), selection);
            drawLine(cx + w, cy - Math.round(h / 2), cx, cy, selection);
            drawLine(cx, cy, cx - w, cy - Math.round(h / 2), selection);
            drawLine(cx - w, cy - Math.round(h / 2), cx, cy - h, selection);
            // Bottom edges
            drawLine(cx - w, cy - Math.round(h / 2), cx - w, cy + Math.round(h / 2), selection);
            drawLine(cx + w, cy - Math.round(h / 2), cx + w, cy + Math.round(h / 2), selection);
            drawLine(cx - w, cy + Math.round(h / 2), cx, cy + h, selection);
            drawLine(cx + w, cy + Math.round(h / 2), cx, cy + h, selection);
            // Center vertical
            drawLine(cx, cy, cx, cy + h, selection);
            return;
        }
        if (type === "star") {
            // Hollow star outline: alternating outer/inner points joined as one
            // closed polygon, with no spokes to the center.
            const outerRadius = r;
            const innerRadius = Math.max(1, r * 0.382);
            const pts = [];
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / 5) * i - Math.PI / 2;
                pts.push([
                    Math.round(cx + radius * Math.cos(angle)),
                    Math.round(cy + radius * Math.sin(angle)),
                ]);
            }
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length];
                drawLine(a[0], a[1], b[0], b[1], selection);
            }
            return;
        }
        // Regular polygons: triangle (3), diamond (4), hexagon (6).
        const sides = type === "triangle" ? 3 : type === "diamond" ? 4 : 6;
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / sides;
            pts.push([Math.round(cx + r * Math.cos(angle)), Math.round(cy + r * Math.sin(angle))]);
        }
        for (let i = 0; i < sides; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % sides];
            drawLine(a[0], a[1], b[0], b[1], selection);
        }
    }
    function getShapeCells(type, cx, cy, r, ratio, selection) {
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
            drawShape(type, cx, cy, r, ratio, selection);
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
    /** Flood fill from (sx,sy) — respects selection constraint */
    function floodFill(sx, sy, selection) {
        if (!isInSelection(sx, sy, selection))
            return;
        const target = isCellActive(sx, sy) ? 1 : 0;
        const newValue = target ? 0 : 1;
        const toApply = floodTraverse(sx, sy, selection);
        toApply.forEach(([x, y]) => setCellActive(x, y, newValue === 1));
    }
    /** Shade flood fill — fills connected same-state area with checkerboard */
    function floodShade(sx, sy, selection) {
        if (!isInSelection(sx, sy, selection))
            return;
        const toApply = floodTraverse(sx, sy, selection);
        const anchorParity = (sx + sy) % 2;
        toApply.forEach(([x, y]) => {
            // Checkerboard aligned with click anchor
            setCellActive(x, y, (x + y) % 2 === anchorParity);
        });
    }
    /** Fill an explicit selection set with checkerboard pattern */
    function shadeSelection(selection) {
        selection.forEach((key) => {
            const [xs, ys] = key.split(",").map(Number);
            // Without an anchor, just use even parity
            setCellActive(xs, ys, (xs + ys) % 2 === 0);
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
        drawCircle,
        drawShape,
        floodFill,
        floodShade,
        shadeSelection,
        invertSelection,
        clearSelection: clearSelectionPixels,
        getShapeCells
    };
}
