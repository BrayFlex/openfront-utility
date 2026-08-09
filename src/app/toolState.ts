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
  sizeSlider: HTMLInputElement;
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

  const updateSizeSlider = (tool: ToolKind) => {
    const config = TOOL_SIZE_CONFIGS[tool];
    if (!config) {
      if (sizeGroup) sizeGroup.hidden = true;
      return;
    }
    if (sizeGroup) sizeGroup.hidden = false;
    if (sizeSlider) {
      sizeSlider.min = String(config.min);
      sizeSlider.max = String(config.max);
      sizeSlider.step = String(config.step);
      // Restore remembered size or use default
      sizeSlider.value = String(rememberedSizes[tool] ?? config.defaultValue);
      // Rebuild datalist notches to match the tool's range
      if (sizeSlider.list) {
        sizeSlider.list.innerHTML = "";
        for (let i = config.min; i <= config.max; i += config.step) {
          const option = document.createElement("option");
          option.value = String(i);
          sizeSlider.list.appendChild(option);
        }
      }
    }
    if (sizeOutput) {
      sizeOutput.min = String(config.min);
      sizeOutput.max = String(config.max);
      sizeOutput.value = sizeSlider?.value ?? "1";
    }
  };

  function selectTool(tool: ToolKind) {
    // Save current size before switching
    if (TOOL_SIZE_CONFIGS[currentTool]) {
      rememberedSizes[currentTool] = parseInt(sizeSlider.value);
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

  // Wire up size slider
  if (sizeSlider) {
    sizeSlider.addEventListener("input", () => {
      if (sizeOutput) sizeOutput.value = sizeSlider.value;
      if (TOOL_SIZE_CONFIGS[currentTool]) {
        rememberedSizes[currentTool] = parseInt(sizeSlider.value);
      }
    });
  }

  // Wire up size numeric input
  if (sizeOutput) {
    sizeOutput.addEventListener("change", () => {
      let val = parseInt(sizeOutput.value);
      if (isNaN(val)) val = 1;
      const config = TOOL_SIZE_CONFIGS[currentTool];
      if (config) {
        val = Math.max(config.min, Math.min(config.max, val));
        sizeOutput.value = String(val);
        if (sizeSlider) sizeSlider.value = String(val);
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
      if (currentTool === "pencil") return parseInt(sizeSlider.value);
      return rememberedSizes["pencil"] ?? 1;
    },
    getShapeRadius: () => {
      const size = currentTool === "shape"
        ? parseInt(sizeSlider.value)
        : (rememberedSizes["shape"] ?? 5);
      return size;
    },
    getShapeType: () => shapeTypeSelect ? shapeTypeSelect.value : "star",
    getCircleRadius: () => {
      const size = currentTool === "circle"
        ? parseInt(sizeSlider.value)
        : (rememberedSizes["circle"] ?? 7);
      return Math.max(0, Math.floor(size / 2));
    },
    subscribeToToolChanges: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getCurrentSize: () => parseInt(sizeSlider.value),
  };
}
