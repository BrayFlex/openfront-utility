export type ToolKind =
  | "pencil"
  | "line"
  | "fill"
  | "shade"
  | "star"
  | "circle"
  | "selectArea"
  | "selectCustom"
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
  pencil: { min: 1, max: 9, step: 2, defaultValue: 1, label: "Size" },
  circle: { min: 1, max: 30, step: 1, defaultValue: 5, label: "Size" },
  star: { min: 1, max: 8, step: 1, defaultValue: 3, label: "Size" },
};

type ToolStateOptions = {
  toolButtons: NodeListOf<HTMLButtonElement>;
  sizeSlider: HTMLInputElement;
  sizeOutput: HTMLElement;
  sizeGroup: HTMLElement;
};

export type ToolState = {
  getCurrentTool: () => ToolKind;
  selectTool: (tool: ToolKind) => void;
  getPencilSize: () => number;
  getStarRadius: () => number;
  getCircleRadius: () => number;
  subscribeToToolChanges: (listener: (tool: ToolKind) => void) => () => void;
  /** Returns the current slider value for any sized tool */
  getCurrentSize: () => number;
};

export function createToolState(options: ToolStateOptions): ToolState {
  const { toolButtons, sizeSlider, sizeOutput, sizeGroup } = options;

  let currentTool: ToolKind = "pencil";
  // Per-tool remembered sizes
  const rememberedSizes: Partial<Record<ToolKind, number>> = {};
  const listeners = new Set<(tool: ToolKind) => void>();

  const updateSizeSlider = (tool: ToolKind) => {
    const config = TOOL_SIZE_CONFIGS[tool];
    if (!config) {
      sizeGroup.hidden = true;
      return;
    }
    sizeGroup.hidden = false;
    sizeSlider.min = String(config.min);
    sizeSlider.max = String(config.max);
    sizeSlider.step = String(config.step);
    // Restore remembered size or use default
    sizeSlider.value = String(rememberedSizes[tool] ?? config.defaultValue);
    sizeOutput.textContent = sizeSlider.value;
  };

  function selectTool(tool: ToolKind) {
    // Save current size before switching
    if (TOOL_SIZE_CONFIGS[currentTool]) {
      rememberedSizes[currentTool] = parseInt(sizeSlider.value);
    }
    currentTool = tool;
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

  // Wire up size slider
  sizeSlider.addEventListener("input", () => {
    sizeOutput.textContent = sizeSlider.value;
    if (TOOL_SIZE_CONFIGS[currentTool]) {
      rememberedSizes[currentTool] = parseInt(sizeSlider.value);
    }
  });

  // Initialize
  selectTool("pencil");

  return {
    getCurrentTool: () => currentTool,
    selectTool,
    getPencilSize: () => {
      if (currentTool === "pencil") return parseInt(sizeSlider.value);
      return rememberedSizes["pencil"] ?? 1;
    },
    getStarRadius: () => {
      const size = currentTool === "star"
        ? parseInt(sizeSlider.value)
        : (rememberedSizes["star"] ?? 3);
      return size;
    },
    getCircleRadius: () => {
      const size = currentTool === "circle"
        ? parseInt(sizeSlider.value)
        : (rememberedSizes["circle"] ?? 5);
      return Math.max(0, Math.floor(size / 2));
    },
    subscribeToToolChanges: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getCurrentSize: () => parseInt(sizeSlider.value),
  };
}
