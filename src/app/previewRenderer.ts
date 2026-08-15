import { PatternDecoder } from "./patternEncoding.js";

type RgbColor = { r: number; g: number; b: number };

type PreviewRendererOptions = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  primaryColorInput: HTMLInputElement;
  secondaryColorInput: HTMLInputElement;
  canvasWrap: HTMLElement;
  getZoom: () => number;
};

type PatternSource = {
  isSetCell: (cx: number, cy: number) => boolean;
  tileWidth: number;
  tileHeight: number;
  scale: number;
};

function patternSourceFromBase64(base64: string): PatternSource {
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

function patternSourceFromMatrix(pattern: number[][]): PatternSource {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  return {
    isSetCell: (cx, cy) => (pattern[cy % height]?.[cx % width] ?? 0) === 1,
    tileWidth: width,
    tileHeight: height,
    scale: 0,
  };
}

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
}

export function createPreviewRenderer(options: PreviewRendererOptions) {
  const { canvas, context, primaryColorInput, secondaryColorInput, canvasWrap, getZoom } = options;

  return function renderPreview(pattern: string | number[][], isScrap = false) {
    const source =
      typeof pattern === "string"
        ? patternSourceFromBase64(pattern)
        : patternSourceFromMatrix(pattern);

    const wrapRect = canvasWrap.getBoundingClientRect();
    const availW = wrapRect.width;
    const availH = wrapRect.height;

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

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${(width * deviceScale) / dpr}px`;
    canvas.style.height = `${(height * deviceScale) / dpr}px`;

    const primaryRgb = hexToRgb(primaryColorInput.value);
    const secondaryRgb = hexToRgb(secondaryColorInput.value);

    const imageData = context.createImageData(width, height);
    const data = imageData.data;
    let i = 0;
    for (let y = 0; y < height; y++) {
      const cy = Math.floor(y / bitmapCell);
      for (let x = 0; x < width; x++) {
        const cx = Math.floor(x / bitmapCell);
        if (source.isSetCell(cx, cy)) {
          data[i++] = secondaryRgb.r;
          data[i++] = secondaryRgb.g;
          data[i++] = secondaryRgb.b;
        } else {
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
