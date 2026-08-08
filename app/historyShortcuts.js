const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement))
        return false;
    if (target.isContentEditable)
        return true;
    const t = target.tagName.toLowerCase();
    return t === "input" || t === "textarea" || t === "select";
};
export function setupHistoryShortcuts(options) {
    const { onUndo, onRedo, onDeselect, onCopy, onCut, onPaste, onClearSelection, onInvert, onInvertSelection } = options;
    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || isEditableTarget(event.target))
            return;
        const key = event.key.toLowerCase();
        const mod = event.metaKey || event.ctrlKey;
        if (mod && !event.shiftKey && key === "z") {
            event.preventDefault();
            onUndo();
            return;
        }
        if (mod && event.shiftKey && key === "z") {
            event.preventDefault();
            onRedo();
            return;
        }
        if (mod && !event.shiftKey && key === "d") {
            event.preventDefault();
            onDeselect();
            return;
        }
        if (mod && !event.shiftKey && key === "c") {
            event.preventDefault();
            onCopy();
            return;
        }
        if (mod && !event.shiftKey && key === "x") {
            event.preventDefault();
            onCut();
            return;
        }
        if (mod && !event.shiftKey && key === "v") {
            event.preventDefault();
            onPaste();
            return;
        }
        // Backspace / Delete — erase cells within selection
        if (!mod && (key === "backspace" || key === "delete")) {
            event.preventDefault();
            onClearSelection();
            return;
        }
        // i — invert bits of selection (or full canvas if no selection)
        if (!mod && !event.shiftKey && key === "i") {
            event.preventDefault();
            onInvert();
            return;
        }
        // Shift+i — invert the selection itself
        if (!mod && event.shiftKey && key === "i") {
            event.preventDefault();
            onInvertSelection();
            return;
        }
    });
}
