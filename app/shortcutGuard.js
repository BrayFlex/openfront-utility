/**
 * Overlays that take over the page and should suspend canvas shortcuts while
 * open. Keeping them suspended lets people select and copy text, use form
 * controls, and scroll normally inside the overlay.
 */
const SHORTCUT_BLOCKING_OVERLAYS = ["infoModal", "imageImportOverlay"];
export function isShortcutBlocked() {
    return SHORTCUT_BLOCKING_OVERLAYS.some((id) => {
        const overlay = document.getElementById(id);
        return overlay !== null && !overlay.hidden;
    });
}
