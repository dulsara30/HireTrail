/** Pure helpers that turn AI-extracted text into typed values, only when the source is explicit. */

export function normalizeForEvidence(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’‚‛`]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Evidence must be a substring of the source and the value must appear in the evidence. */
export function isEvidenceValid(source: string, value: string, evidence: string): boolean {
  if (!value || !evidence) return false;
  const src = normalizeForEvidence(source);
  const ev = normalizeForEvidence(evidence);
  const val = normalizeForEvidence(value);
  return ev.length > 0 && src.includes(ev) && ev.includes(val);
}

export interface ParsedSalary {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: 'HOUR' | 'MONTH' | 'YEAR' | null;
}

const CURRENCY_CODES = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED'];

function detectCurrency(text: string): string | null {
  const code = CURRENCY_CODES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text));
  if (code) return code;
  if (/\brs\.?\b|රු/i.test(text)) return 'LKR';
  if (text.includes('$')) return 'USD';
  if (text.includes('€')) return 'EUR';
  if (text.includes('£')) return 'GBP';
  if (text.includes('₹')) return 'INR';
  return null;
}

function detectPeriod(text: string): ParsedSalary['period'] {
  if (/(per|a|\/)\s*(hour|hr)\b|hourly/i.test(text)) return 'HOUR';
  if (/(per|a|\/)\s*(month|mo)\b|monthly/i.test(text)) return 'MONTH';
  if (/(per|a|\/)\s*(year|yr|annum)\b|annual|yearly|p\.a\./i.test(text)) return 'YEAR';
  return null;
}

/** Amounts become integers in minor units (x100). Returns null when no amount is explicit. */
export function parseSalary(text: string): ParsedSalary | null {
  const amounts: number[] = [];
  const regex = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m)?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = Number((match[1] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(raw)) continue;
    const mult =
      match[2]?.toLowerCase() === 'k' ? 1000 : match[2]?.toLowerCase() === 'm' ? 1_000_000 : 1;
    amounts.push(Math.round(raw * mult * 100));
  }
  if (amounts.length === 0) return null;
  const sorted = amounts.slice(0, 2).sort((a, b) => a - b);
  return {
    min: sorted[0] ?? null,
    max: sorted.length > 1 ? (sorted[1] ?? null) : null,
    currency: detectCurrency(text),
    period: detectPeriod(text),
  };
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function monthIndex(name: string): number {
  const lower = name.toLowerCase();
  return MONTHS.findIndex((m) => m === lower || m.slice(0, 3) === lower.slice(0, 3));
}

/** ISO date (YYYY-MM-DD) only when the text is unambiguous; otherwise null. */
export function parseUnambiguousDate(text: string): string | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dayMonth = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/.exec(
    text,
  );
  const monthDay = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(text);
  const parts = dayMonth
    ? { d: dayMonth[1], m: dayMonth[2], y: dayMonth[3] }
    : monthDay
      ? { d: monthDay[2], m: monthDay[1], y: monthDay[3] }
      : null;
  if (!parts) return null;
  const m = monthIndex(parts.m ?? '');
  const d = Number(parts.d);
  const y = Number(parts.y);
  if (m < 0 || d < 1 || d > 31) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
