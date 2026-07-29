import assert from "node:assert/strict";
import {
  convertRasterToPattern,
  countActiveCells,
  MAX_COLOR_DISTANCE,
} from "../docs/app/imagePatternConversion.js";

const raster = {
  width: 3,
  height: 1,
  data: new Uint8ClampedArray([
    240,
    20,
    20,
    255,
    20,
    240,
    20,
    255,
    250,
    250,
    250,
    255,
  ]),
};

const brightnessPattern = convertRasterToPattern(raster, {
  alphaThreshold: 1,
  mode: "brightness",
  brightness: {
    comparator: "gte",
    threshold: 128,
  },
  targetColor: {
    hex: "#ffffff",
    tolerance: MAX_COLOR_DISTANCE,
    matchMode: "match",
  },
  rgbRules: {
    combineMode: "all",
    red: { comparator: "ignore", threshold: 0 },
    green: { comparator: "ignore", threshold: 0 },
    blue: { comparator: "ignore", threshold: 0 },
  },
});

assert.deepEqual(
  brightnessPattern,
  [[0, 1, 1]],
  "Brightness mode should activate light pixels"
);

const targetPattern = convertRasterToPattern(raster, {
  alphaThreshold: 1,
  mode: "target-color",
  brightness: {
    comparator: "gte",
    threshold: 128,
  },
  targetColor: {
    hex: "#ff0000",
    tolerance: 35,
    matchMode: "match",
  },
  rgbRules: {
    combineMode: "all",
    red: { comparator: "ignore", threshold: 0 },
    green: { comparator: "ignore", threshold: 0 },
    blue: { comparator: "ignore", threshold: 0 },
  },
});

assert.deepEqual(
  targetPattern,
  [[1, 0, 0]],
  "Target-colour mode should isolate near matches"
);

const rgbPattern = convertRasterToPattern(raster, {
  alphaThreshold: 1,
  mode: "rgb-rules",
  brightness: {
    comparator: "gte",
    threshold: 128,
  },
  targetColor: {
    hex: "#ffffff",
    tolerance: MAX_COLOR_DISTANCE,
    matchMode: "match",
  },
  rgbRules: {
    combineMode: "any",
    red: { comparator: "gte", threshold: 230 },
    green: { comparator: "gte", threshold: 230 },
    blue: { comparator: "ignore", threshold: 0 },
  },
});

assert.deepEqual(
  rgbPattern,
  [[1, 1, 1]],
  "RGB rules should support ANY combination logic"
);

assert.equal(
  countActiveCells(rgbPattern),
  3,
  "Active cell counting should match the converted result"
);

console.log("ok: image conversion rules produce the expected bitmap");
