import { create as createNoUiSlider, PipsMode } from "nouislider";
import { DEFAULT_FILL_STYLE, type FillStyleId } from "./fillStyles.js";

export type ToolKind =
  | "pencil"
  | "circle"
  | "shape"
  | "line"
  | "fill"
  | "selectArea"
  | "paste";

/** Mathematically drawn shapes available in the Shape tool. */
export type ShapeType =
  | "circle"
  | "cube"
  | "star"
  | "triangle"
  | "diamond"
  | "hexagon";

/** Cube half-width/half-height as a multiple of the Shape size slider. */
export type ShapeRatio = {
  width: number;
  height: number;
};

/** Straight lines are committed on the second click; curved lines stay
 *  editable until the user presses Draw. */
export type LineMode = "straight" | "curve";

/** Pencil footprint: a square block or a circular dot. */
export type PencilTip = "sharp" | "soft";

/** How the Select tool gathers cells. */
export type SelectMode = "regular" | "lasso" | "object";

/** Which pixel colours an operation reads (Select) or writes (Overwrite). */
export type SelectionColor = "black" | "both" | "white";

export const SHAPE_TYPES: { type: ShapeType; label: string; icon: string }[] = [
  { type: "circle", label: "Circle", icon: "○" },
  { type: "cube", label: "Cube", icon: "▣" },
  { type: "star", label: "Star", icon: "★" },
  { type: "triangle", label: "Triangle", icon: "△" },
  { type: "diamond", label: "Diamond", icon: "◇" },
  { type: "hexagon", label: "Hexagon", icon: "⬡" },
];

const DEFAULT_SHAPE_RATIO: ShapeRatio = { width: 1.73, height: 1 };
const SHAPE_RATIO_MIN = 0.25;
const SHAPE_RATIO_MAX = 4;
const SHAPE_DEFAULT_SIZE = 10;
const SHAPE_CIRCLE_MAX_SIZE = 128;
const SHAPE_OTHER_MAX_SIZE = 64;

/** Maps each tool to its slider config, or null if the tool has no size slider */
export type ToolSizeConfig = {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  label: string;
};

const TOOL_SIZE_CONFIGS: Partial<Record<ToolKind, ToolSizeConfig>> = {
  pencil: { min: 1, max: 9, step: 1, defaultValue: 1, label: "Size" },
  line: { min: 1, max: 9, step: 1, defaultValue: 1, label: "Size" },
  circle: { min: 1, max: 30, step: 1, defaultValue: 7, label: "Size" },
};

type ToolStateOptions = {
  toolButtons: NodeListOf<HTMLButtonElement>;
  sizeSlider: HTMLElement; // noUiSlider container div
  sizeOutput: HTMLInputElement;
  sizeGroup: HTMLElement;
};

export type ToolState = {
  getCurrentTool: () => ToolKind;
  selectTool: (tool: ToolKind) => void;
  getPencilSize: () => number;
  getPencilTip: () => PencilTip;
  setPencilTip: (tip: PencilTip) => void;
  /** Line tool Size slider value (stroke thickness in cells). */
  getLineSize: () => number;
  getLineMode: () => LineMode;
  setLineMode: (mode: LineMode) => void;
  /** Shape tool Size slider value: the shape's overall width in cells. */
  getShapeSize: () => number;
  getShapeType: () => ShapeType;
  setShapeType: (type: ShapeType) => void;
  getShapeRatio: () => ShapeRatio;
  setShapeRatio: (ratio: Partial<ShapeRatio>) => void;
  /** Pattern used by the Fill tool. */
  getFillStyle: () => FillStyleId;
  setFillStyle: (style: FillStyleId) => void;
  getCircleRadius: () => number;
  /** Select tool gathering mode (rectangle, freehand or connected pixels). */
  getSelectMode: () => SelectMode;
  setSelectMode: (mode: SelectMode) => void;
  /** Which pixels operations read from the selection. */
  getSelectColor: () => SelectionColor;
  setSelectColor: (color: SelectionColor) => void;
  /** Which pixels operations are allowed to overwrite. */
  getOverwriteColor: () => SelectionColor;
  setOverwriteColor: (color: SelectionColor) => void;
  subscribeToToolChanges: (listener: (tool: ToolKind) => void) => () => void;
  subscribeToShapeChanges: (listener: () => void) => () => void;
  subscribeToFillChanges: (listener: () => void) => () => void;
  subscribeToPencilChanges: (listener: () => void) => () => void;
  subscribeToLineChanges: (listener: () => void) => () => void;
  subscribeToSelectChanges: (listener: () => void) => () => void;
  /** Returns the current slider value for any sized tool */
  getCurrentSize: () => number;
  /** Step the active tool's size up/down. Returns false when it has no size. */
  adjustCurrentSize: (delta: number) => boolean;
  getPreviousTool: () => ToolKind;
  restoreTool: () => void;
};

export function createToolState(options: ToolStateOptions): ToolState {
  const { toolButtons, sizeSlider, sizeOutput, sizeGroup } = options;

  let currentTool: ToolKind = "pencil";
  let previousTool: ToolKind = "pencil";
  let lastNonSelectTool: ToolKind = "pencil";
  let shapeType: ShapeType = "circle";
  let shapeRatio: ShapeRatio = { ...DEFAULT_SHAPE_RATIO };
  let fillStyle: FillStyleId = DEFAULT_FILL_STYLE;
  let pencilTip: PencilTip = "sharp";
  let lineMode: LineMode = "straight";
  let selectMode: SelectMode = "regular";
  let selectColor: SelectionColor = "both";
  let overwriteColor: SelectionColor = "both";
  // Per-tool remembered sizes
  const rememberedSizes: Partial<Record<ToolKind, number>> = {};
  const listeners = new Set<(tool: ToolKind) => void>();
  const shapeListeners = new Set<() => void>();
  const fillListeners = new Set<() => void>();
  const pencilListeners = new Set<() => void>();
  const lineListeners = new Set<() => void>();
  const selectListeners = new Set<() => void>();

  // Initialize noUiSlider
  const slider = createNoUiSlider(sizeSlider, {
    start: [1],
    connect: false, // No colored progress track - just the track and thumb
    direction: "rtl", // Right-to-left so 0% is at top (max value)
    orientation: "vertical",
    range: {
      min: 1,
      max: 10,
    },
    step: 1,
    pips: {
      mode: PipsMode.Values,
      values: [1], // Will be updated per tool
      density: 100,
      format: {
        to: (value: number) => String(value),
        from: (value: string) => Number(value),
      },
    },
    tooltips: false,
  });

  // Helper to get slider value as number
  const getSliderValue = () => {
    const val = slider.get();
    return Array.isArray(val) ? parseInt(val[0] as string) : parseInt(val as string);
  };

  /** Size config for a tool. Shape ranges depend on the selected shape. */
  const getSizeConfig = (tool: ToolKind): ToolSizeConfig | undefined => {
    if (tool === "shape") {
      return {
        min: 1,
        max: shapeType === "circle" ? SHAPE_CIRCLE_MAX_SIZE : SHAPE_OTHER_MAX_SIZE,
        step: 1,
        defaultValue: SHAPE_DEFAULT_SIZE,
        label: "Size",
      };
    }
    return TOOL_SIZE_CONFIGS[tool];
  };

  /**
   * Show every value for small ranges, but only a readable subset for large
   * ranges like the 128px circle, where one label per pixel would be unusable.
   */
  const buildPipValues = (config: ToolSizeConfig) => {
    const values: number[] = [];
    const span = config.max - config.min;
    if (span <= 30) {
      for (let v = config.min; v <= config.max; v += config.step) values.push(v);
      return values;
    }

    const targetCount = 20;
    const rawStep = span / (targetCount - 1);
    const niceSteps = [1, 2, 4, 5, 8, 10, 16, 20, 25, 32, 40, 50, 64];
    const step = niceSteps.find((candidate) => candidate >= rawStep) ?? Math.ceil(rawStep);

    values.push(config.min);
    for (let v = Math.ceil(config.min / step) * step; v < config.max; v += step) {
      if (v > config.min) values.push(v);
    }
    values.push(config.max);
    return values;
  };

  const updateSizeSlider = (tool: ToolKind, preserveValue = false) => {
    const config = getSizeConfig(tool);
    if (!config) {
      if (sizeGroup) sizeGroup.hidden = true;
      return;
    }
    if (sizeGroup) sizeGroup.hidden = false;

    // Capture before updateOptions, which may clamp the current value to the
    // new range (e.g. switching from a 128px circle to a 64px shape).
    const previousValue = getSliderValue();

    // Update noUiSlider range, step, and pips
    slider.updateOptions({
      range: {
        min: config.min,
        max: config.max,
      },
      step: config.step,
      pips: {
        mode: PipsMode.Values,
        values: buildPipValues(config),
        density: 100,
        format: {
          to: (value: number) => String(value),
          from: (value: string) => Number(value),
        },
      },
    }, false);

    // Restore the remembered size (or keep the current value) and clamp it to
    // the tool's current range.
    const requestedValue = preserveValue
      ? previousValue
      : (rememberedSizes[tool] ?? config.defaultValue);
    const value = Math.max(config.min, Math.min(config.max, requestedValue));
    rememberedSizes[tool] = value;
    slider.set(value);

    if (sizeOutput) {
      sizeOutput.min = String(config.min);
      sizeOutput.max = String(config.max);
      sizeOutput.value = String(value);
    }
  };

  function selectTool(tool: ToolKind) {
    // Save current size before switching
    if (getSizeConfig(currentTool)) {
      rememberedSizes[currentTool] = getSliderValue();
    }
    
    previousTool = currentTool;
    currentTool = tool;
    
    if (tool !== "selectArea") {
      lastNonSelectTool = tool;
    }

    toolButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.tool === tool);
    });
    updateSizeSlider(tool);
    listeners.forEach((l) => l(tool));
  }

  /**
   * Step the current tool's size. Used by Ctrl/⌘ + arrow keys so the slider can
   * be adjusted without opening the size popover.
   */
  const adjustCurrentSize = (delta: number) => {
    const config = getSizeConfig(currentTool);
    if (!config) return false;
    const current = getSliderValue();
    const next = Math.max(
      config.min,
      Math.min(config.max, current + delta * config.step)
    );
    if (next !== current) {
      slider.set(next);
      rememberedSizes[currentTool] = next;
      if (sizeOutput) sizeOutput.value = String(next);
    }
    return true;
  };

  // Wire up tool buttons
  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool as ToolKind | undefined;
      if (tool) selectTool(tool);
    });
  });

  // Wire up noUiSlider events
  // Only update the numeric input display; do NOT save to rememberedSizes here
  // because that would overwrite during tool switching (updateOptions triggers update events)
  // Saving is handled explicitly in selectTool (before switch) and sizeOutput change handler
  slider.on("update", (values: (string | number)[]) => {
    const value = parseInt(values[0] as string);
    if (sizeOutput) sizeOutput.value = String(value);
  });

  // Wire up size numeric input
  if (sizeOutput) {
    sizeOutput.addEventListener("change", () => {
      let val = parseInt(sizeOutput.value);
      if (isNaN(val)) val = 1;
      const config = getSizeConfig(currentTool);
      if (config) {
        val = Math.max(config.min, Math.min(config.max, val));
        sizeOutput.value = String(val);
        slider.set(val);
        rememberedSizes[currentTool] = val;
      }
    });
  }

  // Initialize
  selectTool("pencil");

  return {
    getCurrentTool: () => currentTool,
    getPreviousTool: () => previousTool,
    selectTool,
    restoreTool: () => selectTool(lastNonSelectTool),
    getPencilSize: () => {
      if (currentTool === "pencil") return getSliderValue();
      return rememberedSizes["pencil"] ?? 1;
    },
    getPencilTip: () => pencilTip,
    setPencilTip: (tip) => {
      if (pencilTip === tip) return;
      pencilTip = tip;
      pencilListeners.forEach((listener) => listener());
    },
    getLineSize: () => {
      const config = getSizeConfig("line")!;
      const size = currentTool === "line"
        ? getSliderValue()
        : (rememberedSizes["line"] ?? config.defaultValue);
      return Math.max(config.min, Math.min(config.max, size));
    },
    getLineMode: () => lineMode,
    setLineMode: (mode) => {
      if (lineMode === mode) return;
      lineMode = mode;
      lineListeners.forEach((listener) => listener());
    },
    getShapeSize: () => {
      const config = getSizeConfig("shape")!;
      const size = currentTool === "shape"
        ? getSliderValue()
        : (rememberedSizes["shape"] ?? config.defaultValue);
      return Math.max(config.min, Math.min(config.max, size));
    },
    getShapeType: () => shapeType,
    setShapeType: (type) => {
      if (shapeType === type) return;
      shapeType = type;
      // The circle can be drawn much larger than the other shapes, so the size
      // range (and the current value, if it is now out of bounds) must follow
      // the newly selected shape.
      if (currentTool === "shape") updateSizeSlider("shape", true);
      shapeListeners.forEach((listener) => listener());
    },
    getShapeRatio: () => ({ ...shapeRatio }),
    setShapeRatio: (next) => {
      const clamp = (value: number, fallback: number) => {
        if (!Number.isFinite(value)) return fallback;
        const clamped = Math.min(SHAPE_RATIO_MAX, Math.max(SHAPE_RATIO_MIN, value));
        return Math.round(clamped * 100) / 100;
      };
      const width = clamp(next.width ?? shapeRatio.width, shapeRatio.width);
      const height = clamp(next.height ?? shapeRatio.height, shapeRatio.height);
      if (width === shapeRatio.width && height === shapeRatio.height) return;
      shapeRatio = { width, height };
      shapeListeners.forEach((listener) => listener());
    },
    getFillStyle: () => fillStyle,
    setFillStyle: (style) => {
      if (fillStyle === style) return;
      fillStyle = style;
      fillListeners.forEach((listener) => listener());
    },
    getCircleRadius: () => {
      const size = currentTool === "circle"
        ? getSliderValue()
        : (rememberedSizes["circle"] ?? 7);
      return Math.max(0, Math.floor(size / 2));
    },
    getSelectMode: () => selectMode,
    setSelectMode: (mode) => {
      if (selectMode === mode) return;
      selectMode = mode;
      selectListeners.forEach((listener) => listener());
    },
    getSelectColor: () => selectColor,
    setSelectColor: (color) => {
      if (selectColor === color) return;
      selectColor = color;
      selectListeners.forEach((listener) => listener());
    },
    getOverwriteColor: () => overwriteColor,
    setOverwriteColor: (color) => {
      if (overwriteColor === color) return;
      overwriteColor = color;
      selectListeners.forEach((listener) => listener());
    },
    subscribeToToolChanges: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeToShapeChanges: (listener) => {
      shapeListeners.add(listener);
      return () => shapeListeners.delete(listener);
    },
    subscribeToFillChanges: (listener) => {
      fillListeners.add(listener);
      return () => fillListeners.delete(listener);
    },
    subscribeToPencilChanges: (listener) => {
      pencilListeners.add(listener);
      return () => pencilListeners.delete(listener);
    },
    subscribeToLineChanges: (listener) => {
      lineListeners.add(listener);
      return () => lineListeners.delete(listener);
    },
    subscribeToSelectChanges: (listener) => {
      selectListeners.add(listener);
      return () => selectListeners.delete(listener);
    },
    getCurrentSize: () => getSliderValue(),
    adjustCurrentSize,
  };
}
