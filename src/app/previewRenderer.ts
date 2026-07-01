import { PatternDecoder } from "./patternEncoding.js";

type RgbColor = { r: number; g: number; b: number };

type PreviewRendererOptions = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  primaryColorInput: HTMLInputElement;
  secondaryColorInput: HTMLInputElement;
};

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
}

export function createPreviewRenderer(options: PreviewRendererOptions) {
  const { canvas, context, primaryColorInput, secondaryColorInput } = options;

  return function renderPreview(pattern: string, isScrap = false) {
    const decoder = new PatternDecoder(pattern);
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
        if (decoder.isSet(x, y)) {
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
      context.fillText("SCRAP CANVAS — NOT MAIN PATTERN", width / 2, height - 17);
      context.restore();
    }
  };
}
