export type ClipboardEntry = {
  cells: Array<{ x: number; y: number; active: boolean }>;
  /** Width of the bounding box */
  width: number;
  /** Height of the bounding box */
  height: number;
  /** Top-left X of the bounding box in source canvas */
  originX: number;
  /** Top-left Y of the bounding box in source canvas */
  originY: number;
};

export type ClipboardManager = {
  copy: (entry: ClipboardEntry) => void;
  paste: () => ClipboardEntry | null;
  hasContent: () => boolean;
};

export function createClipboardManager(): ClipboardManager {
  let clipboard: ClipboardEntry | null = null;

  return {
    copy(entry) {
      clipboard = { ...entry, cells: entry.cells.map((c) => ({ ...c })) };
    },
    paste() {
      return clipboard;
    },
    hasContent() {
      return clipboard !== null;
    },
  };
}
