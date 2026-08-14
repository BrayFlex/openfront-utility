var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const FAVORITES_STORAGE_KEY = "openfront.colorFavorites";
const COLOR_PRESET_URL = "color-presets.json";
export function initColorPresetControls(options) {
    const { container, primaryColorInput, secondaryColorInput, selectedLabel, favoriteButton, favoritesContainer, onChange, initialColors, } = options;
    let colorPresets = {};
    let presetButtons = {};
    let customPresetButton = null;
    let currentPresetKey = null;
    let favorites = loadFavorites();
    function loadFavorites() {
        try {
            const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (!raw)
                return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return [];
            return parsed.filter((entry) => !!entry &&
                typeof entry.primary === "string" &&
                typeof entry.secondary === "string" &&
                (entry.key === null || typeof entry.key === "string"));
        }
        catch (_a) {
            return [];
        }
    }
    function saveFavorites() {
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
        }
        catch (_a) {
            // ignore storage errors
        }
    }
    function currentColorsMatch(entry) {
        return (entry.primary === primaryColorInput.value &&
            entry.secondary === secondaryColorInput.value);
    }
    function isCurrentFavorite() {
        if (currentPresetKey) {
            return favorites.some((entry) => entry.key === currentPresetKey);
        }
        return favorites.some((entry) => entry.key === null && currentColorsMatch(entry));
    }
    function updateFavoriteButton() {
        if (!favoriteButton)
            return;
        favoriteButton.textContent = isCurrentFavorite() ? "★" : "☆";
        favoriteButton.classList.toggle("is-favorited", isCurrentFavorite());
    }
    function toggleFavorite() {
        if (currentPresetKey) {
            const index = favorites.findIndex((entry) => entry.key === currentPresetKey);
            if (index >= 0) {
                favorites.splice(index, 1);
            }
            else {
                favorites.push({
                    key: currentPresetKey,
                    primary: primaryColorInput.value,
                    secondary: secondaryColorInput.value,
                });
            }
        }
        else {
            const index = favorites.findIndex((entry) => entry.key === null && currentColorsMatch(entry));
            if (index >= 0) {
                favorites.splice(index, 1);
            }
            else {
                favorites.push({
                    key: null,
                    primary: primaryColorInput.value,
                    secondary: secondaryColorInput.value,
                });
            }
        }
        saveFavorites();
        renderFavorites();
        updateFavoriteButton();
    }
    function favoriteName(entry) {
        var _a, _b;
        if (!entry.key)
            return "custom";
        return (_b = (_a = colorPresets[entry.key]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : entry.key;
    }
    function renderFavorites() {
        if (!favoritesContainer)
            return;
        favoritesContainer.innerHTML = "";
        if (favorites.length === 0) {
            const empty = document.createElement("div");
            empty.className = "color-preset-placeholder";
            empty.textContent = "No favorites yet";
            favoritesContainer.appendChild(empty);
            return;
        }
        for (const entry of favorites) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "color-preset-item";
            const swatches = document.createElement("span");
            swatches.className = "color-preset-swatches";
            const primarySwatch = document.createElement("span");
            primarySwatch.className = "color-preset-swatch";
            primarySwatch.style.backgroundColor = entry.primary;
            const secondarySwatch = document.createElement("span");
            secondarySwatch.className = "color-preset-swatch";
            secondarySwatch.style.backgroundColor = entry.secondary;
            swatches.appendChild(primarySwatch);
            swatches.appendChild(secondarySwatch);
            const name = document.createElement("span");
            name.className = "color-preset-name";
            name.textContent = favoriteName(entry);
            button.appendChild(swatches);
            button.appendChild(name);
            button.addEventListener("click", () => applyFavorite(entry));
            favoritesContainer.appendChild(button);
        }
    }
    function applyFavorite(entry) {
        if (entry.key && colorPresets[entry.key]) {
            applyPreset(entry.key);
            return;
        }
        primaryColorInput.value = entry.primary;
        secondaryColorInput.value = entry.secondary;
        setSelectedPreset(null);
        updateCustomButtonSwatches();
        updateFavoriteButton();
        onChange();
    }
    function loadColorPresets() {
        return __awaiter(this, void 0, void 0, function* () {
            if (Object.keys(colorPresets).length > 0) {
                return colorPresets;
            }
            try {
                const response = yield fetch(COLOR_PRESET_URL, { cache: "no-cache" });
                if (!response.ok) {
                    throw new Error(`Failed to load color presets: ${response.status}`);
                }
                colorPresets = (yield response.json());
            }
            catch (error) {
                console.warn("Failed to load color presets", error);
                colorPresets = {};
            }
            return colorPresets;
        });
    }
    function setSelectedPreset(key) {
        var _a, _b;
        currentPresetKey = key;
        if (selectedLabel) {
            const name = key ? (_b = (_a = colorPresets[key]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : key : "Custom colors";
            const nameEl = selectedLabel.querySelector(".selected-preset-name");
            if (nameEl)
                nameEl.textContent = name;
            selectedLabel.classList.toggle("is-preset", !!key);
            // Set title with color details for hover tooltip
            const primary = primaryColorInput.value;
            const secondary = secondaryColorInput.value;
            selectedLabel.title = `${name} — primary=${primary}, secondary=${secondary}`;
        }
        Object.values(presetButtons).forEach((button) => {
            var _a;
            const presetKey = (_a = button.dataset.presetKey) !== null && _a !== void 0 ? _a : "";
            button.classList.toggle("selected", presetKey === key);
        });
        if (customPresetButton) {
            customPresetButton.classList.toggle("selected", key === null);
        }
        updateFavoriteButton();
    }
    function updateCustomButtonSwatches() {
        if (!customPresetButton)
            return;
        const primarySwatch = customPresetButton.querySelector("[data-role='primary']");
        const secondarySwatch = customPresetButton.querySelector("[data-role='secondary']");
        if (primarySwatch) {
            primarySwatch.style.backgroundColor = primaryColorInput.value;
        }
        if (secondarySwatch) {
            secondarySwatch.style.backgroundColor = secondaryColorInput.value;
        }
    }
    function applyInitialColors() {
        if (!initialColors)
            return false;
        ensureCustomPresetButton();
        primaryColorInput.value = initialColors.primary;
        secondaryColorInput.value = initialColors.secondary;
        setSelectedPreset(null);
        updateCustomButtonSwatches();
        return true;
    }
    function createPresetButton(key, preset) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "color-preset-item";
        button.dataset.presetKey = key;
        const swatches = document.createElement("span");
        swatches.className = "color-preset-swatches";
        const primarySwatch = document.createElement("span");
        primarySwatch.className = "color-preset-swatch";
        primarySwatch.style.backgroundColor = preset.primaryColor;
        const secondarySwatch = document.createElement("span");
        secondarySwatch.className = "color-preset-swatch";
        secondarySwatch.style.backgroundColor = preset.secondaryColor;
        swatches.appendChild(primarySwatch);
        swatches.appendChild(secondarySwatch);
        const name = document.createElement("span");
        name.className = "color-preset-name";
        name.textContent = preset.name;
        button.appendChild(swatches);
        button.appendChild(name);
        button.addEventListener("click", () => applyPreset(key));
        return button;
    }
    function ensureCustomPresetButton() {
        if (customPresetButton)
            return;
        customPresetButton = document.createElement("button");
        customPresetButton.type = "button";
        customPresetButton.className = "color-preset-item is-custom selected";
        const swatches = document.createElement("span");
        swatches.className = "color-preset-swatches";
        const primarySwatch = document.createElement("span");
        primarySwatch.className = "color-preset-swatch";
        primarySwatch.dataset.role = "primary";
        const secondarySwatch = document.createElement("span");
        secondarySwatch.className = "color-preset-swatch";
        secondarySwatch.dataset.role = "secondary";
        swatches.appendChild(primarySwatch);
        swatches.appendChild(secondarySwatch);
        const name = document.createElement("span");
        name.className = "color-preset-name";
        name.textContent = "custom";
        customPresetButton.appendChild(swatches);
        customPresetButton.appendChild(name);
        customPresetButton.addEventListener("click", () => {
            setSelectedPreset(null);
            updateCustomButtonSwatches();
            onChange();
        });
        updateCustomButtonSwatches();
    }
    function populateColorPresetOptions(presets) {
        ensureCustomPresetButton();
        presetButtons = {};
        container.innerHTML = "";
        if (customPresetButton) {
            container.appendChild(customPresetButton);
        }
        const entries = Object.entries(presets).sort((a, b) => a[1].name.localeCompare(b[1].name));
        for (const [key, preset] of entries) {
            const button = createPresetButton(key, preset);
            presetButtons[key] = button;
            container.appendChild(button);
        }
        if (container.children.length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "color-preset-placeholder";
            emptyMessage.textContent = "No presets available";
            container.appendChild(emptyMessage);
        }
    }
    function applyPreset(key, options = {}) {
        const preset = colorPresets[key];
        if (!preset)
            return;
        primaryColorInput.value = preset.primaryColor;
        secondaryColorInput.value = preset.secondaryColor;
        setSelectedPreset(key);
        updateCustomButtonSwatches();
        if (!options.skipUpdate) {
            onChange();
        }
    }
    const handleCustomColorInput = () => {
        if (container.classList.contains("loading")) {
            updateCustomButtonSwatches();
            onChange();
            return;
        }
        setSelectedPreset(null);
        updateCustomButtonSwatches();
        onChange();
    };
    primaryColorInput.addEventListener("input", handleCustomColorInput);
    secondaryColorInput.addEventListener("input", handleCustomColorInput);
    if (favoriteButton) {
        favoriteButton.addEventListener("click", toggleFavorite);
    }
    void (() => __awaiter(this, void 0, void 0, function* () {
        container.classList.add("loading");
        const presets = yield loadColorPresets();
        colorPresets = presets;
        container.classList.remove("loading");
        if (Object.keys(presets).length > 0) {
            populateColorPresetOptions(colorPresets);
            if (applyInitialColors()) {
                // Use colors from URL or initial state.
            }
            else if (colorPresets.default_color) {
                applyPreset("default_color", { skipUpdate: true });
            }
            else {
                setSelectedPreset(null);
            }
        }
        else {
            ensureCustomPresetButton();
            container.innerHTML = "";
            if (customPresetButton) {
                container.appendChild(customPresetButton);
            }
            applyInitialColors();
            const message = document.createElement("div");
            message.className = "color-preset-placeholder";
            message.textContent = "No presets available";
            container.appendChild(message);
            setSelectedPreset(null);
        }
        updateCustomButtonSwatches();
        renderFavorites();
        updateFavoriteButton();
        onChange();
    }))();
    const setCustomSelection = () => {
        ensureCustomPresetButton();
        setSelectedPreset(null);
        updateCustomButtonSwatches();
    };
    return {
        setCustomSelection,
        getCurrentPreset: () => {
            var _a, _b;
            return currentPresetKey
                ? ((_b = (_a = colorPresets[currentPresetKey]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : currentPresetKey)
                : null;
        },
    };
}
