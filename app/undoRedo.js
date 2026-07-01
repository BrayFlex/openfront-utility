export function createHistoryManager(maxEntries = 200) {
    let past = [];
    let future = [];
    let current = null;
    const record = (base64) => {
        if (current === base64)
            return;
        if (current !== null) {
            past.push(current);
            if (past.length > maxEntries) {
                past = past.slice(past.length - maxEntries);
            }
        }
        current = base64;
        future = [];
    };
    const undo = () => {
        if (past.length === 0 || current === null)
            return null;
        const previous = past.pop();
        future.push(current);
        current = previous;
        return previous;
    };
    const redo = () => {
        if (future.length === 0 || current === null)
            return null;
        const next = future.pop();
        past.push(current);
        current = next;
        return next;
    };
    return {
        record,
        undo,
        redo,
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
    };
}
