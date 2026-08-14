export function createHistoryManager(maxEntries = 200, toKey) {
    let past = [];
    let future = [];
    let current = null;
    const keyOf = (value) => toKey ? toKey(value) : value;
    const record = (value) => {
        const valueKey = keyOf(value);
        if (current !== null && keyOf(current) === valueKey)
            return;
        if (current !== null) {
            past.push(current);
            if (past.length > maxEntries) {
                past = past.slice(past.length - maxEntries);
            }
        }
        current = value;
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
