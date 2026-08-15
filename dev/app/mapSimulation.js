var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const STORAGE_KEY = "pu-sim-map";
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
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
}
function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
export function initMapSimulation(options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const { button, popover, toggle, list, note, onChange, teamToggle } = options;
        let registry = [];
        try {
            const res = yield fetch(`${URL_PREFIX}data/maps.json`);
            if (res.ok)
                registry = (yield res.json());
        }
        catch (_d) {
            registry = [];
        }
        registry.sort((a, b) => { var _a, _b; return ((_a = a.name) !== null && _a !== void 0 ? _a : a.slug).localeCompare((_b = b.name) !== null && _b !== void 0 ? _b : b.slug); });
        const saved = (() => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            }
            catch (_a) {
                return null;
            }
        })();
        const metaFor = (slug) => { var _a; return (_a = registry.find((m) => m.slug === slug)) !== null && _a !== void 0 ? _a : null; };
        let state = {
            enabled: (_a = saved === null || saved === void 0 ? void 0 : saved.enabled) !== null && _a !== void 0 ? _a : false,
            slug: (_b = saved === null || saved === void 0 ? void 0 : saved.slug) !== null && _b !== void 0 ? _b : DEFAULT_SLUG,
            meta: metaFor((_c = saved === null || saved === void 0 ? void 0 : saved.slug) !== null && _c !== void 0 ? _c : DEFAULT_SLUG),
            image: null,
            mask: null,
            teamColors: false,
        };
        const imageCache = new Map();
        const persist = () => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: state.enabled, slug: state.slug }));
            }
            catch ( /* ignore */_a) { /* ignore */ }
        };
        const emit = () => {
            renderList();
            syncButton();
            toggle.checked = state.enabled;
            teamToggle.checked = state.teamColors;
            onChange(state);
        };
        const setState = (patch) => {
            state = Object.assign(Object.assign({}, state), patch);
            persist();
            emit();
        };
        const loadSlug = (slug) => __awaiter(this, void 0, void 0, function* () {
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
                const [image, mask] = yield Promise.all([
                    loadImage(`${URL_PREFIX}${meta.file}`),
                    loadImage(`${URL_PREFIX}${meta.landFile}`),
                ]);
                imageCache.set(slug, { image, mask });
                if (state.slug === slug) {
                    setState({ meta, image, mask });
                }
            }
            catch (_a) {
                setState({ meta, image: null, mask: null });
            }
        });
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
                    }
                    else {
                        setState({ enabled: true, slug: meta.slug });
                        void loadSlug(meta.slug);
                    }
                });
                list.appendChild(btn);
            }
        };
        const renderList = () => {
            for (const el of list.querySelectorAll(".map-option")) {
                const isSelected = state.enabled && el.dataset.slug === state.slug;
                el.classList.toggle("selected", isSelected);
                el.setAttribute("aria-selected", isSelected ? "true" : "false");
            }
        };
        const syncButton = () => {
            button.classList.toggle("active", state.enabled);
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
            if (popover.hidden)
                return;
            const target = e.target;
            if (!popover.contains(target) && target !== button && !button.contains(target)) {
                close();
            }
        });
        buildList();
        toggle.checked = state.enabled;
        syncButton();
        if (registry.length === 0)
            note.hidden = false;
        else
            note.hidden = true;
        void loadSlug(state.slug);
        return {
            getState: () => state,
            setEnabled: (enabled) => setState({ enabled }),
            setSlug: (slug) => {
                setState({ slug });
                void loadSlug(slug);
            },
        };
    });
}
