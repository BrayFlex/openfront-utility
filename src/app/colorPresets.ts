type ColorPreset = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
};

type ColorPresetMap = Record<string, ColorPreset>;

type ColorPresetOptions = {
  container: HTMLDivElement;
  primaryColorInput: HTMLInputElement;
  secondaryColorInput: HTMLInputElement;
  selectedLabel?: HTMLElement | null;
  onChange: () => void;
  initialColors?: { primary: string; secondary: string } | null;
};

const COLOR_PRESET_URL = "color-presets.json";

export function initColorPresetControls(options: ColorPresetOptions) {
  const {
    container,
    primaryColorInput,
    secondaryColorInput,
    selectedLabel,
    onChange,
    initialColors,
  } = options;
  let colorPresets: ColorPresetMap = {};
  let presetButtons: Record<string, HTMLButtonElement> = {};
  let customPresetButton: HTMLButtonElement | null = null;

  async function loadColorPresets(): Promise<ColorPresetMap> {
    if (Object.keys(colorPresets).length > 0) {
      return colorPresets;
    }
    try {
      const response = await fetch(COLOR_PRESET_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load color presets: ${response.status}`);
    }
      colorPresets = (await response.json()) as ColorPresetMap;
    } catch (error) {
      console.warn("Failed to load color presets", error);
      colorPresets = {};
    }
    return colorPresets;
  }

  function setSelectedPreset(key: string | null) {
    if (selectedLabel) {
      selectedLabel.textContent = key ? colorPresets[key]?.name ?? key : "Custom colors";
    }
    Object.values(presetButtons).forEach((button) => {
      const presetKey = button.dataset.presetKey ?? "";
      button.classList.toggle("selected", presetKey === key);
    });
    if (customPresetButton) {
      customPresetButton.classList.toggle("selected", key === null);
    }
  }

  function updateCustomButtonSwatches() {
    if (!customPresetButton) return;
    const primarySwatch = customPresetButton.querySelector<HTMLElement>(
      "[data-role='primary']"
    );
    const secondarySwatch = customPresetButton.querySelector<HTMLElement>(
      "[data-role='secondary']"
    );
    if (primarySwatch) {
      primarySwatch.style.backgroundColor = primaryColorInput.value;
    }
    if (secondarySwatch) {
      secondarySwatch.style.backgroundColor = secondaryColorInput.value;
    }
  }

  function applyInitialColors() {
    if (!initialColors) return false;
    ensureCustomPresetButton();
    primaryColorInput.value = initialColors.primary;
    secondaryColorInput.value = initialColors.secondary;
    setSelectedPreset(null);
    updateCustomButtonSwatches();
    return true;
  }

  function createPresetButton(key: string, preset: ColorPreset) {
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
    if (customPresetButton) return;
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

  function populateColorPresetOptions(presets: ColorPresetMap) {
    ensureCustomPresetButton();
    presetButtons = {};
    container.innerHTML = "";
    if (customPresetButton) {
      container.appendChild(customPresetButton);
    }

    const entries = Object.entries(presets).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );

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

  function applyPreset(key: string, options: { skipUpdate?: boolean } = {}) {
    const preset = colorPresets[key];
    if (!preset) return;
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

  void (async () => {
    container.classList.add("loading");
    const presets = await loadColorPresets();
    colorPresets = presets;
    container.classList.remove("loading");

    if (Object.keys(presets).length > 0) {
      populateColorPresetOptions(colorPresets);
      if (applyInitialColors()) {
        // Use colors from URL or initial state.
      } else if (colorPresets.default_color) {
        applyPreset("default_color", { skipUpdate: true });
      } else {
        setSelectedPreset(null);
      }
    } else {
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
    onChange();
  })();

  const setCustomSelection = () => {
    ensureCustomPresetButton();
    setSelectedPreset(null);
    updateCustomButtonSwatches();
  };

  return { setCustomSelection };
}
