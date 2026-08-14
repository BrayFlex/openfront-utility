import { PatternDecoder } from "./patternEncoding.js";
function patternSourceFromBase64(base64) {
    const decoder = new PatternDecoder(base64);
    return { isSet: (x, y) => decoder.isSet(x, y) };
}
function patternSourceFromMatrix(pattern) {
    var _a, _b;
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    return {
        isSet: (x, y) => { var _a, _b; return ((_b = (_a = pattern[y % height]) === null || _a === void 0 ? void 0 : _a[x % width]) !== null && _b !== void 0 ? _b : 0) === 1; },
    };
}
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 255, g: 255, b: 255 };
}
export function createPreviewRenderer(options) {
    const { canvas, context, primaryColorInput, secondaryColorInput } = options;
    return function renderPreview(pattern, isScrap = false) {
        const source = typeof pattern === "string"
            ? patternSourceFromBase64(pattern)
            : patternSourceFromMatrix(pattern);
        const width = 512;
        const height = 512;
        canvas.width = width;
        canvas.height = height;
        const primaryRgb = hexToRgb(primaryColorInput.value);
        const secondaryRgb = hexToRgb(secondaryColorInput.value);
        const imageData = context.createImageData(width, height);
        const data = imageData.data;
        let i = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (source.isSet(x, y)) {
                    data[i++] = secondaryRgb.r;
                    data[i++] = secondaryRgb.g;
                    data[i++] = secondaryRgb.b;
                }
                else {
                    data[i++] = primaryRgb.r;
                    data[i++] = primaryRgb.g;
                    data[i++] = primaryRgb.b;
                }
                data[i++] = 255;
            }
        }
        context.putImageData(imageData, 0, 0);
        // Scrap canvas watermark
        if (isScrap) {
            context.save();
            context.globalAlpha = 0.55;
            context.fillStyle = "#000000";
            context.fillRect(0, height - 34, width, 34);
            context.globalAlpha = 1;
            context.fillStyle = "#ffffff";
            context.font = "bold 15px 'Space Grotesk', sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText("< Test Canvas >", width / 2, height - 17);
            context.restore();
        }
    };
}
