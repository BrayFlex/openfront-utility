export type HistoryManager = {
  record: (base64: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export function createHistoryManager(maxEntries = 200): HistoryManager {
  let past: string[] = [];
  let future: string[] = [];
  let current: string | null = null;

  const record = (base64: string) => {
    if (current === base64) return;
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
