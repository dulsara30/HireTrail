import { describe, expect, it } from 'vitest';
import { type OrbitKind } from '@hiretrail/shared';
import { type OrbitEvent } from './orbit-events';
import { daysForRing, hashToUnit, layoutRadar, ringForDays } from './orbit-geometry';

const REF = new Date(2026, 9, 14, 12, 0, 0);
const CENTER = { x: 200, y: 150 };
const DAY = 24 * 60 * 60 * 1000;

const event = (id: string, days: number, kind: OrbitKind = 'TASK'): OrbitEvent => ({
  id,
  source: 'task',
  kind,
  title: id,
  at: new Date(REF.getTime() + days * DAY),
  allDay: false,
  done: false,
  overdue: false,
  priority: null,
  context: null,
  task: null,
  application: null,
});

describe('radar geometry', () => {
  it('hashes text to a stable number between 0 and 1', () => {
    expect(hashToUnit('abc')).toBe(hashToUnit('abc'));
    expect(hashToUnit('abc')).not.toBe(hashToUnit('abd'));
    for (const text of ['a', 'task-1', 'x'.repeat(50)]) {
      const value = hashToUnit(text);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('maps days to a ring and back, giving the near days the most room', () => {
    expect(ringForDays(0, 14)).toBe(0);
    expect(ringForDays(14, 14)).toBe(1);
    expect(ringForDays(-14, 14)).toBe(1);
    expect(ringForDays(3.5, 14)).toBeCloseTo(0.5, 5);
    expect(daysForRing(0.5, 14)).toBeCloseTo(3.5, 5);
    // 1 day out already uses a quarter of the radius at a 14 day zoom
    expect(ringForDays(1, 14)).toBeGreaterThan(0.25);
  });

  it('puts earlier items on the left, later ones on the right and today near the middle', () => {
    const { points } = layoutRadar(
      [event('past', -5), event('future', 5), event('today', 0.1)],
      REF,
      14,
      120,
      CENTER,
    );
    const at = (id: string) => points.find((p) => p.event.id === id)!;
    expect(at('past').x).toBeLessThan(CENTER.x);
    expect(at('past').side).toBe('earlier');
    expect(at('future').x).toBeGreaterThan(CENTER.x);
    expect(at('future').side).toBe('later');
    expect(at('today').side).toBe('now');
    expect(at('today').ring).toBeLessThan(at('future').ring);
  });

  it('puts items farther in time farther from the centre', () => {
    const { points } = layoutRadar(
      [event('near', 1), event('mid', 4), event('far', 12)],
      REF,
      14,
      120,
      CENTER,
    );
    const ring = (id: string) => points.find((p) => p.event.id === id)!.ring;
    expect(ring('near')).toBeLessThan(ring('mid'));
    expect(ring('mid')).toBeLessThan(ring('far'));
  });

  it('keeps every dot inside the radar', () => {
    const events = Array.from({ length: 60 }, (_, i) =>
      event(
        `e${i}`,
        (i % 29) - 14,
        (['TASK', 'CALL', 'INTERVIEW', 'DEADLINE'] as OrbitKind[])[i % 4],
      ),
    );
    const { points } = layoutRadar(events, REF, 14, 120, CENTER);
    for (const p of points) {
      expect(Math.hypot(p.x - CENTER.x, p.y - CENTER.y)).toBeLessThanOrEqual(120 + 12);
    }
  });

  it('counts the items outside the zoom range instead of drawing them', () => {
    const { points, hidden } = layoutRadar(
      [event('in', 6), event('out', 20), event('out2', -30)],
      REF,
      14,
      120,
      CENTER,
    );
    expect(points).toHaveLength(1);
    expect(hidden).toBe(2);
    expect(layoutRadar([event('out', 20)], REF, 30, 120, CENTER).hidden).toBe(0);
  });

  it('is stable: the same input always gives the same picture', () => {
    const events = [
      event('a', 2, 'CALL'),
      event('b', 2, 'CALL'),
      event('c', 2, 'CALL'),
      event('d', -3),
    ];
    const first = layoutRadar(events, REF, 14, 120, CENTER);
    const second = layoutRadar(events, REF, 14, 120, CENTER);
    expect(second.points.map((p) => [p.x, p.y])).toEqual(first.points.map((p) => [p.x, p.y]));
  });

  it('pulls apart dots that would sit on top of each other', () => {
    const events = Array.from({ length: 4 }, (_, i) => event(`same${i}`, 3, 'MEETING'));
    const { points } = layoutRadar(events, REF, 14, 120, CENTER);
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]!;
        const b = points[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(4);
      }
    }
  });
});
