import assert from "node:assert/strict";
import { getCircleCells, getCircleRadius } from "../docs/app/circleGeometry.js";

assert.equal(
  getCircleRadius({ x: 2, y: 3 }, { x: 5, y: 7 }),
  5,
  "Drag radius should follow the cursor distance"
);

const outline = getCircleCells({ x: 3, y: 3 }, 2, false, 8, 8);
assert.ok(
  outline.some((point) => point.x === 5 && point.y === 3) &&
    outline.some((point) => point.x === 1 && point.y === 3),
  "Outline circles should include the expected edge points"
);

const filled = getCircleCells({ x: 2, y: 2 }, 1, true, 5, 5);
assert.deepEqual(
  filled.sort((left, right) => left.y - right.y || left.x - right.x),
  [
    { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 3 },
  ],
  "Filled circles should cover the center and its radius-1 neighbors"
);

console.log("ok: circle geometry supports drag preview and final draw");
