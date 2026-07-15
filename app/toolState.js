const TOOL_SIZE_CONFIGS = {
    pencil: { min: 1, max: 9, step: 2, defaultValue: 1, label: "Size" },
    circle: { min: 1, max: 30, step: 1, defaultValue: 5, label: "Size" },
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
        }
        if (sizeOutput)
            sizeOutput.textContent = (_b = sizeSlider === null || sizeSlider === void 0 ? void 0 : sizeSlider.value) !== null && _b !== void 0 ? _b : "1";
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
                sizeOutput.textContent = sizeSlider.value;
            if (TOOL_SIZE_CONFIGS[currentTool]) {
                rememberedSizes[currentTool] = parseInt(sizeSlider.value);
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
                : ((_a = rememberedSizes["shape"]) !== null && _a !== void 0 ? _a : 3);
            return size;
        },
        getShapeType: () => shapeTypeSelect ? shapeTypeSelect.value : "star",
        getCircleRadius: () => {
            var _a;
            const size = currentTool === "circle"
                ? parseInt(sizeSlider.value)
                : ((_a = rememberedSizes["circle"]) !== null && _a !== void 0 ? _a : 5);
            return Math.max(0, Math.floor(size / 2));
        },
        subscribeToToolChanges: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getCurrentSize: () => parseInt(sizeSlider.value),
    };
}
