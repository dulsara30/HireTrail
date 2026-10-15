export interface MenuRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MenuPlacement {
  top: number;
  left: number;
  /** Whether the menu opens above the button (when there is no room below). */
  above: boolean;
}

const GAP = 4;
const EDGE = 8;

/**
 * Where to put a small menu next to its button so it is always fully on screen: below the button
 * when it fits, otherwise above it, and lined up with the button's right edge but kept inside the window.
 */
export function placeMenu(
  button: MenuRect,
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
): MenuPlacement {
  const fitsBelow = button.bottom + GAP + menu.height + EDGE <= viewport.height;
  const fitsAbove = button.top - GAP - menu.height >= EDGE;
  const above = !fitsBelow && fitsAbove;

  const rawTop = above ? button.top - GAP - menu.height : button.bottom + GAP;
  // If it fits neither way, keep it inside the window as well as possible
  const top = Math.min(
    Math.max(rawTop, EDGE),
    Math.max(viewport.height - menu.height - EDGE, EDGE),
  );
  const left = Math.min(
    Math.max(button.right - menu.width, EDGE),
    Math.max(viewport.width - menu.width - EDGE, EDGE),
  );
  return { top, left, above };
}
