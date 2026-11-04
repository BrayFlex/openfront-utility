/** 1-bit fill patterns, ordered from darkest (solid) to lightest (erase). */
export type FillStyleId = "solid" | "dense" | "half" | "light" | "erase";

export type FillStyle = {
  id: FillStyleId;
  /** Name used only in tooltips and accessible labels — the UI is visual. */
  label: string;
  /** Whether the cell at (x, y) is marked, relative to the fill origin. */
  isMarked: (x: number, y: number) => boolean;
};

/** Positive modulo, so patterns line up when filling above/left of the origin. */
const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export const FILL_STYLES: FillStyle[] = [
  {
    id: "solid",
    label: "Solid fill",
    isMarked: () => true,
  },
  {
    id: "dense",
    label: "Heavy dither (75%)",
    isMarked: (x, y) => !(mod(x, 2) === 0 && mod(y, 2) === 0),
  },
  {
    id: "half",
    label: "Checkerboard (50%)",
    isMarked: (x, y) => mod(x + y, 2) === 0,
  },
  {
    id: "light",
    label: "Light dither (25%)",
    isMarked: (x, y) => mod(x, 2) === 0 && mod(y, 2) === 0,
  },
  {
    id: "erase",
    label: "Erase",
    isMarked: () => false,
  },
];

export const DEFAULT_FILL_STYLE: FillStyleId = "solid";

export function getFillStyle(id: FillStyleId): FillStyle {
  return FILL_STYLES.find((style) => style.id === id) ?? FILL_STYLES[0];
}
