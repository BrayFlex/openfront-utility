const STORAGE_KEY = "pu-sim-map";

type MapMeta = {
  slug: string;
  name: string;
  width: number;
  height: number;
  file: string;
  landFile: string;
};

export type MapSimulationState = {
  enabled: boolean;
  slug: string;
  meta: MapMeta | null;
  image: HTMLImageElement | null;
  mask: HTMLImageElement | null;
  teamColors: boolean;
};

export type MapSimulationController = {
  getState: () => MapSimulationState;
  setEnabled: (enabled: boolean) => void;
  setSlug: (slug: string) => void;
};

export type MapSimulationOptions = {
  button: HTMLButtonElement;
  popover: HTMLDivElement;
  toggle: HTMLInputElement;
  list: HTMLDivElement;
  note: HTMLParagraphElement;
  teamToggle: HTMLInputElement;
  onChange: (state: MapSimulationState) => void;
};

const DEFAULT_SLUG = "world";
const URL_PREFIX = "./";

// The 7 team colors (OpenFrontIO\src\client\render\gl\default-theme.json > teamColors, 
// excluding Bot/Humans/Nations), in wheel order.
export const TEAM_COLORS = [
  { name: "Red", hex: "#eb3333" },
  { name: "Blue", hex: "#2962ff" },
  { name: "Teal", hex: "#2bd4bd" },
  { name: "Purple", hex: "#9234ea" },
  { name: "Yellow", hex: "#e7b008" },
  { name: "Orange", hex: "#f97415" },
  { name: "Green", hex: "#41be52" },
];
export const TEAM_COLOR_HEXES = TEAM_COLORS.map((c) => c.hex);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export async function initMapSimulation(options: MapSimulationOptions): Promise<MapSimulationController> {
  const { button, popover, toggle, list, note, onChange, teamToggle } = options;

  let registry: MapMeta[] = [];
  try {
    const res = await fetch(`${URL_PREFIX}data/maps.json`);
    if (res.ok) registry = (await res.json()) as MapMeta[];
  } catch {
    registry = [];
  }
  registry.sort((a, b) => (a.name ?? a.slug).localeCompare(b.name ?? b.slug));

  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as { enabled?: boolean; slug?: string } : null;
    } catch {
      return null;
    }
  })();

  const metaFor = (slug: string): MapMeta | null =>
    registry.find((m) => m.slug === slug) ?? null;

  let state: MapSimulationState = {
    enabled: saved?.enabled ?? false,
    slug: saved?.slug ?? DEFAULT_SLUG,
    meta: metaFor(saved?.slug ?? DEFAULT_SLUG),
    image: null,
    mask: null,
    teamColors: false,
  };

  const imageCache = new Map<string, { image: HTMLImageElement; mask: HTMLImageElement }>();

  const persist = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: state.enabled, slug: state.slug }),
      );
    } catch { /* ignore */ }
  };

  const emit = () => {
    renderList();
    syncButton();
    toggle.checked = state.enabled;
    teamToggle.checked = state.teamColors;
    onChange(state);
  };

  const setState = (patch: Partial<MapSimulationState>) => {
    state = { ...state, ...patch };
    persist();
    emit();
  };

  const loadSlug = async (slug: string) => {
    const meta = metaFor(slug);
    if (!meta) {
      setState({ meta: null, image: null, mask: null });
      return;
    }
    const cached = imageCache.get(slug);
    if (cached) {
      setState({ meta, image: cached.image, mask: cached.mask });
      return;
    }
    try {
      const [image, mask] = await Promise.all([
        loadImage(`${URL_PREFIX}${meta.file}`),
        loadImage(`${URL_PREFIX}${meta.landFile}`),
      ]);
      imageCache.set(slug, { image, mask });
      if (state.slug === slug) {
        setState({ meta, image, mask });
      }
    } catch {
      setState({ meta, image: null, mask: null });
    }
  };

  const buildList = () => {
    list.innerHTML = "";
    const items = registry.length > 0 ? registry : [];
    for (const meta of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "map-option";
      btn.setAttribute("role", "option");
      btn.dataset.slug = meta.slug;

      const name = document.createElement("span");
      name.className = "map-option-name";
      name.textContent = meta.name || meta.slug;

      const size = document.createElement("span");
      size.className = "map-option-size";
      size.textContent = `${meta.width}×${meta.height}`;

      btn.append(name, size);
      btn.addEventListener("click", () => {
        if (state.enabled && state.slug === meta.slug) {
          // Clicking the selected map toggles simulation off.
          setState({ enabled: false });
        } else {
          setState({ enabled: true, slug: meta.slug });
          void loadSlug(meta.slug);
        }
      });
      list.appendChild(btn);
    }
  };

  const renderList = () => {
    for (const el of list.querySelectorAll<HTMLButtonElement>(".map-option")) {
      const isSelected = state.enabled && el.dataset.slug === state.slug;
      el.classList.toggle("selected", isSelected);
      el.setAttribute("aria-selected", isSelected ? "true" : "false");
    }
  };

  const syncButton = () => {
    button.classList.toggle("active", state.enabled);
    button.classList.toggle("team-colors", state.teamColors);
    button.setAttribute("aria-expanded", popover.hidden ? "false" : "true");
  };

  const open = () => {
    popover.hidden = false;
    syncButton();
  };
  const close = () => {
    popover.hidden = true;
    syncButton();
  };

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.hidden ? open() : close();
  });

  toggle.addEventListener("change", () => {
    setState({ enabled: toggle.checked });
  });

  teamToggle.addEventListener("change", () => {
    setState({ teamColors: teamToggle.checked });
  });

  // ── Close on outside click ───────────────────────────────────────────────
  document.addEventListener("click", (e) => {
    if (popover.hidden) return;
    const target = e.target as Node;
    if (!popover.contains(target) && target !== button && !button.contains(target)) {
      close();
    }
  });

  buildList();
  toggle.checked = state.enabled;
  syncButton();
  if (registry.length === 0) note.hidden = false;
  else note.hidden = true;
  void loadSlug(state.slug);

  return {
    getState: () => state,
    setEnabled: (enabled) => setState({ enabled }),
    setSlug: (slug) => {
      setState({ slug });
      void loadSlug(slug);
    },
  };
}