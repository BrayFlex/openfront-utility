/**
 * Show the warning once the secondary colour covers more than this share of the
 * pattern. Team modes replace the primary with a team colour, so a pattern that
 * is mostly secondary can read as a different team.
 */
const SECONDARY_RATIO_THRESHOLD = 0.4;

/** Only bright, highly saturated colours can be confused with a team colour. */
const MIN_SECONDARY_SATURATION = 0.5;

/**
 * A secondary must be at most this bright to count as "clearly darker". HSV
 * value (the largest RGB channel) is used, and the in-game lighten filter is
 * applied first. Values at or below this threshold are intentionally dark.
 */
const DARKNESS_VALUE_THRESHOLD = 0.7;

const NEAR_WHITE_MIN_VALUE = 0.86;
const NEAR_WHITE_MAX_SATURATION = 0.16;

/** OpenFront lightens territory colours by 10% in-game. */
const IN_GAME_LIGHTEN = 0.1;

type RgbColor = { r: number; g: number; b: number };
type HsvColor = { s: number; v: number };

export type TeamColorWarning = {
  secondaryPercent: number;
};

export type TeamColorWarningController = {
  update: (pattern: number[][], secondaryHex: string) => void;
};

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return {
    s: max === 0 ? 0 : (max - min) / max,
    v: max,
  };
}

function lightenForGame(color: RgbColor): RgbColor {
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * IN_GAME_LIGHTEN);
  return { r: mix(color.r), g: mix(color.g), b: mix(color.b) };
}

function isNearWhite({ s, v }: HsvColor): boolean {
  return v >= NEAR_WHITE_MIN_VALUE && s <= NEAR_WHITE_MAX_SATURATION;
}

/**
 * Returns warning details when the secondary colour is prominent and bright
 * enough to read like a team colour, without being clearly darker or near white.
 */
export function evaluateTeamColorWarning(
  pattern: number[][],
  secondaryHex: string
): TeamColorWarning | null {
  let totalCells = 0;
  let secondaryCells = 0;

  for (const row of pattern) {
    totalCells += row.length;
    for (const cell of row) {
      if (cell === 1) secondaryCells++;
    }
  }

  if (totalCells === 0) return null;
  const secondaryRatio = secondaryCells / totalCells;
  if (secondaryRatio <= SECONDARY_RATIO_THRESHOLD) return null;

  const secondaryHsv = rgbToHsv(lightenForGame(hexToRgb(secondaryHex)));

  if (
    secondaryHsv.s < MIN_SECONDARY_SATURATION ||
    isNearWhite(secondaryHsv) ||
    secondaryHsv.v <= DARKNESS_VALUE_THRESHOLD
  ) {
    return null;
  }

  // The warning only starts above 40%, so never round the displayed value down
  // to the threshold.
  const roundedPercent = Math.round(secondaryRatio * 100);
  return {
    secondaryPercent: roundedPercent <= 40 ? 41 : roundedPercent,
  };
}

function buildWarningText(warning: TeamColorWarning): string {
  return (
    `In team games the Primary Color is replaced by each team's assigned color. ` +
    `${warning.secondaryPercent}% of this pattern uses the Secondary Color, and it ` +
    `is a bright, highly saturated color. This is likely to be confused with a ` +
    `team color and is unlikely to be accepted. Either Invert and Swap Color, or ` +
    `adjust the Secondary Color making it darker/desaturated/near white.`
  );
}

type WarningTrigger = {
  element: HTMLElement;
  anchor: HTMLElement;
};

export function initTeamColorWarning(options: {
  button: HTMLButtonElement;
  submitButton?: HTMLButtonElement;
  submitTrigger?: HTMLElement;
  popover: HTMLElement;
  text: HTMLElement;
}): TeamColorWarningController {
  const { button, submitButton, submitTrigger, popover, text } = options;

  const triggers: WarningTrigger[] = [{ element: button, anchor: button }];
  if (submitTrigger) {
    triggers.push({
      element: submitTrigger,
      anchor: submitButton ?? submitTrigger,
    });
  }

  let currentWarning: TeamColorWarning | null = null;
  let hoveredTrigger: HTMLElement | null = null;
  let focusedTrigger: HTMLElement | null = null;
  let pinnedTrigger: HTMLElement | null = null;
  let hideTimer: number | null = null;

  const cancelHide = () => {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      hoveredTrigger = null;
      sync();
    }, 120);
  };

  const activeTrigger = () => pinnedTrigger ?? hoveredTrigger ?? focusedTrigger;

  const triggerFor = (element: HTMLElement) =>
    triggers.find((trigger) => trigger.element === element);

  const positionPopover = () => {
    const active = activeTrigger();
    const anchor = active ? triggerFor(active)?.anchor ?? active : null;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height - gap);
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  function sync(): void {
    const active = activeTrigger();
    const shouldShow = currentWarning !== null && active !== null;

    if (shouldShow) {
      popover.hidden = false;
      popover.setAttribute("aria-hidden", "false");
      positionPopover();
    } else {
      popover.hidden = true;
      popover.setAttribute("aria-hidden", "true");
    }

    button.setAttribute(
      "aria-expanded",
      shouldShow && active === button ? "true" : "false"
    );
  }

  const reposition = () => {
    if (!popover.hidden) positionPopover();
  };

  for (const trigger of triggers) {
    const { element } = trigger;

    element.addEventListener("pointerenter", () => {
      cancelHide();
      hoveredTrigger = element;
      sync();
    });
    element.addEventListener("pointerleave", scheduleHide);

    element.addEventListener("focusin", () => {
      focusedTrigger = element;
      sync();
    });
    element.addEventListener("focusout", () => {
      if (focusedTrigger === element) focusedTrigger = null;
      sync();
    });

    element.addEventListener("click", (event) => {
      if (!currentWarning) return;
      event.stopPropagation();
      pinnedTrigger = pinnedTrigger === element ? null : element;
      sync();
    });
  }

  popover.addEventListener("pointerenter", () => {
    cancelHide();
    sync();
  });
  popover.addEventListener("pointerleave", scheduleHide);

  document.addEventListener("click", (event) => {
    if (!pinnedTrigger) return;
    const target = event.target as Node;
    if (
      popover.contains(target) ||
      triggers.some((trigger) => trigger.element.contains(target))
    ) {
      return;
    }
    pinnedTrigger = null;
    sync();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (!pinnedTrigger && popover.hidden)) return;
    pinnedTrigger = null;
    hoveredTrigger = null;
    focusedTrigger = null;
    sync();
  });

  window.addEventListener("resize", reposition);
  document.addEventListener("scroll", reposition, true);

  return {
    update(pattern: number[][], secondaryHex: string) {
      const warning = evaluateTeamColorWarning(pattern, secondaryHex);
      currentWarning = warning;

      button.hidden = warning === null;
      if (submitButton) submitButton.disabled = warning !== null;
      submitTrigger?.classList.toggle("is-warning", warning !== null);

      if (!warning) {
        pinnedTrigger = null;
        hoveredTrigger = null;
        focusedTrigger = null;
        sync();
        return;
      }

      text.textContent = buildWarningText(warning);
      sync();
    },
  };
}
