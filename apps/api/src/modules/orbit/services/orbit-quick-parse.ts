import {
  ORBIT_KINDS,
  ORBIT_PRIORITIES,
  ORBIT_RECURRENCE_FREQS,
  ORBIT_TEXT_LIMITS,
  type OrbitKind,
  type OrbitPriority,
  type OrbitQuickParseDto,
  type OrbitRecurrenceFreq,
} from '@hiretrail/shared';
import { type OrbitParseAiOutput } from '../../../infrastructure/ai/gemini/prompts/orbit-parse.prompt';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/;

const asString = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

/** The user's local "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" as a UTC moment, or null when it is not a real date. */
export function localToUtc(
  value: string,
  tzOffsetMinutes: number,
): { at: Date; allDay: boolean } | null {
  const match = LOCAL_DATE_TIME.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const allDay = h === undefined;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0));
  const at = new Date(utc - tzOffsetMinutes * 60_000);
  // Reject dates the calendar rolled over (for example 31 February)
  const check = new Date(utc);
  if (check.getUTCMonth() !== Number(mo) - 1 || check.getUTCDate() !== Number(d)) return null;
  return Number.isNaN(at.getTime()) ? null : { at, allDay };
}

/**
 * Cleans what the model returned so only valid values reach the form: known kinds, real dates in a
 * sensible range, and a link only when the note really contained it. Anything else is dropped.
 */
export function normalizeQuickParse(
  raw: OrbitParseAiOutput,
  input: { text: string; now: Date; tzOffset: number },
): OrbitQuickParseDto {
  const kind: OrbitKind = (ORBIT_KINDS as readonly string[]).includes(String(raw.kind))
    ? (raw.kind as OrbitKind)
    : 'TASK';
  const title =
    asString(raw.title, ORBIT_TEXT_LIMITS.TITLE_MAX) ??
    input.text.trim().slice(0, ORBIT_TEXT_LIMITS.TITLE_MAX);

  let dueAt: string | null = null;
  let allDay = false;
  if (typeof raw.dueLocal === 'string') {
    const parsed = localToUtc(raw.dueLocal, input.tzOffset);
    const earliest = input.now.getTime() - DAY_MS;
    const latest = input.now.getTime() + 5 * 365 * DAY_MS;
    if (parsed && parsed.at.getTime() >= earliest && parsed.at.getTime() <= latest) {
      dueAt = parsed.at.toISOString();
      allDay = parsed.allDay;
    }
  }

  const priority = (ORBIT_PRIORITIES as readonly string[]).includes(String(raw.priority))
    ? (raw.priority as OrbitPriority)
    : null;

  const tags = Array.isArray(raw.tags)
    ? Array.from(
        new Set(
          raw.tags
            .map((t) => asString(t, ORBIT_TEXT_LIMITS.TAG_MAX)?.replace(/^#/, ''))
            .filter((t): t is string => Boolean(t)),
        ),
      ).slice(0, 5)
    : [];

  let recurrence: OrbitQuickParseDto['recurrence'] = null;
  if (raw.recurrence && typeof raw.recurrence === 'object') {
    const r = raw.recurrence as { freq?: unknown; interval?: unknown };
    if ((ORBIT_RECURRENCE_FREQS as readonly string[]).includes(String(r.freq))) {
      const interval = Math.round(Number(r.interval ?? 1));
      recurrence = {
        freq: r.freq as OrbitRecurrenceFreq,
        interval: Number.isFinite(interval) ? Math.min(Math.max(interval, 1), 12) : 1,
      };
    }
  }

  // A link counts only if it is really in the note
  let watchUrl: string | null = null;
  const url = asString(raw.watchUrl, 2048);
  if (
    url &&
    /^https?:\/\//i.test(url) &&
    input.text.toLowerCase().includes(url.toLowerCase().replace(/\/$/, ''))
  ) {
    watchUrl = url;
  }

  return {
    title,
    kind,
    dueAt,
    allDay,
    priority,
    tags,
    company: asString(raw.company, 120),
    recurrence,
    watchUrl,
  };
}
