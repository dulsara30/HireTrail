import { describe, expect, it } from 'vitest';
import { placeMenu } from './menu-placement';

const MENU = { width: 160, height: 170 };
const VIEWPORT = { width: 1000, height: 700 };
const rect = (top: number, left: number, size = 24) => ({
  top,
  left,
  bottom: top + size,
  right: left + size,
});

describe('placeMenu', () => {
  it('opens below the button when there is room', () => {
    const placed = placeMenu(rect(100, 500), MENU, VIEWPORT);
    expect(placed.above).toBe(false);
    expect(placed.top).toBe(100 + 24 + 4);
  });

  it('opens above the button when it would run off the bottom (the footer buttons)', () => {
    const placed = placeMenu(rect(660, 500), MENU, VIEWPORT);
    expect(placed.above).toBe(true);
    expect(placed.top).toBe(660 - 4 - MENU.height);
    expect(placed.top + MENU.height).toBeLessThanOrEqual(660);
  });

  it('lines up with the button right edge and stays inside the window', () => {
    expect(placeMenu(rect(100, 500), MENU, VIEWPORT).left).toBe(500 + 24 - 160);
    expect(placeMenu(rect(100, 2), MENU, VIEWPORT).left).toBe(8);
    expect(placeMenu(rect(100, 990), MENU, VIEWPORT).left).toBe(1000 - 160 - 8);
  });

  it('keeps the menu on screen even when there is room neither above nor below', () => {
    const short = { width: 1000, height: 200 };
    const placed = placeMenu(rect(80, 500), MENU, short);
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.top + MENU.height).toBeLessThanOrEqual(short.height - 8 + 0.001);
  });
});
