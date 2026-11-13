import { PatternDecoder } from "./patternEncoding.js";
// In-game territory fill opacity (render-settings.json > mapOverlay.territoryAlpha).
const TERRITORY_ALPHA = 0.588;
const TERRITORY_INV = 1 - TERRITORY_ALPHA;
function patternSourceFromBase64(base64) {
    const decoder = new PatternDecoder(base64);
    const scale = decoder.getScale();
    return {
        // Cell-level predicate: tiles the pattern across cell indices.
        isSetCell: (cx, cy) => decoder.isSet(cx << scale, cy << scale),
        tileWidth: decoder.getTileWidth(),
        tileHeight: decoder.getTileHeight(),
        scale,
    };
}
function patternSourceFromMatrix(pattern, scale = 0) {
    var _a, _b;
    const height = pattern.length;
    const width = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    return {
        isSetCell: (cx, cy) => { var _a, _b; return ((_b = (_a = pattern[cy % height]) === null || _a === void 0 ? void 0 : _a[cx % width]) !== null && _b !== void 0 ? _b : 0) === 1; },
        tileWidth: width,
        tileHeight: height,
        scale,
    };
}
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 255, g: 255, b: 255 };
}
function rgbCss({ r, g, b }) {
    return `rgb(${r}, ${g}, ${b})`;
}
/**
 * Returns the team colour that should replace the primary for a pixel at
 * (x, y) in a canvas of the given width/height. Sections are radial wedges
 * from the canvas centre, matching the popover's team-colour wheel.
 * `teamColors` must already be parsed (see hexToRgb) so this stays cheap to
 * call once per pixel.
 */
export function teamPrimaryFor(teamColors, x, y, width, height) {
    if (!teamColors || teamColors.length === 0)
        return null;
    const dx = x - width / 2;
    const dy = y - height / 2;
    // atan2 returns -PI..PI measured from the +x axis; rotate so 0 points up
    // and sectors progress clockwise, matching the wheel's wedge layout.
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.floor((angle / (Math.PI * 2)) * teamColors.length) % teamColors.length;
    return teamColors[idx];
}
export function createPreviewRenderer(options) {
    const { canvas, context, primaryColorInput, secondaryColorInput, canvasWrap, getZoom, getSimMap, getTeamColors } = options;
    // ── Tiled-preview scratch buffers ─────────────────────────────────────────
    // The pattern repeats across the panel, so only a single tile is rasterised
    // and the browser repeats it with a CanvasPattern. Cost is proportional to
    // the pattern (at most 128×64 cells) instead of the panel's device-pixel
    // area, which was millions of pixels per redraw.
    const tileCanvas = document.createElement("canvas");
    const tileContext = tileCanvas.getContext("2d");
    // Team-colour wedges vary per pixel, so they can't live in the repeating
    // tile. They are rendered once into a cached layer and blitted underneath.
    let teamLayer = null;
    let teamLayerKey = "";
    // ── Map-simulation caches ─────────────────────────────────────────────────
    // Reading pixels back from the GPU (getImageData) is one of the slowest
    // canvas operations, so the scaled map and its land mask are cached and only
    // rebuilt when the map or the display size changes.
    const baseCanvas = document.createElement("canvas");
    const baseContext = baseCanvas.getContext("2d", { willReadFrequently: true });
    const maskCanvas = document.createElement("canvas");
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    let mapCache = null;
    let mapBaseData = null;
    let mapLand = null;
    let mapColX = null;
    let mapRowY = null;
    let mapPrimary = null;
    let mapPrimaryKey = "";
    let mapOutput = null;
    /**
     * Resize the visible canvas only when its backing store actually changes.
     * Assigning `canvas.width`/`height` always resets (and reallocates) the
     * bitmap, so doing it on every frame was throwing away a multi-megabyte
     * buffer per redraw.
     */
    const sizeCanvas = (width, height, cssWidth, cssHeight) => {
        if (canvas.width !== width)
            canvas.width = width;
        if (canvas.height !== height)
            canvas.height = height;
        if (canvas.style.width !== cssWidth)
            canvas.style.width = cssWidth;
        if (canvas.style.height !== cssHeight)
            canvas.style.height = cssHeight;
    };
    const teamColorsKey = (teamColors) => teamColors.map((c) => `${c.r},${c.g},${c.b}`).join(";");
    const getTeamLayer = (teamColors, primaryRgb, width, height) => {
        var _a;
        const key = `${width}x${height}|${primaryRgb.r},${primaryRgb.g},${primaryRgb.b}|${teamColorsKey(teamColors)}`;
        if (teamLayer && teamLayerKey === key)
            return teamLayer;
        if (!teamLayer)
            teamLayer = document.createElement("canvas");
        teamLayer.width = width;
        teamLayer.height = height;
        const layerContext = teamLayer.getContext("2d");
        if (!layerContext)
            return null;
        const imageData = layerContext.createImageData(width, height);
        const data = imageData.data;
        let i = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = (_a = teamPrimaryFor(teamColors, x, y, width, height)) !== null && _a !== void 0 ? _a : primaryRgb;
                data[i++] = color.r;
                data[i++] = color.g;
                data[i++] = color.b;
                data[i++] = 255;
            }
        }
        layerContext.putImageData(imageData, 0, 0);
        teamLayerKey = key;
        return teamLayer;
    };
    /**
     * One tile of the pattern at 1 bitmap pixel per cell. Only set cells are
     * opaque; everything else stays transparent so the primary colour (or the
     * team-colour layer) shows through.
     */
    const buildPatternTile = (source, secondaryRgb) => {
        if (!tileContext)
            return null;
        const tileWidth = source.tileWidth;
        const tileHeight = source.tileHeight;
        if (tileWidth < 1 || tileHeight < 1)
            return null;
        if (tileCanvas.width !== tileWidth)
            tileCanvas.width = tileWidth;
        if (tileCanvas.height !== tileHeight)
            tileCanvas.height = tileHeight;
        const imageData = tileContext.createImageData(tileWidth, tileHeight);
        const data = imageData.data;
        const isSet = source.isSetCell;
        let i = 0;
        for (let y = 0; y < tileHeight; y++) {
            for (let x = 0; x < tileWidth; x++) {
                if (isSet(x, y)) {
                    data[i] = secondaryRgb.r;
                    data[i + 1] = secondaryRgb.g;
                    data[i + 2] = secondaryRgb.b;
                    data[i + 3] = 255;
                }
                i += 4;
            }
        }
        tileContext.putImageData(imageData, 0, 0);
        return tileCanvas;
    };
    function renderTiledPreview(source, primaryRgb, secondaryRgb, availW, availH, teamColors, isScrap) {
        // Displayed size of one tile cell in CSS px (zoom × encoded pattern scale).
        const zoomScale = Math.max(0.5, getZoom()) * (1 << source.scale);
        // Render at device-pixel resolution so the bitmap maps 1:1 to physical
        // pixels and the compositor never scales (no half-pixel rounding). Each
        // cell becomes a whole number of device px; only sub-device-pixel cells
        // (e.g. 50% of a scale-0 pattern on a 1x screen) fall back to
        // nearest-neighbour downsampling via image-rendering.
        const dpr = window.devicePixelRatio || 1;
        const deviceCell = zoomScale * dpr;
        const bitmapCell = deviceCell >= 1 ? Math.round(deviceCell) : 1;
        const deviceScale = deviceCell >= 1 ? 1 : deviceCell;
        // Actual displayed CSS px per cell after rounding to whole device pixels.
        // Rounding can shift this from the intended zoomScale (e.g. a fractional
        // devicePixelRatio), so the tile count must come from here — not zoomScale —
        // or the canvas would fall short of the panel edges.
        const cellDisplayPx = (bitmapCell * deviceScale) / dpr;
        // Repeat the pattern to the panel edges; partial edge tiles are clipped by
        // the overflow-hidden wrap, so the preview always fills regardless of panel
        // size or zoom.
        const cols = Math.max(1, Math.ceil(availW / cellDisplayPx));
        const rows = Math.max(1, Math.ceil(availH / cellDisplayPx));
        const width = cols * bitmapCell;
        const height = rows * bitmapCell;
        sizeCanvas(width, height, `${(width * deviceScale) / dpr}px`, `${(height * deviceScale) / dpr}px`);
        canvas.style.background = "";
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        // Primary background: either the team-colour wedge layer or a flat fill.
        if (teamColors && teamColors.length > 0) {
            const layer = getTeamLayer(teamColors, primaryRgb, width, height);
            if (layer) {
                context.drawImage(layer, 0, 0);
            }
            else {
                context.fillStyle = rgbCss(primaryRgb);
                context.fillRect(0, 0, width, height);
            }
        }
        else {
            context.fillStyle = rgbCss(primaryRgb);
            context.fillRect(0, 0, width, height);
        }
        // Overlay the repeating secondary-colour cells, scaled so one pattern cell
        // is exactly `bitmapCell` device pixels.
        const tile = buildPatternTile(source, secondaryRgb);
        if (tile) {
            const pattern = context.createPattern(tile, "repeat");
            if (pattern) {
                pattern.setTransform({ a: bitmapCell, b: 0, c: 0, d: bitmapCell, e: 0, f: 0 });
                context.imageSmoothingEnabled = false;
                context.fillStyle = pattern;
                context.fillRect(0, 0, width, height);
            }
        }
        // Scrap canvas watermark
        if (isScrap) {
            context.save();
            context.globalAlpha = 0.55;
            context.fillStyle = "#000000";
            context.fillRect(0, height - 34, width, 34);
            context.globalAlpha = 1;
            context.fillStyle = "#ffffff";
            context.font = "bold 15px 'DM Sans', sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText("< Test Canvas >", width / 2, height - 17);
            context.restore();
        }
    }
    return function renderPreview(pattern, isScrap = false, matrixScale = 0) {
        var _a, _b, _c;
        const source = typeof pattern === "string"
            ? patternSourceFromBase64(pattern)
            : patternSourceFromMatrix(pattern, matrixScale);
        const wrapRect = canvasWrap.getBoundingClientRect();
        const availW = wrapRect.width;
        const availH = wrapRect.height;
        // Hidden/collapsed panel: skip the redraw entirely. The ResizeObserver
        // re-renders as soon as it becomes visible again.
        if (availW < 1 || availH < 1)
            return;
        const primaryRgb = hexToRgb(primaryColorInput.value);
        const secondaryRgb = hexToRgb(secondaryColorInput.value);
        // Parse once per render, not once per pixel.
        const teamColors = (_b = (_a = getTeamColors === null || getTeamColors === void 0 ? void 0 : getTeamColors()) === null || _a === void 0 ? void 0 : _a.map(hexToRgb)) !== null && _b !== void 0 ? _b : null;
        const simMap = (_c = getSimMap === null || getSimMap === void 0 ? void 0 : getSimMap()) !== null && _c !== void 0 ? _c : null;
        if (simMap && simMap.image && simMap.mask) {
            renderMapSimulation(source, simMap, primaryRgb, secondaryRgb, availW, availH, teamColors);
            return;
        }
        renderTiledPreview(source, primaryRgb, secondaryRgb, availW, availH, teamColors, isScrap);
    };
    /**
     * Draw the map filling the preview panel (cover) and overlay the pattern at
     * the in-game scale: one pattern cell covers 2^scale map tiles, primary for
     * bit-0 cells and secondary for bit-1 cells, both blended at the in-game
     * territory alpha over land only (the grayscale land mask picks land).
     */
    function renderMapSimulation(source, simMap, primaryRgb, secondaryRgb, availW, availH, teamColors) {
        var _a;
        const { image, mask, width: mapW, height: mapH } = simMap;
        const dpr = window.devicePixelRatio || 1;
        const zoomScale = Math.max(0.5, getZoom());
        // Scale the map to cover the panel ("match the current pattern preview
        // size display"), preserving aspect ratio. Zoom magnifies the map and the
        // pattern together, exactly like zooming the in-game map.
        const cover = Math.max(availW / mapW, availH / mapH) * zoomScale;
        const dispW = Math.round(mapW * cover * dpr);
        const dispH = Math.round(mapH * cover * dpr);
        sizeCanvas(dispW, dispH, `${dispW / dpr}px`, `${dispH / dpr}px`);
        // In-game impassable / outside-map background so no primary colour shows
        // through sub-pixel gaps when zoomed out.
        canvas.style.background = "#3c3c3c";
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        // Map tiles per CSS px — with the same cover scale the pattern uses.
        const tilePx = cover;
        const scale = source.scale;
        const cached = mapCache;
        const sameMap = cached !== null &&
            cached.image === image &&
            cached.mask === mask &&
            cached.width === dispW &&
            cached.height === dispH;
        if (!sameMap) {
            if (!baseContext || !maskContext) {
                context.imageSmoothingEnabled = false;
                context.drawImage(image, 0, 0, dispW, dispH);
                return;
            }
            // Cache the scaled map pixels rather than reading them back each frame.
            baseCanvas.width = dispW;
            baseCanvas.height = dispH;
            baseContext.imageSmoothingEnabled = false;
            baseContext.clearRect(0, 0, dispW, dispH);
            baseContext.drawImage(image, 0, 0, dispW, dispH);
            mapBaseData = baseContext.getImageData(0, 0, dispW, dispH).data;
            // Cache the land mask as one byte per pixel; only land (white) tiles get
            // the pattern overlay.
            maskCanvas.width = dispW;
            maskCanvas.height = dispH;
            maskContext.imageSmoothingEnabled = false;
            maskContext.clearRect(0, 0, dispW, dispH);
            maskContext.drawImage(mask, 0, 0, dispW, dispH);
            const maskPixels = maskContext.getImageData(0, 0, dispW, dispH).data;
            mapLand = new Uint8Array(dispW * dispH);
            for (let p = 0, i = 0; p < mapLand.length; p++, i += 4) {
                mapLand[p] = maskPixels[i] >= 128 ? 1 : 0;
            }
        }
        if (!cached ||
            cached.tilePx !== tilePx ||
            cached.scale !== scale ||
            cached.width !== dispW ||
            cached.height !== dispH ||
            !mapColX ||
            !mapRowY) {
            // Precompute the cell lookup for every column/row so the pixel loop does
            // no divisions at all.
            mapColX = new Int32Array(dispW);
            mapRowY = new Int32Array(dispH);
            for (let px = 0; px < dispW; px++) {
                mapColX[px] = Math.floor(px / dpr / tilePx) >> scale;
            }
            for (let py = 0; py < dispH; py++) {
                mapRowY[py] = Math.floor(py / dpr / tilePx) >> scale;
            }
        }
        mapCache = {
            image: image,
            mask: mask,
            width: dispW,
            height: dispH,
            tilePx,
            scale,
        };
        // Per-pixel team-colour wedges are expensive (atan2 per pixel), so cache
        // them for the current size/colours.
        let primaryPixels = null;
        if (teamColors && teamColors.length > 0) {
            const key = `${dispW}x${dispH}|${primaryRgb.r},${primaryRgb.g},${primaryRgb.b}|${teamColorsKey(teamColors)}`;
            if (!mapPrimary || mapPrimaryKey !== key) {
                const pixels = new Uint8Array(dispW * dispH * 3);
                let i = 0;
                for (let y = 0; y < dispH; y++) {
                    for (let x = 0; x < dispW; x++) {
                        const color = (_a = teamPrimaryFor(teamColors, x, y, dispW, dispH)) !== null && _a !== void 0 ? _a : primaryRgb;
                        pixels[i++] = color.r;
                        pixels[i++] = color.g;
                        pixels[i++] = color.b;
                    }
                }
                mapPrimary = pixels;
                mapPrimaryKey = key;
            }
            primaryPixels = mapPrimary;
        }
        if (!mapBaseData)
            return;
        if (!mapOutput || mapOutput.width !== dispW || mapOutput.height !== dispH) {
            mapOutput = context.createImageData(dispW, dispH);
        }
        const output = mapOutput.data;
        output.set(mapBaseData);
        const isSet = source.isSetCell;
        const land = mapLand;
        const colX = mapColX;
        const rowY = mapRowY;
        const primary = primaryRgb;
        for (let py = 0; py < dispH; py++) {
            const cy = rowY[py];
            const rowStart = py * dispW;
            for (let px = 0; px < dispW; px++) {
                const p = rowStart + px;
                // Land mask from the grayscale mask; water/impassable stay untouched.
                if (land && land[p] === 0)
                    continue;
                const idx = p << 2;
                let cr;
                let cg;
                let cb;
                if (isSet(colX[px], cy)) {
                    cr = secondaryRgb.r;
                    cg = secondaryRgb.g;
                    cb = secondaryRgb.b;
                }
                else if (primaryPixels) {
                    const j = p * 3;
                    cr = primaryPixels[j];
                    cg = primaryPixels[j + 1];
                    cb = primaryPixels[j + 2];
                }
                else {
                    cr = primary.r;
                    cg = primary.g;
                    cb = primary.b;
                }
                output[idx] = (cr * TERRITORY_ALPHA + output[idx] * TERRITORY_INV + 0.5) | 0;
                output[idx + 1] = (cg * TERRITORY_ALPHA + output[idx + 1] * TERRITORY_INV + 0.5) | 0;
                output[idx + 2] = (cb * TERRITORY_ALPHA + output[idx + 2] * TERRITORY_INV + 0.5) | 0;
                output[idx + 3] = 255;
            }
        }
        context.putImageData(mapOutput, 0, 0);
    }
}
