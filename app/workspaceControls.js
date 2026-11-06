const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.10;
const ARROW_PAN_STEP = 100; // 5 cells × 20px base cell size
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
    const { workspace, viewports, zoomInButton, zoomOutButton, resetButton, zoomValue, onChange } = options;
    const state = viewports.map((vp) => ({
        viewport: vp.element,
        isActive: vp.isActive,
        zoom: 1,
        panX: 0,
        panY: 0,
    }));
    // Each canvas (main / test) keeps its own zoom/pan state; only the visible
    // canvas is affected by gestures, wheel, arrow keys and the zoom buttons.
    const getActive = () => { var _a; return (_a = state.find((s) => s.isActive())) !== null && _a !== void 0 ? _a : state[0]; };
    let panPointerId = null;
    let panStartX = 0;
    let panStartY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let isSpacePressed = false;
    let isCtrlPressed = false;
    let isMetaPressed = false;
    let didKeyPan = false;
    const syncPanKeyClass = () => {
        workspace.classList.toggle("pan-key-held", isSpacePressed || isCtrlPressed || isMetaPressed);
    };
    const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    const render = () => {
        for (const s of state) {
            s.viewport.style.transform = `translate(calc(-50% + ${s.panX}px), calc(-50% + ${s.panY}px)) scale(${s.zoom})`;
        }
        zoomValue.value = `${Math.round(getActive().zoom * 100)}%`;
        onChange === null || onChange === void 0 ? void 0 : onChange();
    };
    const setZoom = (nextZoom, anchor) => {
        const active = getActive();
        const clampedZoom = clampZoom(nextZoom);
        if (clampedZoom === active.zoom)
            return;
        if (anchor) {
            const workspaceRect = workspace.getBoundingClientRect();
            const viewportWidth = active.viewport.offsetWidth;
            const viewportHeight = active.viewport.offsetHeight;
            const anchorX = anchor.clientX - workspaceRect.left;
            const anchorY = anchor.clientY - workspaceRect.top;
            // The viewport is scaled about its centre (transform-origin: center),
            // so a local point maps to: centre + pan + zoom × (local − size/2).
            // Keep the point under the cursor fixed across the zoom change.
            const localX = (anchorX - workspaceRect.width / 2 - active.panX + (active.zoom * viewportWidth) / 2) /
                active.zoom;
            const localY = (anchorY - workspaceRect.height / 2 - active.panY + (active.zoom * viewportHeight) / 2) /
                active.zoom;
            active.panX =
                anchorX - workspaceRect.width / 2 + (clampedZoom * viewportWidth) / 2 - localX * clampedZoom;
            active.panY =
                anchorY - workspaceRect.height / 2 + (clampedZoom * viewportHeight) / 2 - localY * clampedZoom;
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
    const isPanGesture = (event) => isSpacePressed ||
        isCtrlPressed ||
        isMetaPressed ||
        event.button === 1 ||
        event.metaKey ||
        event.target === workspace ||
        viewports.some((v) => event.target === v.element);
    workspace.addEventListener("pointerdown", (event) => {
        if (!isPanGesture(event))
            return;
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
        if (panPointerId !== event.pointerId)
            return;
        const active = getActive();
        active.panX = startPanX + event.clientX - panStartX;
        active.panY = startPanY + event.clientY - panStartY;
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
        if (!didKeyPan)
            return;
        event.preventDefault();
        event.stopPropagation();
        didKeyPan = false;
    }, { capture: true });
    document.addEventListener("keydown", (event) => {
        var _a;
        if (isEditableTarget(event.target))
            return;
        if (event.code === "Space") {
            isSpacePressed = true;
            syncPanKeyClass();
            workspace.classList.add("is-space-pan");
            event.preventDefault();
            return;
        }
        if (event.code === "ControlLeft" || event.code === "ControlRight") {
            isCtrlPressed = true;
            syncPanKeyClass();
            workspace.classList.add("is-ctrl-pan");
            return;
        }
        if (event.code === "MetaLeft" || event.code === "MetaRight") {
            isMetaPressed = true;
            syncPanKeyClass();
            return;
        }
        // Shift + "+" / "-" adjusts the current tool size.
        if (event.shiftKey &&
            (event.code === "Equal" ||
                event.code === "NumpadAdd" ||
                event.code === "Minus" ||
                event.code === "NumpadSubtract")) {
            if (options.onAdjustSize) {
                event.preventDefault();
                const increase = event.code === "Equal" || event.code === "NumpadAdd";
                options.onAdjustSize(increase ? 1 : -1);
                return;
            }
        }
        // Arrow keys: Shift moves the selection, otherwise the canvas pans by
        // 5 cells (100px at base scale).
        const active = getActive();
        const arrow = event.code === "ArrowUp"
            ? { dx: 0, dy: -1 }
            : event.code === "ArrowDown"
                ? { dx: 0, dy: 1 }
                : event.code === "ArrowLeft"
                    ? { dx: -1, dy: 0 }
                    : event.code === "ArrowRight"
                        ? { dx: 1, dy: 0 }
                        : null;
        if (arrow) {
            if (event.shiftKey && ((_a = options.onShiftArrow) === null || _a === void 0 ? void 0 : _a.call(options, arrow.dx, arrow.dy))) {
                event.preventDefault();
                return;
            }
            event.preventDefault();
            if (event.code === "ArrowUp") {
                active.panY += ARROW_PAN_STEP;
                render();
                return;
            }
            if (event.code === "ArrowDown") {
                active.panY -= ARROW_PAN_STEP;
                render();
                return;
            }
            if (event.code === "ArrowLeft") {
                active.panX += ARROW_PAN_STEP;
                render();
                return;
            }
            if (event.code === "ArrowRight") {
                active.panX -= ARROW_PAN_STEP;
                render();
                return;
            }
        }
    });
    document.addEventListener("keyup", (event) => {
        if (event.code === "Space") {
            isSpacePressed = false;
            syncPanKeyClass();
            workspace.classList.remove("is-space-pan");
        }
        if (event.code === "ControlLeft" || event.code === "ControlRight") {
            isCtrlPressed = false;
            syncPanKeyClass();
            workspace.classList.remove("is-ctrl-pan");
        }
        if (event.code === "MetaLeft" || event.code === "MetaRight") {
            isMetaPressed = false;
            syncPanKeyClass();
        }
    });
    window.addEventListener("blur", () => {
        isSpacePressed = false;
        isCtrlPressed = false;
        isMetaPressed = false;
        syncPanKeyClass();
        workspace.classList.remove("is-space-pan");
        workspace.classList.remove("is-ctrl-pan");
    });
    workspace.addEventListener("wheel", (event) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        setZoom(getActive().zoom + direction * ZOOM_STEP, {
            clientX: event.clientX,
            clientY: event.clientY,
        });
    }, { passive: false });
    zoomInButton.addEventListener("click", () => setZoom(getActive().zoom + ZOOM_STEP));
    zoomOutButton.addEventListener("click", () => setZoom(getActive().zoom - ZOOM_STEP));
    resetButton.addEventListener("click", reset);
    render();
    return { reset, refresh: render };
}
