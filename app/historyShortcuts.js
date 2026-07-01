const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement))
        return false;
    if (target.isContentEditable)
        return true;
    const t = target.tagName.toLowerCase();
    return t === "input" || t === "textarea" || t === "select";
};
export function setupHistoryShortcuts(options) {
    const { onUndo, onRedo, onDeselect, onCopy, onCut, onPaste } = options;
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
    });
}
