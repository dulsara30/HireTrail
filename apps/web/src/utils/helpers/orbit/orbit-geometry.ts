import { ORBIT_KINDS, type OrbitKind } from '@hiretrail/shared';
import { type OrbitEvent } from './orbit-events';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RadarPoint {
  event: OrbitEvent;
  x: number;
  y: number;
  /** Distance from the centre as a fraction of the radius (0 to 1). */
  ring: number;
  side: 'earlier' | 'later' | 'now';
}

export interface RadarLayout {
  points: RadarPoint[];
  /** Items outside the zoom range, which are not drawn. */
  hidden: number;
}

/** A small stable number from text, so a dot always lands in the same place. */
export function hashToUnit(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

/**
 * Distance from the centre for a time distance. The scale is a square root so the days close to the
 * reference date get most of the room, and the rings are labelled with the same function.
 */
export function ringForDays(days: number, zoomDays: number): number {
  return Math.sqrt(Math.min(Math.abs(days), zoomDays) / zoomDays);
}

export function daysForRing(ring: number, zoomDays: number): number {
  return ring * ring * zoomDays;
}

const WEDGE_SPREAD = 150; // degrees used by all the kinds, centred on the horizontal axis

/**
 * Places every event on the radar. Earlier items go left, later ones right. Each kind has its own
 * wedge, and a dot's exact spot is stable (from its id), so the picture does not shuffle on refresh.
 */
export function layoutRadar(
  events: OrbitEvent[],
  reference: Date,
  zoomDays: number,
  radius: number,
  center: { x: number; y: number },
): RadarLayout {
  const kinds = ORBIT_KINDS as readonly OrbitKind[];
  const wedge = WEDGE_SPREAD / kinds.length;
  const placed: RadarPoint[] = [];
  let hidden = 0;

  for (const event of events) {
    const days = (event.at.getTime() - reference.getTime()) / DAY_MS;
    if (Math.abs(days) > zoomDays) {
      hidden++;
      continue;
    }
    const kindIndex = kinds.indexOf(event.kind);
    const base = -WEDGE_SPREAD / 2 + wedge * (kindIndex + 0.5);
    const jitter = (hashToUnit(event.id) - 0.5) * wedge * 0.8;
    const angle = ((base + jitter) * Math.PI) / 180;
    const ring = Math.max(0.06, ringForDays(days, zoomDays));
    const side = Math.abs(days) < 0.5 ? 'now' : days < 0 ? 'earlier' : 'later';
    const direction = days < 0 ? -1 : 1;
    placed.push({
      event,
      ring,
      side,
      x: center.x + direction * ring * radius * Math.cos(angle),
      y: center.y + ring * radius * Math.sin(angle),
    });
  }

  return { points: separate(placed, center, 9), hidden };
}

/** Nudges dots that overlap apart along their ring, a few passes, always in the same order. */
function separate(
  points: RadarPoint[],
  center: { x: number; y: number },
  minGap: number,
): RadarPoint[] {
  const out = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!;
        const b = out[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= minGap * 2 || dist === 0) continue;
        // Push apart along the tangent of the circle around the centre
        const ax = a.x - center.x;
        const ay = a.y - center.y;
        const len = Math.hypot(ax, ay) || 1;
        const tx = -ay / len;
        const ty = ax / len;
        const push = (minGap * 2 - dist) / 2;
        a.x -= tx * push;
        a.y -= ty * push;
        b.x += tx * push;
        b.y += ty * push;
      }
    }
  }
  return out;
}
