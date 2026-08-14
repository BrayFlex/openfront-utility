type ViewportConfig = {
  element: HTMLElement;
  isActive: () => boolean;
};

type WorkspaceControlsOptions = {
  workspace: HTMLElement;
  viewports: ViewportConfig[];
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  zoomValue: HTMLOutputElement;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.10;
const ARROW_PAN_STEP = 100; // 5 cells × 20px base cell size

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea"
  );
}

export function initWorkspaceControls(options: WorkspaceControlsOptions) {
  const { workspace, viewports, zoomInButton, zoomOutButton, resetButton, zoomValue } =
    options;

  const state = viewports.map((vp) => ({
    viewport: vp.element,
    isActive: vp.isActive,
    zoom: 1,
    panX: 0,
    panY: 0,
  }));

  // Each canvas (main / test) keeps its own zoom/pan state; only the visible
  // canvas is affected by gestures, wheel, arrow keys and the zoom buttons.
  const getActive = () => state.find((s) => s.isActive()) ?? state[0];

  let panPointerId: number | null = null;
  let panStartX = 0;
  let panStartY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let isSpacePressed = false;
  let isCtrlPressed = false;
  let didKeyPan = false;

  const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const render = () => {
    for (const s of state) {
      s.viewport.style.transform = `translate(calc(-50% + ${s.panX}px), calc(-50% + ${s.panY}px)) scale(${s.zoom})`;
    }
    zoomValue.value = `${Math.round(getActive().zoom * 100)}%`;
  };

  const setZoom = (nextZoom: number, anchor?: { clientX: number; clientY: number }) => {
    const active = getActive();
    const clampedZoom = clampZoom(nextZoom);
    if (clampedZoom === active.zoom) return;
    if (anchor) {
      const workspaceRect = workspace.getBoundingClientRect();
      const viewportWidth = active.viewport.offsetWidth;
      const viewportHeight = active.viewport.offsetHeight;
      const anchorX = anchor.clientX - workspaceRect.left;
      const anchorY = anchor.clientY - workspaceRect.top;
      const localX =
        (anchorX - workspaceRect.width / 2 + viewportWidth / 2 - active.panX) / active.zoom;
      const localY =
        (anchorY - workspaceRect.height / 2 + viewportHeight / 2 - active.panY) / active.zoom;
      active.panX =
        anchorX - workspaceRect.width / 2 + viewportWidth / 2 - localX * clampedZoom;
      active.panY =
        anchorY - workspaceRect.height / 2 + viewportHeight / 2 - localY * clampedZoom;
    }
    active.zoom = clampedZoom;
    render();
  };

  const reset = () => {
    const active = getActive();
    active.zoom = 1;
    active.panX = 0;
    active.panY = 0;
    render();
  };

  const isPanGesture = (event: PointerEvent) =>
    isSpacePressed ||
    isCtrlPressed ||
    event.button === 1 ||
    event.altKey ||
    event.metaKey ||
    event.target === workspace ||
    viewports.some((v) => event.target === v.element);

  workspace.addEventListener("pointerdown", (event) => {
    if (!isPanGesture(event)) return;
    event.preventDefault();
    event.stopPropagation();
    didKeyPan = isSpacePressed || isCtrlPressed;
    const active = getActive();
    panPointerId = event.pointerId;
    panStartX = event.clientX;
    panStartY = event.clientY;
    startPanX = active.panX;
    startPanY = active.panY;
    workspace.classList.add("is-panning");
    workspace.setPointerCapture(event.pointerId);
  }, { capture: true });

  workspace.addEventListener("pointermove", (event) => {
    if (panPointerId !== event.pointerId) return;
    const active = getActive();
    active.panX = startPanX + event.clientX - panStartX;
    active.panY = startPanY + event.clientY - panStartY;
    render();
  });

  const stopPan = (event: PointerEvent) => {
    if (panPointerId !== event.pointerId) return;
    panPointerId = null;
    workspace.classList.remove("is-panning");
    workspace.releasePointerCapture(event.pointerId);
  };

  workspace.addEventListener("pointerup", stopPan);
  workspace.addEventListener("pointercancel", stopPan);
  workspace.addEventListener(
    "click",
    (event) => {
      if (!didKeyPan) return;
      event.preventDefault();
      event.stopPropagation();
      didKeyPan = false;
    },
    { capture: true }
  );

  document.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) return;

    if (event.code === "Space") {
      isSpacePressed = true;
      workspace.classList.add("is-space-pan");
      event.preventDefault();
      return;
    }

    if (event.code === "ControlLeft" || event.code === "ControlRight") {
      isCtrlPressed = true;
      workspace.classList.add("is-ctrl-pan");
      return;
    }

    // Arrow key panning — 5 cells (100px at base scale)
    const active = getActive();
    if (event.code === "ArrowUp")    { event.preventDefault(); active.panY += ARROW_PAN_STEP; render(); return; }
    if (event.code === "ArrowDown")  { event.preventDefault(); active.panY -= ARROW_PAN_STEP; render(); return; }
    if (event.code === "ArrowLeft")  { event.preventDefault(); active.panX += ARROW_PAN_STEP; render(); return; }
    if (event.code === "ArrowRight") { event.preventDefault(); active.panX -= ARROW_PAN_STEP; render(); return; }
  });

  document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      isSpacePressed = false;
      workspace.classList.remove("is-space-pan");
    }
    if (event.code === "ControlLeft" || event.code === "ControlRight") {
      isCtrlPressed = false;
      workspace.classList.remove("is-ctrl-pan");
    }
  });

  window.addEventListener("blur", () => {
    isSpacePressed = false;
    isCtrlPressed = false;
    workspace.classList.remove("is-space-pan");
    workspace.classList.remove("is-ctrl-pan");
  });

  workspace.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setZoom(getActive().zoom + direction * ZOOM_STEP, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    { passive: false }
  );

  zoomInButton.addEventListener("click", () => setZoom(getActive().zoom + ZOOM_STEP));
  zoomOutButton.addEventListener("click", () => setZoom(getActive().zoom - ZOOM_STEP));
  resetButton.addEventListener("click", reset);

  render();
  return { reset, refresh: render };
}