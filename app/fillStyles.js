/** Positive modulo, so patterns line up when filling above/left of the origin. */
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
/**
 * The sparse 12.5% lattice: within each 4×4 tile only (0,0) and (2,2) are
 * marked. Horizontally and vertically that leaves three clear cells between
 * marks, while diagonally marks alternate with a single clear cell.
 */
const isSparseMarked = (x, y) => mod(y, 2) === 0 && mod(x - y, 4) === 0;
export const FILL_STYLES = [
    {
        id: "solid",
        label: "Solid fill",
        isMarked: () => true,
    },
    {
        id: "denser",
        label: "Extra-dense dither (87.5%)",
        isMarked: (x, y) => !isSparseMarked(x, y),
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
        id: "fainter",
        label: "Extra-light dither (12.5%)",
        isMarked: isSparseMarked,
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
