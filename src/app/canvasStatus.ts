type StatusGrid = {
  element: HTMLElement;
  getSize: () => { width: number; height: number };
};

type CanvasStatusOptions = {
  grids: StatusGrid[];
  cursorX: HTMLElement;
  cursorY: HTMLElement;
  primaryCount: HTMLElement;
  secondaryCount: HTMLElement;
};

/**
 * Canvas footer readouts: live cursor pixel coordinates (0,0 at the top-left)
 * and the primary/secondary pixel totals for the active canvas.
 *
 * The values live in fixed-width spans so changing digits never shift the
 * surrounding labels or the footer's centred credit text.
 */
export function initCanvasStatus(options: CanvasStatusOptions) {
  const { grids, cursorX, cursorY, primaryCount, secondaryCount } = options;
  const empty = "–";

  const setCursor = (x: number | null, y: number | null) => {
    cursorX.textContent = x === null ? empty : String(x);
    cursorY.textContent = y === null ? empty : String(y);
  };

  for (const grid of grids) {
    grid.element.addEventListener("pointermove", (event) => {
      const firstCell = grid.element.querySelector<HTMLElement>(".cell");
      const cellRect = firstCell?.getBoundingClientRect();
      const size = grid.getSize();
      if (!cellRect || cellRect.width <= 0 || cellRect.height <= 0) {
        setCursor(null, null);
        return;
      }

      const x = Math.floor((event.clientX - cellRect.left) / cellRect.width);
      const y = Math.floor((event.clientY - cellRect.top) / cellRect.height);
      if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
        setCursor(null, null);
        return;
      }

      setCursor(x, y);
    });

    grid.element.addEventListener("pointerleave", () => setCursor(null, null));
  }

  return {
    updateCounts(pattern: number[][]) {
      let primary = 0;
      let secondary = 0;
      for (const row of pattern) {
        for (const cell of row) {
          if (cell === 0) primary++;
          else secondary++;
        }
      }
      primaryCount.textContent = String(primary);
      secondaryCount.textContent = String(secondary);
    },
    clearCursor: () => setCursor(null, null),
  };
}
