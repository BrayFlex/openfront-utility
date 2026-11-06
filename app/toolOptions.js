import { FILL_STYLES } from "./fillStyles.js";
import { SHAPE_TYPES, } from "./toolState.js";
const RATIO_MIN = 0.25;
const RATIO_MAX = 4;
const formatRatio = (value) => String(Math.round(value * 100) / 100);
/**
 * Builds the per-tool options strip that sits on the left of the canvas
 * controls bar. Add another panel here when a tool needs its own controls.
 */
export function setupToolOptions({ container, toolState }) {
    var _a, _b;
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
        toolState.setShapeType(shapeSelect.value);
    });
    shapePanel.appendChild(shapeSelect);
    // Cube width/height are multipliers of the Size slider value.
    const ratioGroup = document.createElement("div");
    ratioGroup.className = "tool-options-ratios";
    ratioGroup.title = "Cube width and height as a multiple of the Size slider";
    const createRatioInput = (key, labelText) => {
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
            const patch = {};
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
    // ── Fill panel ───────────────────────────────────────────────────────────
    // Swatches are pure pixel previews: the styles are easier to recognise than
    // to name, so the list runs visually from darkest (solid) to lightest.
    const fillPanel = document.createElement("div");
    fillPanel.className = "tool-options-panel";
    fillPanel.dataset.tool = "fill";
    const swatchButtons = new Map();
    for (const style of FILL_STYLES) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-options-swatch";
        button.dataset.style = style.id;
        button.title = style.label;
        button.setAttribute("aria-label", style.label);
        button.setAttribute("aria-pressed", "false");
        const grid = document.createElement("span");
        grid.className = "tool-options-swatch-grid";
        grid.setAttribute("aria-hidden", "true");
        // A fixed 48×48 field keeps every swatch the same size. 4px preview pixels
        // make the dither easy to read while 12×12 cells still show several repeats
        // of each 2-pixel tile.
        const previewSize = 12;
        const pixelSize = 4;
        grid.style.gridTemplateColumns = `repeat(${previewSize}, ${pixelSize}px)`;
        grid.style.gridTemplateRows = `repeat(${previewSize}, ${pixelSize}px)`;
        for (let y = 0; y < previewSize; y++) {
            for (let x = 0; x < previewSize; x++) {
                const cell = document.createElement("span");
                cell.className = "tool-options-swatch-cell";
                if (style.isMarked(x, y))
                    cell.classList.add("is-marked");
                grid.appendChild(cell);
            }
        }
        button.appendChild(grid);
        button.addEventListener("click", () => toolState.setFillStyle(style.id));
        fillPanel.appendChild(button);
        swatchButtons.set(style.id, button);
    }
    container.appendChild(fillPanel);
    // ── Pencil panel ─────────────────────────────────────────────────────────
    const pencilPanel = document.createElement("div");
    pencilPanel.className = "tool-options-panel";
    pencilPanel.dataset.tool = "pencil";
    const pencilLabel = document.createElement("span");
    pencilLabel.className = "tool-options-label";
    pencilLabel.textContent = "Tip";
    const pencilTipGroup = document.createElement("div");
    pencilTipGroup.className = "tool-options-toggle";
    pencilTipGroup.setAttribute("role", "group");
    pencilTipGroup.setAttribute("aria-label", "Pencil tip");
    const pencilTipButtons = new Map();
    const pencilTips = [
        { tip: "sharp", label: "Sharp (square)", icon: "■" },
        { tip: "soft", label: "Soft (circular)", icon: "●" },
    ];
    for (const entry of pencilTips) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-options-toggle-btn";
        button.dataset.tip = entry.tip;
        button.title = entry.label;
        button.setAttribute("aria-label", entry.label);
        button.setAttribute("aria-pressed", "false");
        button.textContent = entry.icon;
        button.addEventListener("click", () => toolState.setPencilTip(entry.tip));
        pencilTipGroup.appendChild(button);
        pencilTipButtons.set(entry.tip, button);
    }
    pencilPanel.append(pencilLabel, pencilTipGroup);
    container.appendChild(pencilPanel);
    // ── Line panel ───────────────────────────────────────────────────────────
    const linePanel = document.createElement("div");
    linePanel.className = "tool-options-panel";
    linePanel.dataset.tool = "line";
    const lineLabel = document.createElement("span");
    lineLabel.className = "tool-options-label";
    lineLabel.textContent = "Line";
    const lineModeGroup = document.createElement("div");
    lineModeGroup.className = "tool-options-toggle";
    lineModeGroup.setAttribute("role", "group");
    lineModeGroup.setAttribute("aria-label", "Line type");
    const lineModeButtons = new Map();
    const lineModes = [
        { mode: "straight", label: "Straight line", icon: "╲" },
        { mode: "curve", label: "Curved line", icon: "⟅" },
    ];
    for (const entry of lineModes) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-options-toggle-btn";
        button.dataset.mode = entry.mode;
        button.title = entry.label;
        button.setAttribute("aria-label", entry.label);
        button.setAttribute("aria-pressed", "false");
        button.textContent = entry.icon;
        button.addEventListener("click", () => toolState.setLineMode(entry.mode));
        lineModeGroup.appendChild(button);
        lineModeButtons.set(entry.mode, button);
    }
    linePanel.append(lineLabel, lineModeGroup);
    container.appendChild(linePanel);
    // ── Select panel ─────────────────────────────────────────────────────────
    const selectPanel = document.createElement("div");
    selectPanel.className = "tool-options-panel";
    selectPanel.dataset.tool = "selectArea";
    const selectModeLabel = document.createElement("span");
    selectModeLabel.className = "tool-options-label";
    selectModeLabel.textContent = "Mode";
    const selectModeGroup = document.createElement("div");
    selectModeGroup.className = "tool-options-toggle";
    selectModeGroup.setAttribute("role", "group");
    selectModeGroup.setAttribute("aria-label", "Selection mode");
    const selectModeButtons = new Map();
    const selectModes = [
        { mode: "regular", label: "Regular selection - (hold) Shift", icon: "⬚" },
        { mode: "lasso", label: "Freehand selection - (hold) Shift + Alt/⌥", icon: "◌" },
        { mode: "object", label: "Object selection - connected pixels", icon: "⁜" },
    ];
    for (const entry of selectModes) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-options-toggle-btn";
        button.dataset.mode = entry.mode;
        button.title = entry.label;
        button.setAttribute("aria-label", entry.label);
        button.setAttribute("aria-pressed", "false");
        button.textContent = entry.icon;
        button.addEventListener("click", () => toolState.setSelectMode(entry.mode));
        selectModeGroup.appendChild(button);
        selectModeButtons.set(entry.mode, button);
    }
    const selectColorButtons = new Map();
    const overwriteColorButtons = new Map();
    const selectionColors = ["black", "both", "white"];
    const createColorTabs = (labelText, ariaLabel, onPick) => {
        const wrapper = document.createElement("div");
        wrapper.className = "tool-options-field";
        const text = document.createElement("span");
        text.className = "tool-options-label";
        text.textContent = labelText;
        const group = document.createElement("div");
        group.className = "tool-options-toggle";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", ariaLabel);
        const buttons = new Map();
        for (const color of selectionColors) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tool-options-toggle-btn tool-options-color-btn";
            button.dataset.color = color;
            button.title = `${labelText} ${color} pixels`;
            button.setAttribute("aria-label", `${ariaLabel}: ${color}`);
            button.setAttribute("aria-pressed", "false");
            button.textContent = color[0].toUpperCase() + color.slice(1);
            button.addEventListener("click", () => onPick(color));
            group.appendChild(button);
            buttons.set(color, button);
        }
        wrapper.append(text, group);
        return { wrapper, buttons };
    };
    const selectColorTabs = createColorTabs("Select", "Select pixels", (color) => toolState.setSelectColor(color));
    selectColorTabs.buttons.forEach((button, color) => selectColorButtons.set(color, button));
    const overwriteColorTabs = createColorTabs("Overwrite", "Overwrite pixels", (color) => toolState.setOverwriteColor(color));
    overwriteColorTabs.buttons.forEach((button, color) => overwriteColorButtons.set(color, button));
    // Mode, Select and Overwrite are three horizontal tabbers with their titles
    // above, matching the Pattern Scale control.
    const selectModeField = document.createElement("div");
    selectModeField.className = "tool-options-field";
    selectModeField.append(selectModeLabel, selectModeGroup);
    selectPanel.append(selectModeField, selectColorTabs.wrapper, overwriteColorTabs.wrapper);
    container.appendChild(selectPanel);
    // ── State sync ───────────────────────────────────────────────────────────
    const shapeToolButton = document.querySelector("#tool-shape");
    const shapeToolIcon = (_a = shapeToolButton === null || shapeToolButton === void 0 ? void 0 : shapeToolButton.querySelector(".tool-icon")) !== null && _a !== void 0 ? _a : null;
    const syncType = () => {
        const type = toolState.getShapeType();
        const shape = SHAPE_TYPES.find((entry) => entry.type === type);
        shapeSelect.value = type;
        ratioGroup.hidden = type !== "cube";
        if (shape) {
            if (shapeToolIcon)
                shapeToolIcon.textContent = shape.icon;
            if (shapeToolButton)
                shapeToolButton.title = `Shape — ${shape.label}`;
        }
    };
    const syncRatioInputs = () => {
        const ratio = toolState.getShapeRatio();
        if (document.activeElement !== widthInput)
            widthInput.value = formatRatio(ratio.width);
        if (document.activeElement !== heightInput)
            heightInput.value = formatRatio(ratio.height);
    };
    const syncFillStyle = () => {
        const current = toolState.getFillStyle();
        swatchButtons.forEach((button, id) => {
            const active = id === current;
            button.classList.toggle("selected", active);
            button.setAttribute("aria-pressed", String(active));
        });
    };
    const syncPencilTip = () => {
        const current = toolState.getPencilTip();
        pencilTipButtons.forEach((button, tip) => {
            const active = tip === current;
            button.classList.toggle("selected", active);
            button.setAttribute("aria-pressed", String(active));
        });
    };
    const syncLineMode = () => {
        const current = toolState.getLineMode();
        lineModeButtons.forEach((button, mode) => {
            const active = mode === current;
            button.classList.toggle("selected", active);
            button.setAttribute("aria-pressed", String(active));
        });
    };
    const selectToolButton = document.querySelector("#tool-selectArea");
    const selectToolIcon = (_b = selectToolButton === null || selectToolButton === void 0 ? void 0 : selectToolButton.querySelector(".tool-icon")) !== null && _b !== void 0 ? _b : null;
    const syncColorButtons = (buttons, current) => {
        buttons.forEach((button, color) => {
            const active = color === current;
            button.classList.toggle("selected", active);
            button.setAttribute("aria-pressed", String(active));
        });
    };
    const syncSelect = () => {
        const mode = toolState.getSelectMode();
        selectModeButtons.forEach((button, entryMode) => {
            const active = entryMode === mode;
            button.classList.toggle("selected", active);
            button.setAttribute("aria-pressed", String(active));
        });
        syncColorButtons(selectColorButtons, toolState.getSelectColor());
        syncColorButtons(overwriteColorButtons, toolState.getOverwriteColor());
        const entry = selectModes.find((candidate) => candidate.mode === mode);
        if (entry) {
            if (selectToolIcon)
                selectToolIcon.textContent = entry.icon;
            if (selectToolButton)
                selectToolButton.title = `Select — ${entry.label} (Shift)`;
        }
    };
    const updateVisibility = (tool) => {
        const isShape = tool === "shape";
        const isFill = tool === "fill";
        const isPencil = tool === "pencil";
        const isLine = tool === "line";
        const isSelect = tool === "selectArea";
        container.hidden = !isShape && !isFill && !isPencil && !isLine && !isSelect;
        shapePanel.hidden = !isShape;
        fillPanel.hidden = !isFill;
        pencilPanel.hidden = !isPencil;
        linePanel.hidden = !isLine;
        selectPanel.hidden = !isSelect;
        if (isShape) {
            syncType();
            syncRatioInputs();
        }
        if (isFill)
            syncFillStyle();
        if (isPencil)
            syncPencilTip();
        if (isLine)
            syncLineMode();
        if (isSelect)
            syncSelect();
    };
    syncType();
    syncRatioInputs();
    syncFillStyle();
    syncPencilTip();
    syncLineMode();
    syncSelect();
    updateVisibility(toolState.getCurrentTool());
    toolState.subscribeToToolChanges(updateVisibility);
    toolState.subscribeToShapeChanges(syncType);
    toolState.subscribeToFillChanges(syncFillStyle);
    toolState.subscribeToPencilChanges(syncPencilTip);
    toolState.subscribeToLineChanges(syncLineMode);
    toolState.subscribeToSelectChanges(syncSelect);
}
