import type { GridManager } from "./gridManager.js";
import type { ToolState } from "./toolState.js";

type ShiftControlsOptions = {
  gridManager: GridManager;
  toolState: ToolState;
  toolSelectBtn: HTMLButtonElement;
  shiftSelectBtn: HTMLButtonElement;
  shiftModeAll: HTMLInputElement;
  shiftModePartial: HTMLInputElement;
  shiftOverwriteOn: HTMLInputElement;
  shiftOverwriteOff: HTMLInputElement;
};

export function initShiftControls(options: ShiftControlsOptions) {
  const {
    gridManager,
    toolState,
    toolSelectBtn,
    shiftSelectBtn,
    shiftModeAll,
    shiftModePartial,
    shiftOverwriteOn,
    shiftOverwriteOff,
  } = options;

  const syncShiftSelectButtonVisibility = () => {
    const visible = shiftModePartial.checked;
    shiftSelectBtn.classList.toggle("shift-select-visible", visible);
    shiftSelectBtn.classList.toggle("shift-select-hidden", !visible);
  };

  const clearShiftSelectUI = () => {
    shiftSelectBtn.classList.remove("selected");
    shiftModeAll.checked = true;
    shiftModePartial.checked = false;
    syncShiftSelectButtonVisibility();
  };

  shiftSelectBtn.onclick = () => {
    const next = !shiftSelectBtn.classList.contains("selected");
    shiftSelectBtn.classList.toggle("selected", next);
    gridManager.enableShiftSelect(next);
  };

  toolSelectBtn.addEventListener("click", () => {
    gridManager.clearShiftSelect();
    clearShiftSelectUI();
  });

  shiftOverwriteOn.onchange = () => {
    if (shiftOverwriteOn.checked) gridManager.setShiftOverwriteMode(true);
  };
  shiftOverwriteOff.onchange = () => {
    if (shiftOverwriteOff.checked) gridManager.setShiftOverwriteMode(false);
  };
  shiftModeAll.onchange = () => {
    if (!shiftModeAll.checked) return;
    gridManager.setShiftSelectionMode("all");
    gridManager.clearShiftSelect();
    clearShiftSelectUI();
  };
  shiftModePartial.onchange = () => {
    if (!shiftModePartial.checked) return;
    gridManager.setShiftSelectionMode("partial");
    syncShiftSelectButtonVisibility();
  };

  toolState.subscribeToToolChanges((tool) => {
    if (tool !== "select") return;
    gridManager.clearShiftSelect();
    clearShiftSelectUI();
  });

  syncShiftSelectButtonVisibility();
  gridManager.setShiftSelectionMode("all");
  gridManager.setShiftOverwriteMode(true);
}
