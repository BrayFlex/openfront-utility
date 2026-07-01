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

/** Move selected pixels in direction (dx,dy). Pixels leaving the canvas are lost. */
export function shiftSelection(
  pattern: number[][],
  selection: Set<string>,
  dx: number,
  dy: number
): { pattern: number[][]; movedSelection: Set<string> } {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const next = pattern.map((row) => row.slice());
  const newSelection = new Set<string>();

  // Collect moving pixels
  const moving: Array<{ x: number; y: number }> = [];
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    if (pattern[y]?.[x] === 1) moving.push({ x, y });
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
export function rotateSelection(
  pattern: number[][],
  selection: Set<string>,
  direction: "left" | "right"
): { pattern: number[][]; rotatedSelection: Set<string> } {
  if (selection.size === 0) return { pattern, rotatedSelection: selection };

  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;

  // Compute centroid of ALL selected cells (not just active)
  let sumX = 0, sumY = 0;
  const cells: Array<{ x: number; y: number }> = [];
  selection.forEach((key) => {
    const [x, y] = key.split(",").map(Number);
    cells.push({ x, y });
    sumX += x;
    sumY += y;
  });
  const cx = sumX / cells.length;
  const cy = sumY / cells.length;

  const next = pattern.map((row) => row.slice());
  const newSel = new Set<string>();

  // Clear selection area in result
  cells.forEach(({ x, y }) => {
    next[y][x] = 0;
  });

  // Rotate each pixel
  cells.forEach(({ x, y }) => {
    const dx = x - cx;
    const dy = y - cy;
    let nx: number, ny: number;
    if (direction === "right") {
      nx = Math.round(cx - dy);
      ny = Math.round(cy + dx);
    } else {
      nx = Math.round(cx + dy);
      ny = Math.round(cy - dx);
    }
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
      // Only copy active pixels
      if (pattern[y]?.[x] === 1) {
        next[ny][nx] = 1;
      }
      newSel.add(`${nx},${ny}`);
    }
  });

  return { pattern: next, rotatedSelection: newSel };
}
