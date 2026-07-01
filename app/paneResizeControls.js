const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function initPaneResizeControls(options) {
    const { shell, workspaceSplit, toolbarHandle, previewHandle } = options;
    let activePointerId = null;
    let isMouseResizing = false;
    const startResize = (onMove, endResize) => {
        document.body.classList.add("is-resizing-pane");
        return {
            move: (clientX) => onMove(clientX),
            stop: () => {
                document.body.classList.remove("is-resizing-pane");
                endResize();
            },
        };
    };
    const beginPointerResize = (event, handle, onMove) => {
        event.preventDefault();
        activePointerId = event.pointerId;
        handle.setPointerCapture(event.pointerId);
        const resize = startResize(onMove, () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
        });
        const move = (nextEvent) => {
            if (nextEvent.pointerId !== activePointerId)
                return;
            resize.move(nextEvent.clientX);
        };
        const stop = (nextEvent) => {
            if (nextEvent.pointerId !== activePointerId)
                return;
            activePointerId = null;
            handle.releasePointerCapture(nextEvent.pointerId);
            resize.stop();
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    };
    const beginMouseResize = (event, onMove) => {
        if (event.button !== 0)
            return;
        event.preventDefault();
        isMouseResizing = true;
        const resize = startResize(onMove, () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
        });
        const move = (nextEvent) => {
            if (!isMouseResizing)
                return;
            resize.move(nextEvent.clientX);
        };
        const stop = () => {
            isMouseResizing = false;
            resize.stop();
        };
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    };
    const resizeToolbar = (clientX, shellRect) => {
        const maxWidth = Math.min(560, shellRect.width * 0.55);
        const width = clamp(shellRect.right - clientX, 220, maxWidth);
        shell.style.setProperty("--toolbar-width", `${Math.round(width)}px`);
    };
    const resizePreview = (clientX, splitRect) => {
        const maxWidth = Math.max(220, splitRect.width - 340);
        const width = clamp(splitRect.right - clientX, 220, maxWidth);
        workspaceSplit.style.setProperty("--preview-width", `${Math.round(width)}px`);
    };
    const startToolbarResize = (event) => {
        if (shell.classList.contains("toolbar-collapsed"))
            return;
        const shellRect = shell.getBoundingClientRect();
        if (event instanceof PointerEvent) {
            beginPointerResize(event, toolbarHandle, (x) => resizeToolbar(x, shellRect));
            return;
        }
        beginMouseResize(event, (x) => resizeToolbar(x, shellRect));
    };
    const startPreviewResize = (event) => {
        if (shell.dataset.viewMode !== "both")
            return;
        const splitRect = workspaceSplit.getBoundingClientRect();
        if (event instanceof PointerEvent) {
            beginPointerResize(event, previewHandle, (x) => resizePreview(x, splitRect));
            return;
        }
        beginMouseResize(event, (x) => resizePreview(x, splitRect));
    };
    toolbarHandle.addEventListener("pointerdown", startToolbarResize);
    toolbarHandle.addEventListener("mousedown", startToolbarResize);
    previewHandle.addEventListener("pointerdown", startPreviewResize);
    previewHandle.addEventListener("mousedown", startPreviewResize);
}
