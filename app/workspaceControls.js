const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;
function isEditableTarget(target) {
    if (!(target instanceof HTMLElement))
        return false;
    const tagName = target.tagName.toLowerCase();
    return (target.isContentEditable ||
        tagName === "input" ||
        tagName === "select" ||
        tagName === "textarea");
}
export function initWorkspaceControls(options) {
    const { workspace, viewport, zoomInButton, zoomOutButton, resetButton, zoomValue } = options;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let panPointerId = null;
    let panStartX = 0;
    let panStartY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let isSpacePressed = false;
    let didSpacePan = false;
    const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    const render = () => {
        viewport.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`;
        zoomValue.value = `${Math.round(zoom * 100)}%`;
    };
    const setZoom = (nextZoom, anchor) => {
        const clampedZoom = clampZoom(nextZoom);
        if (clampedZoom === zoom)
            return;
        if (anchor) {
            const workspaceRect = workspace.getBoundingClientRect();
            const viewportWidth = viewport.offsetWidth;
            const viewportHeight = viewport.offsetHeight;
            const anchorX = anchor.clientX - workspaceRect.left;
            const anchorY = anchor.clientY - workspaceRect.top;
            const localX = (anchorX - workspaceRect.width / 2 + viewportWidth / 2 - panX) / zoom;
            const localY = (anchorY - workspaceRect.height / 2 + viewportHeight / 2 - panY) / zoom;
            panX =
                anchorX - workspaceRect.width / 2 + viewportWidth / 2 - localX * clampedZoom;
            panY =
                anchorY - workspaceRect.height / 2 + viewportHeight / 2 - localY * clampedZoom;
        }
        zoom = clampedZoom;
        render();
    };
    const reset = () => {
        zoom = 1;
        panX = 0;
        panY = 0;
        render();
    };
    const isPanGesture = (event) => isSpacePressed ||
        event.button === 1 ||
        event.altKey ||
        event.metaKey ||
        event.target === workspace ||
        event.target === viewport;
    workspace.addEventListener("pointerdown", (event) => {
        if (!isPanGesture(event))
            return;
        event.preventDefault();
        event.stopPropagation();
        didSpacePan = isSpacePressed;
        panPointerId = event.pointerId;
        panStartX = event.clientX;
        panStartY = event.clientY;
        startPanX = panX;
        startPanY = panY;
        workspace.classList.add("is-panning");
        workspace.setPointerCapture(event.pointerId);
    }, { capture: true });
    workspace.addEventListener("pointermove", (event) => {
        if (panPointerId !== event.pointerId)
            return;
        panX = startPanX + event.clientX - panStartX;
        panY = startPanY + event.clientY - panStartY;
        render();
    });
    const stopPan = (event) => {
        if (panPointerId !== event.pointerId)
            return;
        panPointerId = null;
        workspace.classList.remove("is-panning");
        workspace.releasePointerCapture(event.pointerId);
    };
    workspace.addEventListener("pointerup", stopPan);
    workspace.addEventListener("pointercancel", stopPan);
    workspace.addEventListener("click", (event) => {
        if (!didSpacePan)
            return;
        event.preventDefault();
        event.stopPropagation();
        didSpacePan = false;
    }, { capture: true });
    document.addEventListener("keydown", (event) => {
        if (event.code !== "Space" || isEditableTarget(event.target))
            return;
        isSpacePressed = true;
        workspace.classList.add("is-space-pan");
        event.preventDefault();
    });
    document.addEventListener("keyup", (event) => {
        if (event.code !== "Space")
            return;
        isSpacePressed = false;
        workspace.classList.remove("is-space-pan");
    });
    window.addEventListener("blur", () => {
        isSpacePressed = false;
        workspace.classList.remove("is-space-pan");
    });
    workspace.addEventListener("wheel", (event) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        setZoom(zoom + direction * ZOOM_STEP, {
            clientX: event.clientX,
            clientY: event.clientY,
        });
    }, { passive: false });
    zoomInButton.addEventListener("click", () => setZoom(zoom + ZOOM_STEP));
    zoomOutButton.addEventListener("click", () => setZoom(zoom - ZOOM_STEP));
    resetButton.addEventListener("click", reset);
    render();
    return { reset };
}
