export function createClipboardManager() {
    let clipboard = null;
    return {
        copy(entry) {
            clipboard = Object.assign(Object.assign({}, entry), { cells: entry.cells.map((c) => (Object.assign({}, c))) });
        },
        paste() {
            return clipboard;
        },
        hasContent() {
            return clipboard !== null;
        },
    };
}
