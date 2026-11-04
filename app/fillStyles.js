/** Positive modulo, so patterns line up when filling above/left of the origin. */
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
export const FILL_STYLES = [
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
export const DEFAULT_FILL_STYLE = "solid";
export function getFillStyle(id) {
    var _a;
    return (_a = FILL_STYLES.find((style) => style.id === id)) !== null && _a !== void 0 ? _a : FILL_STYLES[0];
}
