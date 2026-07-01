export function shiftPatternLeft(pattern) {
    return pattern.map((row) => { var _a; return row.slice(1).concat((_a = row[0]) !== null && _a !== void 0 ? _a : 0); });
}
export function shiftPatternRight(pattern) {
    return pattern.map((row) => {
        var _a;
        const last = (_a = row[row.length - 1]) !== null && _a !== void 0 ? _a : 0;
        return [last, ...row.slice(0, -1)];
    });
}
export function shiftPatternDown(pattern) {
    var _a, _b, _c, _d, _e, _f;
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    const next = Array.from({ length: height }, () => new Array(width).fill(0));
    for (let x = 0; x < width; x++) {
        next[0][x] = (_d = (_c = pattern[height - 1]) === null || _c === void 0 ? void 0 : _c[x]) !== null && _d !== void 0 ? _d : 0;
        for (let y = 1; y < height; y++) {
            next[y][x] = (_f = (_e = pattern[y - 1]) === null || _e === void 0 ? void 0 : _e[x]) !== null && _f !== void 0 ? _f : 0;
        }
    }
    return next;
}
export function shiftPatternUp(pattern) {
    var _a, _b, _c, _d, _e, _f;
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    const next = Array.from({ length: height }, () => new Array(width).fill(0));
    for (let x = 0; x < width; x++) {
        next[height - 1][x] = (_d = (_c = pattern[0]) === null || _c === void 0 ? void 0 : _c[x]) !== null && _d !== void 0 ? _d : 0;
        for (let y = 0; y < height - 1; y++) {
            next[y][x] = (_f = (_e = pattern[y + 1]) === null || _e === void 0 ? void 0 : _e[x]) !== null && _f !== void 0 ? _f : 0;
        }
    }
    return next;
}
export function invertPattern(pattern) {
    return pattern.map((row) => row.map((c) => (c === 1 ? 0 : 1)));
}
/** Move selected pixels in direction (dx,dy). Pixels leaving the canvas are lost. */
export function shiftSelection(pattern, selection, dx, dy) {
    var _a, _b;
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    const next = pattern.map((row) => row.slice());
    const newSelection = new Set();
    // Collect moving pixels
    const moving = [];
    selection.forEach((key) => {
        var _a;
        const [x, y] = key.split(",").map(Number);
        if (((_a = pattern[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1)
            moving.push({ x, y });
    });
    // Clear source positions that are moving
    for (const { x, y } of moving) {
        next[y][x] = 0;
    }
    // Place at destination
    for (const { x, y } of moving) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            next[ny][nx] = 1;
            newSelection.add(`${nx},${ny}`);
        }
    }
    // Also move the empty selected cells (so selection tracks with the content)
    selection.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            newSelection.add(`${nx},${ny}`);
        }
    });
    return { pattern: next, movedSelection: newSelection };
}
/** Rotate selected pixels around the centroid of the selection.
 *  direction: "left" = 90° CCW, "right" = 90° CW */
export function rotateSelection(pattern, selection, direction) {
    var _a, _b;
    if (selection.size === 0)
        return { pattern, rotatedSelection: selection };
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    // Compute centroid of ALL selected cells (not just active)
    let sumX = 0, sumY = 0;
    const cells = [];
    selection.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        cells.push({ x, y });
        sumX += x;
        sumY += y;
    });
    const cx = sumX / cells.length;
    const cy = sumY / cells.length;
    const next = pattern.map((row) => row.slice());
    const newSel = new Set();
    // Clear selection area in result
    cells.forEach(({ x, y }) => {
        next[y][x] = 0;
    });
    // Rotate each pixel
    cells.forEach(({ x, y }) => {
        var _a;
        const dx = x - cx;
        const dy = y - cy;
        let nx, ny;
        if (direction === "right") {
            nx = Math.round(cx - dy);
            ny = Math.round(cy + dx);
        }
        else {
            nx = Math.round(cx + dy);
            ny = Math.round(cy - dx);
        }
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            // Only copy active pixels
            if (((_a = pattern[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1) {
                next[ny][nx] = 1;
            }
            newSel.add(`${nx},${ny}`);
        }
    });
    return { pattern: next, rotatedSelection: newSel };
}
