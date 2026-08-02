type PaneResizeControlsOptions = {
  workspaceSplit: HTMLElement;
  previewHandle: HTMLElement;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function initPaneResizeControls(options: PaneResizeControlsOptions) {
  const { workspaceSplit, previewHandle } = options;
  let activePointerId: number | null = null;

  const beginPointerResize = (
    event: PointerEvent,
    handle: HTMLElement,
    onMove: (clientX: number) => void
  ) => {
    event.preventDefault();
    activePointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);

    document.body.classList.add("is-resizing-pane");

    const move = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== activePointerId) return;
      onMove(nextEvent.clientX);
    };

    const stop = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== activePointerId) return;
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

  const resizePreview = (clientX: number) => {
    const splitRect = workspaceSplit.getBoundingClientRect();
    // Minimum 180px preview, maximum is half the workspace
    const maxWidth = Math.max(180, splitRect.width * 0.55);
    const width = clamp(splitRect.right - clientX, 180, maxWidth);
    workspaceSplit.style.setProperty("--preview-width", `${Math.round(width)}px`);
  };

  previewHandle.addEventListener("pointerdown", (event) => {
    beginPointerResize(event, previewHandle, resizePreview);
  });
}
