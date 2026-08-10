import { create as createNoUiSlider, PipsMode } from "nouislider";

export type ToolKind =
  | "pencil"
  | "circle"
  | "shape"
  | "line"
  | "fill"
  | "shade"
  | "selectArea"
  | "paste";

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
  circle: { min: 1, max: 30, step: 1, defaultValue: 7, label: "Size" },
  shape: { min: 1, max: 30, step: 1, defaultValue: 5, label: "Size" },
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
  getShapeRadius: () => number;
  getShapeType: () => string;
  getCircleRadius: () => number;
  subscribeToToolChanges: (listener: (tool: ToolKind) => void) => () => void;
  /** Returns the current slider value for any sized tool */
  getCurrentSize: () => number;
  getPreviousTool: () => ToolKind;
  restoreTool: () => void;
};

export function createToolState(options: ToolStateOptions): ToolState {
  const { toolButtons, sizeSlider, sizeOutput, sizeGroup } = options;
  const shapeTypeSelect = document.getElementById("shapeType") as HTMLSelectElement;

  let currentTool: ToolKind = "pencil";
  let previousTool: ToolKind = "pencil";
  let lastNonSelectTool: ToolKind = "pencil";
  // Per-tool remembered sizes
  const rememberedSizes: Partial<Record<ToolKind, number>> = {};
  const listeners = new Set<(tool: ToolKind) => void>();

  // Initialize noUiSlider
  const slider = createNoUiSlider(sizeSlider, {
    start: [1],
    connect: "lower",
    direction: "rtl", // Right-to-left so 0% is at top (max value)
    orientation: "vertical",
    range: {
      min: 1,
      max: 10,
    },
    step: 1,
    pips: {
      mode: PipsMode.Steps,
      density: 100,
    },
    tooltips: false,
  });

  const updateSizeSlider = (tool: ToolKind) => {
    const config = TOOL_SIZE_CONFIGS[tool];
    if (!config) {
      if (sizeGroup) sizeGroup.hidden = true;
      return;
    }
    if (sizeGroup) sizeGroup.hidden = false;
    
    // Update noUiSlider range and step
    slider.updateOptions({
      range: {
        min: config.min,
        max: config.max,
      },
      step: config.step,
      pips: {
        mode: PipsMode.Steps,
        density: 100,
      },
    }, false);
    
    // Restore remembered size or use default
    const value = rememberedSizes[tool] ?? config.defaultValue;
    slider.set(value);
    
    if (sizeOutput) {
      sizeOutput.min = String(config.min);
      sizeOutput.max = String(config.max);
      sizeOutput.value = String(value);
    }
  };

  function selectTool(tool: ToolKind) {
    // Save current size before switching
    if (TOOL_SIZE_CONFIGS[currentTool]) {
      rememberedSizes[currentTool] = slider.get() as number;
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

  // Wire up tool buttons
  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool as ToolKind | undefined;
      if (tool) selectTool(tool);
    });
  });

  // Wire up noUiSlider events
  slider.on("update", (values: (string | number)[]) => {
    const value = parseInt(values[0] as string);
    if (sizeOutput) sizeOutput.value = String(value);
    if (TOOL_SIZE_CONFIGS[currentTool]) {
      rememberedSizes[currentTool] = value;
    }
  });

  // Wire up size numeric input
  if (sizeOutput) {
    sizeOutput.addEventListener("change", () => {
      let val = parseInt(sizeOutput.value);
      if (isNaN(val)) val = 1;
      const config = TOOL_SIZE_CONFIGS[currentTool];
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
      if (currentTool === "pencil") return slider.get() as number;
      return rememberedSizes["pencil"] ?? 1;
    },
    getShapeRadius: () => {
      const size = currentTool === "shape"
        ? slider.get() as number
        : (rememberedSizes["shape"] ?? 5);
      return size;
    },
    getShapeType: () => shapeTypeSelect ? shapeTypeSelect.value : "star",
    getCircleRadius: () => {
      const size = currentTool === "circle"
        ? slider.get() as number
        : (rememberedSizes["circle"] ?? 7);
      return Math.max(0, Math.floor(size / 2));
    },
    subscribeToToolChanges: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getCurrentSize: () => slider.get() as number,
  };
}
