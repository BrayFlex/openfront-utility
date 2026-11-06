/** True when a pixel of the given state passes a Black/Both/White filter. */
export function matchesSelectionColor(active, color) {
    if (color === "both")
        return true;
    return color === "black" ? active : !active;
}
const wrapIndex = (value, size) => {
    if (size <= 0)
        return 0;
    return ((value % size) + size) % size;
};
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
/**
 * Shared engine for every selection transform (shift, rotate, flip).
 *
 * The Select filter chooses which selected pixels are read; pixels that fail it
 * stay where they are and leave the selection. The Overwrite filter decides
 * which destination pixels may be replaced. A pixel only leaves its source when
 * it can actually be written to its destination, so protected destinations keep
 * their occupant instead of deleting it.
 *
 * Destinations occupied by another moving pixel are free once that pixel moves;
 * chains and closed loops are resolved before anything is cleared or stamped.
 */
function transformSelection(pattern, selection, selectColor, overwriteColor, mapDestination, wrap) {
    var _a, _b;
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    const next = pattern.map((row) => row.slice());
    const newSelection = new Set();
    const moving = [];
    const movingByKey = new Map();
    // Destinations are grouped so collisions (possible with rounded rotations)
    // can be detected; translation and flipping are always one-to-one.
    const destinationGroups = new Map();
    selection.forEach((key) => {
        var _a;
        const [x, y] = key.split(",").map(Number);
        const value = ((_a = pattern[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1 ? 1 : 0;
        // Pixels that fail the Select filter are not read, so they do not move and
        // cannot remain part of the filtered selection.
        if (!matchesSelectionColor(value === 1, selectColor))
            return;
        const destination = mapDestination(x, y);
        let nx = destination.x;
        let ny = destination.y;
        if (wrap) {
            nx = wrapIndex(nx, width);
            ny = wrapIndex(ny, height);
        }
        const inBounds = nx >= 0 && ny >= 0 && nx < width && ny < height;
        const cell = {
            x,
            y,
            nx,
            ny,
            value,
            key,
            dropped: !inBounds,
        };
        moving.push(cell);
        movingByKey.set(key, cell);
        if (inBounds) {
            const destinationKey = `${nx},${ny}`;
            const group = destinationGroups.get(destinationKey);
            if (group)
                group.push(cell);
            else
                destinationGroups.set(destinationKey, [cell]);
        }
    });
    const canMove = new Map();
    const visiting = new Set();
    /**
     * Resolve whether the pixel at `key` can reach its destination. A destination
     * occupied by another moving pixel is only available when that pixel also
     * moves; letting a pixel overwrite a blocked one would silently destroy it.
     * Stationary destinations obey the Overwrite filter, matching paste behaviour.
     */
    const resolves = (key) => {
        var _a;
        const cached = canMove.get(key);
        if (cached !== undefined)
            return cached;
        const cell = movingByKey.get(key);
        if (!cell)
            return false;
        // A pixel pushed off the canvas is simply removed, as before.
        if (cell.dropped) {
            canMove.set(key, true);
            return true;
        }
        const destinationKey = `${cell.nx},${cell.ny}`;
        const destinationGroup = destinationGroups.get(destinationKey);
        if (destinationGroup && destinationGroup.length > 1) {
            // Two pixels rounding onto the same cell cannot both move; keep both at
            // their sources rather than silently deleting one of them.
            canMove.set(key, false);
            return false;
        }
        if (movingByKey.has(destinationKey)) {
            if (visiting.has(key)) {
                // Closed orbit of moving pixels: every one vacates its destination.
                canMove.set(key, true);
                return true;
            }
            visiting.add(key);
            const result = resolves(destinationKey);
            visiting.delete(key);
            canMove.set(key, result);
            return result;
        }
        const destinationActive = ((_a = pattern[cell.ny]) === null || _a === void 0 ? void 0 : _a[cell.nx]) === 1;
        const result = matchesSelectionColor(destinationActive, overwriteColor);
        canMove.set(key, result);
        return result;
    };
    for (const cell of moving) {
        resolves(cell.key);
    }
    // Lift only the pixels that can complete their move, then stamp them into
    // place. Blocked pixels keep their original value at their source and stay
    // selected there; dropped pixels are removed without a destination.
    for (const cell of moving) {
        if (canMove.get(cell.key))
            next[cell.y][cell.x] = 0;
    }
    for (const cell of moving) {
        if (!canMove.get(cell.key)) {
            newSelection.add(cell.key);
            continue;
        }
        if (cell.dropped)
            continue;
        next[cell.ny][cell.nx] = cell.value;
        newSelection.add(`${cell.nx},${cell.ny}`);
    }
    return { pattern: next, selection: newSelection };
}
/**
 * Move selected pixels in direction (dx,dy), wrapping at the canvas edges.
 * The Select filter chooses which pixels travel (black, white or both) and the
 * Overwrite filter decides which destination pixels may be replaced.
 */
export function shiftSelection(pattern, selection, dx, dy, selectColor = "both", overwriteColor = "both") {
    const { pattern: next, selection: movedSelection } = transformSelection(pattern, selection, selectColor, overwriteColor, (x, y) => ({ x: x + dx, y: y + dy }), true);
    return { pattern: next, movedSelection };
}
/** Rotate selected pixels around the centroid of the selection.
 *  direction: "left" = 90° CCW, "right" = 90° CW */
export function rotateSelection(pattern, selection, direction, selectColor = "both", overwriteColor = "both") {
    if (selection.size === 0)
        return { pattern, rotatedSelection: selection };
    // Compute centroid of the selected cells that this operation can read.
    let sumX = 0, sumY = 0, count = 0;
    selection.forEach((key) => {
        var _a;
        const [x, y] = key.split(",").map(Number);
        const active = ((_a = pattern[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1;
        if (!matchesSelectionColor(active, selectColor))
            return;
        sumX += x;
        sumY += y;
        count++;
    });
    if (count === 0)
        return { pattern, rotatedSelection: new Set() };
    const cx = sumX / count;
    const cy = sumY / count;
    const { pattern: next, selection: rotatedSelection } = transformSelection(pattern, selection, selectColor, overwriteColor, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        if (direction === "right") {
            return { x: Math.round(cx - dy), y: Math.round(cy + dx) };
        }
        return { x: Math.round(cx + dy), y: Math.round(cy - dx) };
    }, false);
    return { pattern: next, rotatedSelection };
}
function flipSelectionOnAxis(pattern, selection, axis, selectColor = "both", overwriteColor = "both") {
    if (selection.size === 0)
        return { pattern, flippedSelection: selection };
    // Compute bounding box over the cells that this operation can read.
    let minH = Infinity, maxH = -Infinity;
    let minV = Infinity, maxV = -Infinity;
    selection.forEach((key) => {
        var _a;
        const [x, y] = key.split(",").map(Number);
        const active = ((_a = pattern[y]) === null || _a === void 0 ? void 0 : _a[x]) === 1;
        if (!matchesSelectionColor(active, selectColor))
            return;
        if (x < minH)
            minH = x;
        if (x > maxH)
            maxH = x;
        if (y < minV)
            minV = y;
        if (y > maxV)
            maxV = y;
    });
    if (!Number.isFinite(minH)) {
        return { pattern, flippedSelection: new Set() };
    }
    const { pattern: next, selection: flippedSelection } = transformSelection(pattern, selection, selectColor, overwriteColor, (x, y) => axis === "h"
        ? { x: minH + (maxH - x), y }
        : { x, y: minV + (maxV - y) }, false);
    return { pattern: next, flippedSelection };
}
/** Flip selected pixels horizontally (mirror left/right within bounding box). */
export function flipSelectionH(pattern, selection, selectColor = "both", overwriteColor = "both") {
    return flipSelectionOnAxis(pattern, selection, "h", selectColor, overwriteColor);
}
/** Flip selected pixels vertically (mirror top/bottom within bounding box). */
export function flipSelectionV(pattern, selection, selectColor = "both", overwriteColor = "both") {
    return flipSelectionOnAxis(pattern, selection, "v", selectColor, overwriteColor);
}
