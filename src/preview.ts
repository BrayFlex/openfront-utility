/// <reference lib="es2017" />

type PaletteDefinition = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
};

type PaletteLookup = Record<string, PaletteDefinition>;

type PaletteReference = {
  name: string;
  isArchived?: boolean | null;
};

type ProductInfo = {
  price?: string | null;
  priceInCents?: number | null;
  productId?: string | null;
  priceId?: string | null;
} | null;

type CosmeticPayload = {
  name?: string;
  pattern: string;
  description?: string;
  affiliateCode?: string | null;
  product?: ProductInfo;
  priceSoft?: number;
  priceHard?: number;
  artist?: string;
  rarity?: string;
  colorPalettes?: PaletteReference[];
};

type PatternPayload = CosmeticPayload;

const FALLBACK_PRIMARY = "#000000";
const FALLBACK_SECONDARY = "#FFFFFF";

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function resolvePalette(
  pattern: PatternPayload,
  paletteMap: PaletteLookup
): { palette: PaletteDefinition; activeName: string } {
  const references = pattern.colorPalettes ?? [];

  for (const reference of references) {
    if (!reference?.name || reference.isArchived) continue;
    const palette = paletteMap[reference.name];
    if (palette) {
      return { palette, activeName: reference.name };
    }
  }

  for (const reference of references) {
    if (!reference?.name) continue;
    const palette = paletteMap[reference.name];
    if (palette) {
      return { palette, activeName: reference.name };
    }
  }

  const fallback = paletteMap["default_color"];

  if (fallback) {
    return { palette: fallback, activeName: fallback.name };
  }

  return {
    palette: {
      name: "fallback",
      primaryColor: FALLBACK_PRIMARY,
      secondaryColor: FALLBACK_SECONDARY,
    },
    activeName: "fallback",
  };
}

function buildMetaSection(pattern: PatternPayload) {
  const metaContainer = document.createElement("div");
  metaContainer.className = "pattern-meta";

  if (pattern.description) {
    const desc = document.createElement("div");
    desc.className = "pattern-description";
    desc.textContent = pattern.description;
    metaContainer.appendChild(desc);
  }

  if (pattern.product?.price) {
    const price = document.createElement("div");
    price.className = "pattern-meta-item";
    price.textContent = `Price: ${pattern.product.price}`;
    metaContainer.appendChild(price);
  }

  if (typeof pattern.priceSoft === "number" || typeof pattern.priceHard === "number") {
    const priceRange = document.createElement("div");
    priceRange.className = "pattern-meta-item";
    const soft = typeof pattern.priceSoft === "number" ? pattern.priceSoft : "n/a";
    const hard = typeof pattern.priceHard === "number" ? pattern.priceHard : "n/a";
    priceRange.textContent = `Price: ${soft} / ${hard}`;
    metaContainer.appendChild(priceRange);
  }

  if (pattern.artist) {
    const artist = document.createElement("div");
    artist.className = "pattern-meta-item";
    artist.textContent = `Artist: ${pattern.artist}`;
    metaContainer.appendChild(artist);
  }

  if (pattern.rarity) {
    const rarity = document.createElement("div");
    rarity.className = "pattern-meta-item";
    rarity.textContent = `Rarity: ${pattern.rarity}`;
    metaContainer.appendChild(rarity);
  }

  if (pattern.affiliateCode) {
    const code = document.createElement("div");
    code.className = "pattern-meta-item";
    code.textContent = `Affiliate: ${pattern.affiliateCode}`;
    metaContainer.appendChild(code);
  }

  if (metaContainer.children.length === 0) {
    return null;
  }

  return metaContainer;
}

function renderPatternsFromInput(
  container: HTMLElement,
  textarea: HTMLTextAreaElement,
) {
  const input = textarea.value;
  try {
    const parsed = JSON.parse(input) as {
      patterns: Record<string, CosmeticPayload>;
      colorPalettes?: PaletteLookup;
    };

    localStorage.setItem("last-pattern-json", input);

    const patternEntries = parsed.patterns ?? {};
    const paletteMap = parsed.colorPalettes ?? {};

    container.innerHTML = "";

    Object.entries(patternEntries).forEach(([key, payload]) => {
      const pattern = payload ?? ({} as CosmeticPayload);
      const { palette, activeName } = resolvePalette(pattern, paletteMap);

      const wrapper = document.createElement("div");
      wrapper.className = "pattern-item";

      const title = document.createElement("div");
      title.className = "pattern-name";
      title.textContent = pattern.name ?? key;
      wrapper.appendChild(title);

      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      wrapper.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to obtain 2D canvas context");
      }

      const errorEl = document.createElement("div");
      errorEl.className = "pattern-error";

      const patternCode =
        typeof pattern.pattern === "string" ? pattern.pattern : null;

      const hideError = () => {
        if (errorEl.parentElement === wrapper) {
          wrapper.removeChild(errorEl);
        }
      };

      const showError = (message: string) => {
        errorEl.textContent = message;
        if (errorEl.parentElement !== wrapper) {
          wrapper.appendChild(errorEl);
        }
      };

      const paintWithPalette = (paletteDef: PaletteDefinition) => {
        if (!patternCode) {
          showError("Pattern data missing");
          return false;
        }
        try {
          const primaryColor = hexToRgb(paletteDef.primaryColor);
          const secondaryColor = hexToRgb(paletteDef.secondaryColor);
          const decoder = new PatternDecoder(patternCode);
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          const data = imageData.data;
          let i = 0;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const isSet = decoder.isSet(x, y);
              const color = isSet ? secondaryColor : primaryColor;
              data[i++] = color.r;
              data[i++] = color.g;
              data[i++] = color.b;
              data[i++] = 255;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          hideError();
          return true;
        } catch (err) {
          console.error(err);
          showError("Invalid pattern");
          return false;
        }
      };

      paintWithPalette(palette);

      const meta = buildMetaSection(pattern);
      if (meta) {
        wrapper.appendChild(meta);
      }

      if (pattern.colorPalettes && pattern.colorPalettes.length > 0) {
        const paletteContainer = document.createElement("div");
        paletteContainer.className = "pattern-palettes";

        let activeButton: HTMLButtonElement | null = null;

        for (const ref of pattern.colorPalettes) {
          if (!ref?.name) continue;
          const paletteOption = paletteMap[ref.name];
          if (!paletteOption) continue;

          const button = document.createElement("button");
          button.type = "button";
          button.className = "palette-item";
          if (ref.isArchived) button.classList.add("archived");
          if (ref.name === activeName) {
            button.classList.add("active");
            activeButton = button;
          }

          const swatches = document.createElement("span");
          swatches.className = "palette-swatches";

          const primarySwatch = document.createElement("span");
          primarySwatch.className = "palette-swatch";
          primarySwatch.style.backgroundColor = paletteOption.primaryColor;

          const secondarySwatch = document.createElement("span");
          secondarySwatch.className = "palette-swatch";
          secondarySwatch.style.backgroundColor = paletteOption.secondaryColor;

          swatches.appendChild(primarySwatch);
          swatches.appendChild(secondarySwatch);

          const nameEl = document.createElement("span");
          nameEl.className = "palette-name";
          nameEl.textContent = ref.isArchived
            ? `${paletteOption.name} (archived)`
            : paletteOption.name;

          button.appendChild(swatches);
          button.appendChild(nameEl);

          button.addEventListener("click", () => {
            if (activeButton === button) return;
            if (!paintWithPalette(paletteOption)) return;
            activeButton?.classList.remove("active");
            button.classList.add("active");
            activeButton = button;
          });

          paletteContainer.appendChild(button);
        }

        if (paletteContainer.children.length > 0) {
          wrapper.appendChild(paletteContainer);
        }
      }

      container.appendChild(wrapper);
    });
  } catch (err) {
    alert("Invalid JSON");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("pattern-list");
  const button = document.getElementById(
    "load-button",
  ) as HTMLButtonElement | null;
  const textarea = document.getElementById(
    "json-input",
  ) as HTMLTextAreaElement | null;

  if (!container || !textarea) {
    console.warn("Missing required elements: #pattern-list or #json-input");
    return;
  }

  const hash = decodeURIComponent(location.hash);
  if (hash.startsWith("#json=")) {
    const json = hash.slice(6);
    try {
      textarea.value = json;
      localStorage.setItem("last-pattern-json", json);
    } catch {
      console.warn("Failed to parse pattern JSON from URL hash");
    }
  } else {
    const lastInput = localStorage.getItem("last-pattern-json");
    if (lastInput !== null) {
      textarea.value = lastInput;
    }
  }

  if (button) {
    button.addEventListener("click", () =>
      renderPatternsFromInput(container, textarea),
    );
  }

  if (textarea.value.trim().length > 0) {
    renderPatternsFromInput(container, textarea);
  }
});
