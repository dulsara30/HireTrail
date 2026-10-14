import { describe, expect, it } from 'vitest';
import {
  compact,
  findFreeSpot,
  isValidLayout,
  layoutHeight,
  moveBox,
  resizeBox,
  type GridBox,
} from './grid-layout';

const box = (id: string, x: number, y: number, w: number, h: number): GridBox => ({
  id,
  x,
  y,
  w,
  h,
});
const byId = (boxes: GridBox[], id: string) => boxes.find((b) => b.id === id)!;

describe('grid layout', () => {
  it('pulls widgets up to close gaps', () => {
    const result = compact([box('a', 0, 5, 4, 2), box('b', 4, 3, 4, 2), box('c', 0, 9, 4, 2)]);
    expect(byId(result, 'a')).toMatchObject({ x: 0, y: 0 });
    expect(byId(result, 'b')).toMatchObject({ x: 4, y: 0 });
    expect(byId(result, 'c')).toMatchObject({ x: 0, y: 2 });
    expect(isValidLayout(result)).toBe(true);
  });

  it('moves a widget and pushes the ones in the way down', () => {
    const start = [box('a', 0, 0, 6, 3), box('b', 6, 0, 6, 3), box('c', 0, 3, 6, 3)];
    const result = moveBox(start, 'b', 0, 0);
    expect(byId(result, 'b')).toMatchObject({ x: 0, y: 0 });
    expect(byId(result, 'a').y).toBeGreaterThanOrEqual(3);
    expect(isValidLayout(result)).toBe(true);
    // the dragged widget stays where it was dropped
    expect(byId(result, 'b')).toMatchObject({ x: 0, y: 0, w: 6, h: 3 });
  });

  it('keeps a moved widget inside the grid', () => {
    const result = moveBox([box('a', 0, 0, 5, 2)], 'a', 11, -3);
    expect(byId(result, 'a')).toMatchObject({ x: 7, y: 0 });
    expect(isValidLayout(result)).toBe(true);
  });

  it('resizes within the grid and the minimum size, pushing others down', () => {
    const start = [box('a', 0, 0, 4, 2), box('b', 0, 2, 4, 2), box('c', 6, 0, 4, 2)];
    const grown = resizeBox(start, 'a', 5, 4, { minW: 3, minH: 2 });
    expect(byId(grown, 'a')).toMatchObject({ w: 5, h: 4 });
    expect(byId(grown, 'b').y).toBeGreaterThanOrEqual(4);
    expect(isValidLayout(grown)).toBe(true);

    const tooSmall = resizeBox(start, 'a', 1, 1, { minW: 3, minH: 2 });
    expect(byId(tooSmall, 'a')).toMatchObject({ w: 3, h: 2 });
    const tooWide = resizeBox(start, 'c', 12, 2, { minW: 3, minH: 2 });
    expect(byId(tooWide, 'c').x + byId(tooWide, 'c').w).toBeLessThanOrEqual(12);
  });

  it('finds the first free spot for a new widget', () => {
    const boxes = [box('a', 0, 0, 7, 5), box('b', 7, 0, 5, 3)];
    expect(findFreeSpot(boxes, 5, 3)).toEqual({ x: 7, y: 3 });
    expect(findFreeSpot([], 4, 4)).toEqual({ x: 0, y: 0 });
    expect(findFreeSpot([box('a', 0, 0, 12, 4)], 6, 3)).toEqual({ x: 0, y: 4 });
  });

  it('never leaves overlaps, whatever the moves', () => {
    let layout: GridBox[] = [
      box('a', 0, 0, 7, 5),
      box('b', 7, 0, 5, 3),
      box('c', 7, 3, 5, 4),
      box('d', 0, 5, 7, 5),
    ];
    const moves: Array<[string, number, number]> = [
      ['d', 0, 0],
      ['b', 3, 2],
      ['a', 6, 1],
      ['c', 0, 0],
      ['b', 11, 8],
    ];
    for (const [id, x, y] of moves) {
      layout = moveBox(layout, id, x, y);
      expect(isValidLayout(layout)).toBe(true);
    }
    layout = resizeBox(layout, 'a', 12, 6, { minW: 4, minH: 4 });
    expect(isValidLayout(layout)).toBe(true);
    expect(layoutHeight(layout)).toBeGreaterThan(0);
  });

  it('does nothing for an unknown id', () => {
    const start = [box('a', 0, 0, 4, 2)];
    expect(moveBox(start, 'zzz', 3, 3)).toBe(start);
    expect(resizeBox(start, 'zzz', 3, 3, { minW: 1, minH: 1 })).toBe(start);
  });
});
