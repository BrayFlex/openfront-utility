import {
  SHAPE_TYPES,
  type ShapeRatio,
  type ShapeType,
  type ToolKind,
  type ToolState,
} from "./toolState.js";

type ToolOptionsConfig = {
  container: HTMLElement;
  toolState: ToolState;
};

const RATIO_MIN = 0.25;
const RATIO_MAX = 4;

const formatRatio = (value: number) => String(Math.round(value * 100) / 100);

/**
 * Builds the per-tool options strip that sits on the left of the canvas
 * controls bar. Add another panel here when a tool needs its own controls.
 */
export function setupToolOptions({ container, toolState }: ToolOptionsConfig) {
  // ── Shape panel ──────────────────────────────────────────────────────────
  const shapePanel = document.createElement("div");
  shapePanel.className = "tool-options-panel";
  shapePanel.dataset.tool = "shape";

  const label = document.createElement("label");
  label.className = "tool-options-label";
  label.textContent = "Shape";
  label.htmlFor = "shapeTypeSelect";
  shapePanel.appendChild(label);

  const shapeSelect = document.createElement("select");
  shapeSelect.id = "shapeTypeSelect";
  shapeSelect.className = "tool-options-select";
  shapeSelect.setAttribute("aria-label", "Shape type");
  for (const shape of SHAPE_TYPES) {
    const option = document.createElement("option");
    option.value = shape.type;
    option.textContent = shape.label;
    shapeSelect.appendChild(option);
  }
  shapeSelect.addEventListener("change", () => {
    toolState.setShapeType(shapeSelect.value as ShapeType);
  });
  shapePanel.appendChild(shapeSelect);

  // Cube width/height are multipliers of the Size slider value.
  const ratioGroup = document.createElement("div");
  ratioGroup.className = "tool-options-ratios";
  ratioGroup.title = "Cube width and height as a multiple of the Size slider";

  const createRatioInput = (key: keyof ShapeRatio, labelText: string) => {
    const wrapper = document.createElement("label");
    wrapper.className = "tool-options-ratio";

    const text = document.createElement("span");
    text.textContent = labelText;

    const input = document.createElement("input");
    input.type = "number";
    input.min = String(RATIO_MIN);
    input.max = String(RATIO_MAX);
    input.step = "0.05";
    input.inputMode = "decimal";
    input.className = "tool-options-ratio-input";
    input.setAttribute("aria-label", `Cube ${key} ratio`);

    input.addEventListener("change", () => {
      const raw = Number.parseFloat(input.value);
      const current = toolState.getShapeRatio()[key];
      const value = Number.isFinite(raw) ? raw : current;
      const patch: Partial<ShapeRatio> = {};
      patch[key] = value;
      toolState.setShapeRatio(patch);
      input.value = formatRatio(toolState.getShapeRatio()[key]);
    });

    wrapper.append(text, input);
    ratioGroup.appendChild(wrapper);
    return input;
  };

  const widthInput = createRatioInput("width", "W×");
  const heightInput = createRatioInput("height", "H×");
  shapePanel.appendChild(ratioGroup);

  container.appendChild(shapePanel);

  // ── State sync ───────────────────────────────────────────────────────────
  const shapeToolButton = document.querySelector<HTMLButtonElement>("#tool-shape");
  const shapeToolIcon = shapeToolButton?.querySelector<HTMLElement>(".tool-icon") ?? null;

  const syncType = () => {
    const type = toolState.getShapeType();
    const shape = SHAPE_TYPES.find((entry) => entry.type === type);
    shapeSelect.value = type;
    ratioGroup.hidden = type !== "cube";
    if (shape) {
      if (shapeToolIcon) shapeToolIcon.textContent = shape.icon;
      if (shapeToolButton) shapeToolButton.title = `Shape — ${shape.label}`;
    }
  };

  const syncRatioInputs = () => {
    const ratio = toolState.getShapeRatio();
    if (document.activeElement !== widthInput) widthInput.value = formatRatio(ratio.width);
    if (document.activeElement !== heightInput) heightInput.value = formatRatio(ratio.height);
  };

  const updateVisibility = (tool: ToolKind) => {
    const isShape = tool === "shape";
    container.hidden = !isShape;
    shapePanel.hidden = !isShape;
    if (isShape) {
      syncType();
      syncRatioInputs();
    }
  };

  syncType();
  syncRatioInputs();
  updateVisibility(toolState.getCurrentTool());

  toolState.subscribeToToolChanges(updateVisibility);
  toolState.subscribeToShapeChanges(syncType);
}
