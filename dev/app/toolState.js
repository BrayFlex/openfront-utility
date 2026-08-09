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
    const updateSizeSlider = (tool) => {
        var _a, _b;
        const config = TOOL_SIZE_CONFIGS[tool];
        if (!config) {
            if (sizeGroup)
                sizeGroup.hidden = true;
            return;
        }
        if (sizeGroup)
            sizeGroup.hidden = false;
        if (sizeSlider) {
            sizeSlider.min = String(config.min);
            sizeSlider.max = String(config.max);
            sizeSlider.step = String(config.step);
            // Restore remembered size or use default
            sizeSlider.value = String((_a = rememberedSizes[tool]) !== null && _a !== void 0 ? _a : config.defaultValue);
            // Generate tick marks for the slider
            const ticksContainer = sizeGroup === null || sizeGroup === void 0 ? void 0 : sizeGroup.querySelector(".size-slider-ticks");
            if (ticksContainer) {
                ticksContainer.innerHTML = "";
                const range = config.max - config.min;
                const step = config.step;
                const numTicks = Math.floor(range / step) + 1;
                for (let i = 0; i < numTicks; i++) {
                    const value = config.min + i * step;
                    const tick = document.createElement("div");
                    tick.className = "size-slider-tick" + (value % 5 === 0 ? " major" : "");
                    // Position: 0% at top (max value), 100% at bottom (min value) for vertical slider
                    const percent = (i / (numTicks - 1)) * 100;
                    tick.style.top = `${percent}%`;
                    ticksContainer.appendChild(tick);
                }
            }
        }
        if (sizeOutput) {
            sizeOutput.min = String(config.min);
            sizeOutput.max = String(config.max);
            sizeOutput.value = (_b = sizeSlider === null || sizeSlider === void 0 ? void 0 : sizeSlider.value) !== null && _b !== void 0 ? _b : "1";
        }
    };
    function selectTool(tool) {
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
            const tool = btn.dataset.tool;
            if (tool)
                selectTool(tool);
        });
    });
    // Wire up size slider
    if (sizeSlider) {
        sizeSlider.addEventListener("input", () => {
            if (sizeOutput)
                sizeOutput.value = sizeSlider.value;
            if (TOOL_SIZE_CONFIGS[currentTool]) {
                rememberedSizes[currentTool] = parseInt(sizeSlider.value);
            }
        });
    }
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
                if (sizeSlider)
                    sizeSlider.value = String(val);
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
                return parseInt(sizeSlider.value);
            return (_a = rememberedSizes["pencil"]) !== null && _a !== void 0 ? _a : 1;
        },
        getShapeRadius: () => {
            var _a;
            const size = currentTool === "shape"
                ? parseInt(sizeSlider.value)
                : ((_a = rememberedSizes["shape"]) !== null && _a !== void 0 ? _a : 5);
            return size;
        },
        getShapeType: () => shapeTypeSelect ? shapeTypeSelect.value : "star",
        getCircleRadius: () => {
            var _a;
            const size = currentTool === "circle"
                ? parseInt(sizeSlider.value)
                : ((_a = rememberedSizes["circle"]) !== null && _a !== void 0 ? _a : 7);
            return Math.max(0, Math.floor(size / 2));
        },
        subscribeToToolChanges: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getCurrentSize: () => parseInt(sizeSlider.value),
    };
}
