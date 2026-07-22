const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function initPaneResizeControls(options) {
    const { workspaceSplit, previewHandle } = options;
    let activePointerId = null;
    const beginPointerResize = (event, handle, onMove) => {
        event.preventDefault();
        activePointerId = event.pointerId;
        handle.setPointerCapture(event.pointerId);
        document.body.classList.add("is-resizing-pane");
        const move = (nextEvent) => {
            if (nextEvent.pointerId !== activePointerId)
                return;
            onMove(nextEvent.clientX);
        };
        const stop = (nextEvent) => {
            if (nextEvent.pointerId !== activePointerId)
                return;
            activePointerId = null;
            handle.releasePointerCapture(nextEvent.pointerId);
            document.body.classList.remove("is-resizing-pane");
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    };
    const beginMouseResize = (event, onMove) => {
        if (event.button !== 0)
            return;
        event.preventDefault();
        document.body.classList.add("is-resizing-pane");
        const move = (nextEvent) => {
            onMove(nextEvent.clientX);
        };
        const stop = () => {
            document.body.classList.remove("is-resizing-pane");
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    };
    const resizePreview = (clientX) => {
        const splitRect = workspaceSplit.getBoundingClientRect();
        // Minimum 180px preview, maximum is half the workspace
        const maxWidth = Math.max(180, splitRect.width * 0.55);
        const width = clamp(splitRect.right - clientX, 180, maxWidth);
        workspaceSplit.style.setProperty("--preview-width", `${Math.round(width)}px`);
    };
    const startPreviewResize = (event) => {
        if (event instanceof PointerEvent) {
            beginPointerResize(event, previewHandle, resizePreview);
            return;
        }
        beginMouseResize(event, resizePreview);
    };
    previewHandle.addEventListener("pointerdown", startPreviewResize);
    previewHandle.addEventListener("mousedown", startPreviewResize);
}
