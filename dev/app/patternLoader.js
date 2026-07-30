import { decodePatternBase64 } from "./patternEncoding.js";
export function createPatternLoader(options) {
    const { base64Input, tileWidthInput, tileHeightInput, tileWidthValue, tileHeightValue, onPatternLoaded, } = options;
    return function loadFromBase64() {
        const base64 = base64Input.value;
        if (!base64)
            return;
        let decoded;
        try {
            decoded = decodePatternBase64(base64);
        }
        catch (e) {
            alert(e.message);
            return;
        }
        const { pattern, tileWidth, tileHeight } = decoded;
        tileWidthInput.value = tileWidth.toString();
        tileHeightInput.value = tileHeight.toString();
        tileWidthValue.value = tileWidthInput.value;
        tileHeightValue.value = tileHeightInput.value;
        onPatternLoaded(pattern);
    };
}
