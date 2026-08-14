export type HistoryManager<T = string> = {
  record: (value: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export function createHistoryManager<T = string>(
  maxEntries = 200,
  toKey?: (value: T) => string
): HistoryManager<T> {
  let past: T[] = [];
  let future: T[] = [];
  let current: T | null = null;

  const keyOf = (value: T) =>
    toKey ? toKey(value) : (value as unknown as string);

  const record = (value: T) => {
    const valueKey = keyOf(value);
    if (current !== null && keyOf(current) === valueKey) return;
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
    if (past.length === 0 || current === null) return null;
    const previous = past.pop()!;
    future.push(current);
    current = previous;
    return previous;
  };

  const redo = () => {
    if (future.length === 0 || current === null) return null;
    const next = future.pop()!;
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
