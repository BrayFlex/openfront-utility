import { create as createNoUiSlider, PipsMode } from "nouislider";
const TOOL_SIZE_CONFIGS = {
    pencil: { min: 1, max: 9, step: 1, defaultValue: 1, label: "Size" },
    circle: { min: 1, max: 30, step: 1, defaultValue: 7, label: "Size" },
    shape: { min: 1, max: 30, step: 1, defaultValue: 5, label: "Size" },
};
export function createToolState(options) {
    const { toolButtons, sizeSlider, sizeOutput, sizeGroup } = options;
    const shapeTypeSelect = document.getElementById("shapeType");
    let currentTool = "pencil";
    let previousTool = "pencil";
    let lastNonSelectTool = "pencil";
    // Per-tool remembered sizes
    const rememberedSizes = {};
    const listeners = new Set();
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
    const updateSizeSlider = (tool) => {
        var _a;
        const config = TOOL_SIZE_CONFIGS[tool];
        if (!config) {
            if (sizeGroup)
                sizeGroup.hidden = true;
            return;
        }
        if (sizeGroup)
            sizeGroup.hidden = false;
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
        const value = (_a = rememberedSizes[tool]) !== null && _a !== void 0 ? _a : config.defaultValue;
        slider.set(value);
        if (sizeOutput) {
            sizeOutput.min = String(config.min);
            sizeOutput.max = String(config.max);
            sizeOutput.value = String(value);
        }
    };
    function selectTool(tool) {
        // Save current size before switching
        if (TOOL_SIZE_CONFIGS[currentTool]) {
            rememberedSizes[currentTool] = slider.get();
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
            const tool = btn.dataset.tool;
            if (tool)
                selectTool(tool);
        });
    });
    // Wire up noUiSlider events
    slider.on("update", (values) => {
        const value = parseInt(values[0]);
        if (sizeOutput)
            sizeOutput.value = String(value);
        if (TOOL_SIZE_CONFIGS[currentTool]) {
            rememberedSizes[currentTool] = value;
        }
    });
    // Wire up size numeric input
    if (sizeOutput) {
        sizeOutput.addEventListener("change", () => {
            let val = parseInt(sizeOutput.value);
            if (isNaN(val))
                val = 1;
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
            var _a;
            if (currentTool === "pencil")
                return slider.get();
            return (_a = rememberedSizes["pencil"]) !== null && _a !== void 0 ? _a : 1;
        },
        getShapeRadius: () => {
            var _a;
            const size = currentTool === "shape"
                ? slider.get()
                : ((_a = rememberedSizes["shape"]) !== null && _a !== void 0 ? _a : 5);
            return size;
        },
        getShapeType: () => shapeTypeSelect ? shapeTypeSelect.value : "star",
        getCircleRadius: () => {
            var _a;
            const size = currentTool === "circle"
                ? slider.get()
                : ((_a = rememberedSizes["circle"]) !== null && _a !== void 0 ? _a : 7);
            return Math.max(0, Math.floor(size / 2));
        },
        subscribeToToolChanges: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getCurrentSize: () => slider.get(),
    };
}
