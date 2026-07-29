export type ThresholdComparator = "gte" | "lte";
export type ChannelComparator = ThresholdComparator | "ignore";
export type ImageConversionMode = "brightness" | "target-color" | "rgb-rules";

type ChannelRule = {
  comparator: ChannelComparator;
  threshold: number;
};

export type ImageConversionSettings = {
  alphaThreshold: number;
  mode: ImageConversionMode;
  brightness: {
    comparator: ThresholdComparator;
    threshold: number;
  };
  targetColor: {
    hex: string;
    tolerance: number;
    matchMode: "match" | "exclude";
  };
  rgbRules: {
    combineMode: "all" | "any";
    red: ChannelRule;
    green: ChannelRule;
    blue: ChannelRule;
  };
};

export type RasterData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export const MAX_COLOR_DISTANCE = Math.round(Math.sqrt(255 * 255 * 3));

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const isDefined = <T>(value: T | null): value is T => value !== null;

function hexToRgb(hex: string) {
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Number.parseInt(cleaned.slice(0, 2), 16),
    g: Number.parseInt(cleaned.slice(2, 4), 16),
    b: Number.parseInt(cleaned.slice(4, 6), 16),
  };
}

function evaluateChannelRule(value: number, rule: ChannelRule) {
  if (rule.comparator === "ignore") {
    return null;
  }
  const threshold = clampByte(rule.threshold);
  return rule.comparator === "gte" ? value >= threshold : value <= threshold;
}

function shouldActivatePixel(
  r: number,
  g: number,
  b: number,
  a: number,
  settings: ImageConversionSettings
) {
  if (a < clampByte(settings.alphaThreshold)) {
    return false;
  }

  if (settings.mode === "brightness") {
    const luminance = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const threshold = clampByte(settings.brightness.threshold);
    return settings.brightness.comparator === "gte"
      ? luminance >= threshold
      : luminance <= threshold;
  }

  if (settings.mode === "target-color") {
    const target = hexToRgb(settings.targetColor.hex);
    const distance = Math.sqrt(
      (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2
    );
    const matches = distance <= Math.max(0, settings.targetColor.tolerance);
    return settings.targetColor.matchMode === "match" ? matches : !matches;
  }

  const results = [
    evaluateChannelRule(r, settings.rgbRules.red),
    evaluateChannelRule(g, settings.rgbRules.green),
    evaluateChannelRule(b, settings.rgbRules.blue),
  ].filter(isDefined);

  if (results.length === 0) {
    return false;
  }

  return settings.rgbRules.combineMode === "all"
    ? results.every(Boolean)
    : results.some(Boolean);
}

export function convertRasterToPattern(
  raster: RasterData,
  settings: ImageConversionSettings
) {
  const pattern = Array.from({ length: raster.height }, () =>
    new Array(raster.width).fill(0)
  );

  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const index = (y * raster.width + x) * 4;
      const active = shouldActivatePixel(
        raster.data[index] ?? 0,
        raster.data[index + 1] ?? 0,
        raster.data[index + 2] ?? 0,
        raster.data[index + 3] ?? 0,
        settings
      );
      pattern[y][x] = active ? 1 : 0;
    }
  }

  return pattern;
}

export function countActiveCells(pattern: number[][]) {
  return pattern.reduce(
    (total, row) => total + row.reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0),
    0
  );
}
