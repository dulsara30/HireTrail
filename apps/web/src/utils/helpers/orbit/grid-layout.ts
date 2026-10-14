import { ORBIT_GRID, ORBIT_WIDGET_META, type OrbitWidgetDto } from '@hiretrail/shared';

export interface GridBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridLimits {
  minW: number;
  minH: number;
}

export const GRID_COLUMNS = ORBIT_GRID.COLUMNS;

const overlaps = (a: GridBox, b: GridBox): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function limitsFor(widget: Pick<OrbitWidgetDto, 'type'>): GridLimits {
  const meta = ORBIT_WIDGET_META[widget.type];
  return { minW: meta.minW, minH: meta.minH };
}

/**
 * Pulls every widget up as far as it can go without touching another one. The widgets listed in
 * `fixed` do not move (the one being dragged), the others settle around them.
 */
export function compact<T extends GridBox>(
  boxes: T[],
  fixed: ReadonlySet<string> = new Set(),
): T[] {
  const result = boxes.map((b) => ({ ...b }));
  const order = [...result].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const settled: T[] = result.filter((b) => fixed.has(b.id));

  for (const box of order) {
    if (fixed.has(box.id)) continue;
    box.y = 0;
    while (settled.some((other) => overlaps(box, other))) box.y++;
    settled.push(box);
  }
  return result;
}

/** Moves one widget. Widgets in the way are pushed down, and gaps are closed. */
export function moveBox<T extends GridBox>(boxes: T[], id: string, x: number, y: number): T[] {
  const target = boxes.find((b) => b.id === id);
  if (!target) return boxes;
  const nextX = clamp(Math.round(x), 0, GRID_COLUMNS - target.w);
  const nextY = clamp(Math.round(y), 0, ORBIT_GRID.MAX_Y);
  const moved = boxes.map((b) => (b.id === id ? { ...b, x: nextX, y: nextY } : { ...b }));
  return resolve(moved, id);
}

/** Resizes one widget within the grid and its minimum size. Widgets in the way are pushed down. */
export function resizeBox<T extends GridBox>(
  boxes: T[],
  id: string,
  w: number,
  h: number,
  limits: GridLimits,
): T[] {
  const target = boxes.find((b) => b.id === id);
  if (!target) return boxes;
  const nextW = clamp(Math.round(w), limits.minW, GRID_COLUMNS - target.x);
  const nextH = clamp(Math.round(h), limits.minH, ORBIT_GRID.MAX_ROWS);
  const resized = boxes.map((b) => (b.id === id ? { ...b, w: nextW, h: nextH } : { ...b }));
  return resolve(resized, id);
}

/** Pushes colliding widgets below the active one, then settles everything upward. */
function resolve<T extends GridBox>(boxes: T[], activeId: string): T[] {
  const active = boxes.find((b) => b.id === activeId)!;
  const others = boxes
    .filter((b) => b.id !== activeId)
    .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const placed: T[] = [active];
  for (const box of others) {
    while (placed.some((p) => overlaps(box, p))) box.y++;
    placed.push(box);
  }
  return compact(boxes, new Set([activeId]));
}

/** The first free place for a new widget of this size: the top-left-most spot that does not overlap. */
export function findFreeSpot(boxes: GridBox[], w: number, h: number): { x: number; y: number } {
  const width = Math.min(w, GRID_COLUMNS);
  for (let y = 0; y <= ORBIT_GRID.MAX_Y; y++) {
    for (let x = 0; x + width <= GRID_COLUMNS; x++) {
      const candidate: GridBox = { id: 'new', x, y, w: width, h };
      if (!boxes.some((b) => overlaps(candidate, b))) return { x, y };
    }
  }
  return { x: 0, y: boxes.reduce((max, b) => Math.max(max, b.y + b.h), 0) };
}

/** True when no two widgets overlap and every widget is inside the grid. */
export function isValidLayout(boxes: GridBox[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i]!;
    if (a.x < 0 || a.y < 0 || a.w < 1 || a.h < 1 || a.x + a.w > GRID_COLUMNS) return false;
    for (let j = i + 1; j < boxes.length; j++) if (overlaps(a, boxes[j]!)) return false;
  }
  return true;
}

export function layoutHeight(boxes: GridBox[]): number {
  return boxes.reduce((max, b) => Math.max(max, b.y + b.h), 0);
}
