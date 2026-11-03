// Faded tiled repeat of the pattern around the drawing canvas. It sits behind
// the grid/rulers so the next tile over is faintly visible while drawing,
// making it easy to judge how the pattern continues across the seam.
// Keep the canvas convention in both themes: light "paper" with near-black
// marks. In dark mode a faint paper wash lifts the workspace background just
// enough for the black marks to read, rather than inverting the pattern.
const GHOST_PAPER = "#ffffff";
const GHOST_INK = "#000000";
const GHOST_ALPHA = {
    light: { paper: 0, ink: 0.22 },
    dark: { paper: 0.15, ink: 0.5 },
};
export function createTileGhostRenderer(options) {
    const { canvas, workspace, getGrid } = options;
    const ctx = canvas.getContext("2d");
    const tile = document.createElement("canvas");
    let raf = 0;
    const draw = () => {
        var _a, _b;
        if (!ctx)
            return;
        const info = getGrid();
        if (!info)
            return;
        const { element, pattern } = info;
        const patternH = pattern.length;
        const patternW = (_b = (_a = pattern[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        if (patternW === 0 || patternH === 0)
            return;
        const wsRect = workspace.getBoundingClientRect();
        const cssW = wsRect.width;
        const cssH = wsRect.height;
        if (cssW < 1 || cssH < 1)
            return;
        const gridRect = element.getBoundingClientRect();
        if (gridRect.width < 1 || gridRect.height < 1)
            return;
        // The grid is scaled by the workspace zoom transform, so recover that scale
        // from the rendered vs. layout width and derive the displayed tile size
        // from the un-scaled client box (which excludes the 1px grid border).
        const layoutW = element.offsetWidth || 1;
        const scale = gridRect.width / layoutW;
        const style = getComputedStyle(element);
        const borderLeft = (parseFloat(style.borderLeftWidth) || 0) * scale;
        const borderTop = (parseFloat(style.borderTopWidth) || 0) * scale;
        const tileW = element.clientWidth * scale;
        const tileH = element.clientHeight * scale;
        if (tileW < 0.5 || tileH < 0.5)
            return;
        const originX = gridRect.left - wsRect.left + borderLeft;
        const originY = gridRect.top - wsRect.top + borderTop;
        const dpr = window.devicePixelRatio || 1;
        const bitmapW = Math.max(1, Math.round(cssW * dpr));
        const bitmapH = Math.max(1, Math.round(cssH * dpr));
        if (canvas.width !== bitmapW)
            canvas.width = bitmapW;
        if (canvas.height !== bitmapH)
            canvas.height = bitmapH;
        // Rebuild the 1px-per-cell tile bitmap from the current pattern.
        if (tile.width !== patternW)
            tile.width = patternW;
        if (tile.height !== patternH)
            tile.height = patternH;
        const tileCtx = tile.getContext("2d");
        if (!tileCtx)
            return;
        tileCtx.clearRect(0, 0, patternW, patternH);
        tileCtx.fillStyle = GHOST_INK;
        for (let y = 0; y < patternH; y++) {
            const row = pattern[y];
            for (let x = 0; x < patternW; x++) {
                if (row[x] === 1)
                    tileCtx.fillRect(x, y, 1, 1);
            }
        }
        const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
        const alphas = GHOST_ALPHA[theme];
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, bitmapW, bitmapH);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Paper wash: in dark mode this lightens the area outside the canvas so the
        // black marks below stay readable instead of flipping to light-on-dark.
        if (alphas.paper > 0) {
            ctx.globalAlpha = alphas.paper;
            ctx.fillStyle = GHOST_PAPER;
            ctx.fillRect(0, 0, cssW, cssH);
        }
        ctx.globalAlpha = alphas.ink;
        ctx.imageSmoothingEnabled = false;
        // Repeat the tile to (and beyond) the workspace edges, aligned so tile
        // (0,0) matches the top-left cell of the drawable grid.
        const startCol = Math.floor((0 - originX) / tileW);
        const endCol = Math.ceil((cssW - originX) / tileW);
        const startRow = Math.floor((0 - originY) / tileH);
        const endRow = Math.ceil((cssH - originY) / tileH);
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                ctx.drawImage(tile, originX + col * tileW, originY + row * tileH, tileW, tileH);
            }
        }
        ctx.globalAlpha = 1;
    };
    const render = () => {
        if (raf)
            return;
        raf = requestAnimationFrame(() => {
            raf = 0;
            draw();
        });
    };
    return { render, draw };
}
