export const MAX_COLOR_DISTANCE = Math.round(Math.sqrt(255 * 255 * 3));
const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
const isDefined = (value) => value !== null;
function hexToRgb(hex) {
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
function evaluateChannelRule(value, rule) {
    if (rule.comparator === "ignore") {
        return null;
    }
    const threshold = clampByte(rule.threshold);
    return rule.comparator === "gte" ? value >= threshold : value <= threshold;
}
function shouldActivatePixel(r, g, b, a, settings) {
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
        const distance = Math.sqrt(Math.pow((r - target.r), 2) + Math.pow((g - target.g), 2) + Math.pow((b - target.b), 2));
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
export function convertRasterToPattern(raster, settings) {
    var _a, _b, _c, _d;
    const pattern = Array.from({ length: raster.height }, () => new Array(raster.width).fill(0));
    for (let y = 0; y < raster.height; y++) {
        for (let x = 0; x < raster.width; x++) {
            const index = (y * raster.width + x) * 4;
            const active = shouldActivatePixel((_a = raster.data[index]) !== null && _a !== void 0 ? _a : 0, (_b = raster.data[index + 1]) !== null && _b !== void 0 ? _b : 0, (_c = raster.data[index + 2]) !== null && _c !== void 0 ? _c : 0, (_d = raster.data[index + 3]) !== null && _d !== void 0 ? _d : 0, settings);
            pattern[y][x] = active ? 1 : 0;
        }
    }
    return pattern;
}
export function countActiveCells(pattern) {
    return pattern.reduce((total, row) => total + row.reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0), 0);
}
