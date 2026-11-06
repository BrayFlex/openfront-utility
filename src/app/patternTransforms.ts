import type { SelectionColor } from "./toolState.js";

/** True when a pixel of the given state passes a Black/Both/White filter. */
export function matchesSelectionColor(active: boolean, color: SelectionColor) {
  if (color === "both") return true;
  return color === "black" ? active : !active;
}

const wrapIndex = (value: number, size: number) => {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
};

export function shiftPatternLeft(pattern: number[][]) {
  return pattern.map((row) => row.slice(1).concat(row[0] ?? 0));
}

export function shiftPatternRight(pattern: number[][]) {
  return pattern.map((row) => {
    const last = row[row.length - 1] ?? 0;
    return [last, ...row.slice(0, -1)];
  });
}

export function shiftPatternDown(pattern: number[][]) {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  for (let x = 0; x < width; x++) {
    next[0][x] = pattern[height - 1]?.[x] ?? 0;
    for (let y = 1; y < height; y++) {
      next[y][x] = pattern[y - 1]?.[x] ?? 0;
    }
  }
  return next;
}

export function shiftPatternUp(pattern: number[][]) {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  for (let x = 0; x < width; x++) {
    next[height - 1][x] = pattern[0]?.[x] ?? 0;
    for (let y = 0; y < height - 1; y++) {
      next[y][x] = pattern[y + 1]?.[x] ?? 0;
    }
  }
  return next;
}

export function invertPattern(pattern: number[][]) {
  return pattern.map((row) => row.map((c) => (c === 1 ? 0 : 1)));
}

type GridCell = { x: number; y: number };

type MovingCell = {
  x: number;
  y: number;
  nx: number;
  ny: number;
  value: number;
  key: string;
  /** Rotations/flips can push a pixel off the canvas; shifts wrap instead. */
  dropped: boolean;
};

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
function transformSelection(
  pattern: number[][],
  selection: Set<string>,
  selectColor: SelectionColor,
  overwriteColor: SelectionColor,
  mapDestination: (x: number, y: number) => GridCell,
  wrap: boolean
): { pattern: number[][]; selection: Set<string> } {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = pattern.map((row) => row.slice());
  const newSelection = new Set<string>();

  const moving: MovingCell[] = [];
  const movingByKey = new Map<string, MovingCell>();
  // Destinations are grouped so collisions (possible with rounded rotations)
  // can be detected; translation and flipping are always one-to-one.
  const destinationGroups = new Map<string, MovingCell[]>();

  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const value = pattern[y]?.[x] === 1 ? 1 : 0;
    // Pixels that fail the Select filter are not read, so they do not move and
    // cannot remain part of the filtered selection.
    if (!matchesSelectionColor(value === 1, selectColor)) return;

    const destination = mapDestination(x, y);
    let nx = destination.x;
    let ny = destination.y;
    if (wrap) {
      nx = wrapIndex(nx, width);
      ny = wrapIndex(ny, height);
    }
    const inBounds = nx >= 0 && ny >= 0 && nx < width && ny < height;
    const cell: MovingCell = {
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
      if (group) group.push(cell);
      else destinationGroups.set(destinationKey, [cell]);
    }
  });

  const canMove = new Map<string, boolean>();
  const visiting = new Set<string>();

  /**
   * Resolve whether the pixel at `key` can reach its destination. A destination
   * occupied by another moving pixel is only available when that pixel also
   * moves; letting a pixel overwrite a blocked one would silently destroy it.
   * Stationary destinations obey the Overwrite filter, matching paste behaviour.
   */
  const resolves = (key: string): boolean => {
    const cached = canMove.get(key);
    if (cached !== undefined) return cached;
    const cell = movingByKey.get(key);
    if (!cell) return false;

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

    const destinationActive = pattern[cell.ny]?.[cell.nx] === 1;
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
    if (canMove.get(cell.key)) next[cell.y][cell.x] = 0;
  }
  for (const cell of moving) {
    if (!canMove.get(cell.key)) {
      newSelection.add(cell.key);
      continue;
    }
    if (cell.dropped) continue;
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
export function shiftSelection(
  pattern: number[][],
  selection: Set<string>,
  dx: number,
  dy: number,
  selectColor: SelectionColor = "both",
  overwriteColor: SelectionColor = "both"
): { pattern: number[][]; movedSelection: Set<string> } {
  const { pattern: next, selection: movedSelection } = transformSelection(
    pattern,
    selection,
    selectColor,
    overwriteColor,
    (x, y) => ({ x: x + dx, y: y + dy }),
    true
  );
  return { pattern: next, movedSelection };
}

/** Rotate selected pixels around the centroid of the selection.
 *  direction: "left" = 90° CCW, "right" = 90° CW */
export function rotateSelection(
  pattern: number[][],
  selection: Set<string>,
  direction: "left" | "right",
  selectColor: SelectionColor = "both",
  overwriteColor: SelectionColor = "both"
): { pattern: number[][]; rotatedSelection: Set<string> } {
  if (selection.size === 0) return { pattern, rotatedSelection: selection };

  // Compute centroid of the selected cells that this operation can read.
  let sumX = 0, sumY = 0, count = 0;
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const active = pattern[y]?.[x] === 1;
    if (!matchesSelectionColor(active, selectColor)) return;
    sumX += x;
    sumY += y;
    count++;
  });
  if (count === 0) return { pattern, rotatedSelection: new Set<string>() };
  const cx = sumX / count;
  const cy = sumY / count;

  const { pattern: next, selection: rotatedSelection } = transformSelection(
    pattern,
    selection,
    selectColor,
    overwriteColor,
    (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      if (direction === "right") {
        return { x: Math.round(cx - dy), y: Math.round(cy + dx) };
      }
      return { x: Math.round(cx + dy), y: Math.round(cy - dx) };
    },
    false
  );

  return { pattern: next, rotatedSelection };
}

function flipSelectionOnAxis(
  pattern: number[][],
  selection: Set<string>,
  axis: "h" | "v",
  selectColor: SelectionColor = "both",
  overwriteColor: SelectionColor = "both"
): { pattern: number[][]; flippedSelection: Set<string> } {
  if (selection.size === 0) return { pattern, flippedSelection: selection };

  // Compute bounding box over the cells that this operation can read.
  let minH = Infinity, maxH = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    const active = pattern[y]?.[x] === 1;
    if (!matchesSelectionColor(active, selectColor)) return;
    if (x < minH) minH = x;
    if (x > maxH) maxH = x;
    if (y < minV) minV = y;
    if (y > maxV) maxV = y;
  });
  if (!Number.isFinite(minH)) {
    return { pattern, flippedSelection: new Set<string>() };
  }

  const { pattern: next, selection: flippedSelection } = transformSelection(
    pattern,
    selection,
    selectColor,
    overwriteColor,
    (x, y) =>
      axis === "h"
        ? { x: minH + (maxH - x), y }
        : { x, y: minV + (maxV - y) },
    false
  );

  return { pattern: next, flippedSelection };
}

/** Flip selected pixels horizontally (mirror left/right within bounding box). */
export function flipSelectionH(
  pattern: number[][],
  selection: Set<string>,
  selectColor: SelectionColor = "both",
  overwriteColor: SelectionColor = "both"
): { pattern: number[][]; flippedSelection: Set<string> } {
  return flipSelectionOnAxis(pattern, selection, "h", selectColor, overwriteColor);
}

/** Flip selected pixels vertically (mirror top/bottom within bounding box). */
export function flipSelectionV(
  pattern: number[][],
  selection: Set<string>,
  selectColor: SelectionColor = "both",
  overwriteColor: SelectionColor = "both"
): { pattern: number[][]; flippedSelection: Set<string> } {
  return flipSelectionOnAxis(pattern, selection, "v", selectColor, overwriteColor);
}
