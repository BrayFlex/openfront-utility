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
export function getCircleRadius(start, end) {
    return Math.max(0, Math.round(Math.hypot(end.x - start.x, end.y - start.y)));
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
    let err = 0;
    while (x >= y) {
        addOutlinePoints(points, seen, center.x, center.y, x, y, width, height);
        y += 1;
        if (err <= 0) {
            err += 2 * y + 1;
        }
        else {
            x -= 1;
            err -= 2 * x + 1;
        }
    }
    return points;
}
