export type GridPoint = {
  x: number;
  y: number;
};

function addPoint(
  points: GridPoint[],
  seen: Set<string>,
  width: number,
  height: number,
  x: number,
  y: number
) {
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

function addOutlinePoints(
  points: GridPoint[],
  seen: Set<string>,
  cx: number,
  cy: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  addPoint(points, seen, width, height, cx + x, cy + y);
  addPoint(points, seen, width, height, cx + y, cy + x);
  addPoint(points, seen, width, height, cx - y, cy + x);
  addPoint(points, seen, width, height, cx - x, cy + y);
  addPoint(points, seen, width, height, cx - x, cy - y);
  addPoint(points, seen, width, height, cx - y, cy - x);
  addPoint(points, seen, width, height, cx + y, cy - x);
  addPoint(points, seen, width, height, cx + x, cy - y);
}

export function getCircleRadius(start: GridPoint, end: GridPoint) {
  return Math.max(0, Math.round(Math.hypot(end.x - start.x, end.y - start.y)));
}

export function getCircleCells(
  center: GridPoint,
  radius: number,
  fill: boolean,
  width: number,
  height: number
) {
  const points: GridPoint[] = [];
  const seen = new Set<string>();

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
    } else {
      x--;
      p = p + 2 * y - 2 * x + 1;
    }
  }

  return points;
}
