const STORAGE_KEY = "pu-theme";

export type Theme = "light" | "dark";

export function initThemeToggle(toggleEl: HTMLInputElement): void {
  const apply = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    toggleEl.checked = t === "dark";
  };

  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(saved ?? (sysDark ? "dark" : "light"));

  toggleEl.addEventListener("change", () => {
    const t: Theme = toggleEl.checked ? "dark" : "light";
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
