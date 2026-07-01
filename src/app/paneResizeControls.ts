type PaneResizeControlsOptions = {
  shell: HTMLElement;
  workspaceSplit: HTMLElement;
  toolbarHandle: HTMLElement;
  previewHandle: HTMLElement;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function initPaneResizeControls(options: PaneResizeControlsOptions) {
  const { shell, workspaceSplit, toolbarHandle, previewHandle } = options;
  let activePointerId: number | null = null;
  let isMouseResizing = false;

  const startResize = (
    onMove: (clientX: number) => void,
    endResize: () => void
  ) => {
    document.body.classList.add("is-resizing-pane");
    return {
      move: (clientX: number) => onMove(clientX),
      stop: () => {
        document.body.classList.remove("is-resizing-pane");
        endResize();
      },
    };
  };

  const beginPointerResize = (
    event: PointerEvent,
    handle: HTMLElement,
    onMove: (clientX: number) => void
  ) => {
    event.preventDefault();
    activePointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);
    const resize = startResize(onMove, () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    });

    const move = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== activePointerId) return;
      resize.move(nextEvent.clientX);
    };

    const stop = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== activePointerId) return;
      activePointerId = null;
      handle.releasePointerCapture(nextEvent.pointerId);
      resize.stop();
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };

  const beginMouseResize = (
    event: MouseEvent,
    onMove: (clientX: number) => void
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    isMouseResizing = true;
    const resize = startResize(onMove, () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    });
    const move = (nextEvent: MouseEvent) => {
      if (!isMouseResizing) return;
      resize.move(nextEvent.clientX);
    };
    const stop = () => {
      isMouseResizing = false;
      resize.stop();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const resizeToolbar = (clientX: number, shellRect: DOMRect) => {
    const maxWidth = Math.min(560, shellRect.width * 0.55);
    const width = clamp(shellRect.right - clientX, 220, maxWidth);
    shell.style.setProperty("--toolbar-width", `${Math.round(width)}px`);
  };

  const resizePreview = (clientX: number, splitRect: DOMRect) => {
    const maxWidth = Math.max(220, splitRect.width - 340);
    const width = clamp(splitRect.right - clientX, 220, maxWidth);
    workspaceSplit.style.setProperty("--preview-width", `${Math.round(width)}px`);
  };

  const startToolbarResize = (event: PointerEvent | MouseEvent) => {
    if (shell.classList.contains("toolbar-collapsed")) return;
    const shellRect = shell.getBoundingClientRect();
    if (event instanceof PointerEvent) {
      beginPointerResize(event, toolbarHandle, (x) => resizeToolbar(x, shellRect));
      return;
    }
    beginMouseResize(event, (x) => resizeToolbar(x, shellRect));
  };

  const startPreviewResize = (event: PointerEvent | MouseEvent) => {
    if (shell.dataset.viewMode !== "both") return;
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
