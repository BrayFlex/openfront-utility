function addPoint(points, seen, width, height, x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
        return;
    }
    const key = `${x},${y}`;
    if (seen.has(key)) {
        return;
    }
    seen.add(key);
    points.push({ x, y });
}
function addOutlinePoints(points, seen, cx, cy, x, y, width, height) {
    addPoint(points, seen, width, height, cx + x, cy + y);
    addPoint(points, seen, width, height, cx + y, cy + x);
    addPoint(points, seen, width, height, cx - y, cy + x);
    addPoint(points, seen, width, height, cx - x, cy + y);
    addPoint(points, seen, width, height, cx - x, cy - y);
    addPoint(points, seen, width, height, cx - y, cy - x);
    addPoint(points, seen, width, height, cx + y, cy - x);
    addPoint(points, seen, width, height, cx + x, cy - y);
}
function getEllipseCells(center, boxWidth, boxHeight, fill, width, height) {
    const points = [];
    const seen = new Set();
    const w = Math.max(1, Math.round(boxWidth));
    const h = Math.max(1, Math.round(boxHeight));
    const left = center.x - Math.floor((w - 1) / 2);
    const top = center.y - Math.floor((h - 1) / 2);
    const centerX = left + (w - 1) / 2;
    const centerY = top + (h - 1) / 2;
    const radiusX = w / 2;
    const radiusY = h / 2;
    const isInside = (x, y) => {
        const nx = (x - centerX) / radiusX;
        const ny = (y - centerY) / radiusY;
        return nx * nx + ny * ny <= 1;
    };
    for (let y = top; y < top + h; y++) {
        for (let x = left; x < left + w; x++) {
            if (!isInside(x, y))
                continue;
            if (!fill &&
                isInside(x - 1, y) &&
                isInside(x + 1, y) &&
                isInside(x, y - 1) &&
                isInside(x, y + 1)) {
                continue;
            }
            addPoint(points, seen, width, height, x, y);
        }
    }
    return points;
}
/** Circle outline whose bounding box is exactly `size` cells wide/tall. */
export function getCircleCellsBySize(center, size, width, height) {
    return getEllipseCells(center, size, size, false, width, height);
}
export function getCircleCells(center, radius, fill, width, height) {
    const points = [];
    const seen = new Set();
    if (fill) {
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                if (x * x + y * y <= radius * radius) {
                    addPoint(points, seen, width, height, center.x + x, center.y + y);
                }
            }
        }
        return points;
    }
    let x = radius;
    let y = 0;
    let p = 1 - radius;
    while (x >= y) {
        addOutlinePoints(points, seen, center.x, center.y, x, y, width, height);
        y++;
        if (p <= 0) {
            p = p + 2 * y + 1;
        }
        else {
            x--;
            p = p + 2 * y - 2 * x + 1;
        }
    }
    return points;
}
