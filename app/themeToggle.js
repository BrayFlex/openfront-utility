const STORAGE_KEY = "pu-theme";
export function initThemeToggle(toggleEl) {
    const apply = (t) => {
        document.documentElement.dataset.theme = t;
        toggleEl.checked = t === "dark";
    };
    const saved = localStorage.getItem(STORAGE_KEY);
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    apply(saved !== null && saved !== void 0 ? saved : (sysDark ? "dark" : "light"));
    toggleEl.addEventListener("change", () => {
        const t = toggleEl.checked ? "dark" : "light";
        localStorage.setItem(STORAGE_KEY, t);
        apply(t);
    });
    // Respond to system preference changes only when no saved override
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            apply(e.matches ? "dark" : "light");
        }
    });
}
