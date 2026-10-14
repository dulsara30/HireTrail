import * as chrono from 'chrono-node';
import {
  type OrbitKind,
  type OrbitPriority,
  type OrbitQuickParseDto,
  type OrbitRecurrenceFreq,
} from '@hiretrail/shared';

export interface QuickAddRecurrence {
  freq: OrbitRecurrenceFreq;
  interval: number;
}

export interface QuickAddResult {
  title: string;
  kind: OrbitKind;
  /** True when a word in the text chose the kind (so the chips can show it as detected). */
  kindDetected: boolean;
  dueAt: Date | null;
  allDay: boolean;
  /** The words that were read as the date, for the chip label. */
  dateText: string | null;
  priority: OrbitPriority | null;
  tags: string[];
  /** The company name typed after @, or found in the sentence, to be matched against the user's companies. */
  companyQuery: string | null;
  recurrence: QuickAddRecurrence | null;
  recurrenceText: string | null;
  watchUrl: string | null;
  /** True when the words gave no clear kind and no date, so the AI refine button may help. */
  unsure: boolean;
}

const CAREERS_WORDS =
  'careers?|jobs?|openings?|vacanc(?:y|ies)|hiring|positions?|website|site|page';

const KIND_RULES: Array<[RegExp, OrbitKind]> = [
  [/\binterview(s|ing)?\b/i, 'INTERVIEW'],
  [/\bfollow[\s-]?up\b/i, 'FOLLOW_UP'],
  [/\bdeadline\b|\bdue\b/i, 'DEADLINE'],
  [/\bcall\b|\bphone\b|\bring\b/i, 'CALL'],
  [/\bmeeting\b|\bmeet\b|\bcatch[\s-]?up\b/i, 'MEETING'],
  // "check ... careers/jobs/website" without a repeat is a one-off reminder
  [
    /\bremind(er|\s+me)?\b|\bremember\b|\bcheck\b.*\b(careers?|jobs?|openings?|vacanc(?:y|ies)|hiring|website|site)\b/i,
    'REMINDER',
  ],
];

const PRIORITY_WORDS: Record<string, OrbitPriority> = {
  high: 'HIGH',
  urgent: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

const GENERIC_COMPANY_WORDS = new Set([
  'their',
  'its',
  'the',
  'a',
  'an',
  'my',
  'our',
  'company',
  'companies',
  'this',
  'that',
  'it',
]);

const WEEKDAY = /^(mon|tue|wed|thu|fri|sat|sun)/i;

function capitalise(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

const unit = (word: string): OrbitRecurrenceFreq =>
  /^d/i.test(word) ? 'DAILY' : /^w/i.test(word) ? 'WEEKLY' : 'MONTHLY';

/** Finds "every 2 weeks", "weekly", "every monday" and so on. Returns the text without it. */
function takeRecurrence(text: string): {
  text: string;
  recurrence: QuickAddRecurrence | null;
  matched: string | null;
} {
  const tries: Array<[RegExp, (m: RegExpExecArray) => { rec: QuickAddRecurrence; keep?: string }]> =
    [
      [
        /\bevery\s+other\s+(day|week|month)\b/i,
        (m) => ({ rec: { freq: unit(m[1]!), interval: 2 } }),
      ],
      [
        /\bevery\s+(\d{1,2})\s+(day|week|month)s?\b/i,
        (m) => ({ rec: { freq: unit(m[2]!), interval: Math.min(Math.max(Number(m[1]), 1), 12) } }),
      ],
      [/\bevery\s+(day|week|month)\b/i, (m) => ({ rec: { freq: unit(m[1]!), interval: 1 } })],
      [
        /\bevery\s+((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*)\b/i,
        (m) => ({ rec: { freq: 'WEEKLY', interval: 1 }, keep: m[1]! }),
      ],
      [/\b(biweekly|fortnightly)\b/i, () => ({ rec: { freq: 'WEEKLY', interval: 2 } })],
      [/\b(daily|weekly|monthly)\b/i, (m) => ({ rec: { freq: unit(m[1]!), interval: 1 } })],
    ];
  for (const [pattern, read] of tries) {
    const m = pattern.exec(text);
    if (!m) continue;
    const { rec, keep } = read(m);
    // "every monday" keeps "monday" so the first date can still be read from it
    const next = `${text.slice(0, m.index)} ${keep && WEEKDAY.test(keep) ? keep : ''} ${text.slice(m.index + m[0].length)}`;
    return { text: next, recurrence: rec, matched: m[0] };
  }
  return { text, recurrence: null, matched: null };
}

/** The first date of a repeating item that was typed without a date: one step from today. */
function firstOccurrence(now: Date, rec: QuickAddRecurrence): Date {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (rec.freq === 'DAILY') day.setDate(day.getDate() + rec.interval);
  else if (rec.freq === 'WEEKLY') day.setDate(day.getDate() + 7 * rec.interval);
  else day.setMonth(day.getMonth() + rec.interval);
  return day;
}

function cleanCompany(raw: string | undefined): string | null {
  if (!raw) return null;
  let value = raw
    .replace(/['’]s$/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/^(?:for|at|on|the)\s+/i, '')
    .replace(/\s+(?:for|at|on|in)$/i, '')
    .trim();
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 5) return null;
  if (words.every((w) => GENERIC_COMPANY_WORDS.has(w.toLowerCase()))) return null;
  if (GENERIC_COMPANY_WORDS.has(words[0]!.toLowerCase())) value = words.slice(1).join(' ');
  return value || null;
}

/** A company named in the sentence without @, for example "watch Altrium careers" or "check Sysco LABS website". */
function findCompany(text: string): string | null {
  const careers = `(?:${CAREERS_WORDS})`;
  const patterns: RegExp[] = [
    /\bcompany\s+watch\s+(?:for\s+|on\s+)?(.+)$/i,
    new RegExp(
      `\\b(?:watch|monitor|track|keep an eye on|keep track of|follow)\\s+(?:on\\s+)?(?:the\\s+)?(.+?)(?:\\s+${careers}\\b.*)?$`,
      'i',
    ),
    new RegExp(`\\b(?:check|look at|visit)\\s+(?:on\\s+)?(?:the\\s+)?(.+?)\\s+${careers}\\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const found = cleanCompany(pattern.exec(text)?.[1]);
    if (found) return found;
  }
  return null;
}

/**
 * Reads one line such as "Call Sysco tomorrow 3pm @Sysco #prep !high" into an item, by matching words
 * (no AI, no cost). It understands dates ("in 2 weeks", "next Monday"), kinds ("call", "interview",
 * "remind me", "company watch"), repeats ("every 2 weeks", "weekly"), links, @Company, #tag and
 * !high / !medium / !low. Anything it does not understand stays in the title.
 */
export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddResult {
  let text = input.trim();

  let priority: OrbitPriority | null = null;
  text = text.replace(/(^|\s)!(high|urgent|medium|low)\b/gi, (_m, space: string, word: string) => {
    priority = PRIORITY_WORDS[word.toLowerCase()] ?? null;
    return space;
  });

  const tags: string[] = [];
  text = text.replace(/(^|\s)#([\w-]{1,30})/g, (_m, space: string, tag: string) => {
    if (!tags.includes(tag)) tags.push(tag);
    return space;
  });

  let companyQuery: string | null = null;
  text = text.replace(
    /(^|\s)@(?:"([^"]+)"|([^\s#!@]+))/,
    (_m, space: string, quoted?: string, plain?: string) => {
      companyQuery = (quoted ?? plain ?? '').trim() || null;
      return space;
    },
  );

  // A web address becomes the page to check, and its host name stays in the text
  let watchUrl: string | null = null;
  text = text.replace(/\bhttps?:\/\/[^\s]+/i, (match) => {
    watchUrl = match.replace(/[.,;)]+$/, '');
    try {
      return new URL(watchUrl).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  });

  const rec = takeRecurrence(text);
  text = rec.text;
  const recurrence = rec.recurrence;

  let dueAt: Date | null = null;
  let allDay = false;
  let dateText: string | null = null;
  const found = chrono.parse(text, now, { forwardDate: true })[0];
  if (found) {
    dateText = found.text;
    dueAt = found.start.date();
    if (!found.start.isCertain('hour')) {
      allDay = true;
      dueAt = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate());
    }
    text = `${text.slice(0, found.index)} ${text.slice(found.index + found.text.length)}`;
  }
  if (!dueAt && recurrence) {
    dueAt = firstOccurrence(now, recurrence);
    allDay = true;
    dateText = 'first one';
  }

  const careersWord = new RegExp(`\\b(${CAREERS_WORDS})\\b`, 'i');
  const isCompanyWatch = /\bcompany\s+watch\b/i.test(text);
  const watchWords =
    /\b(watch|monitor|keep an eye on|keep track of|track)\b/i.test(text) && careersWord.test(text);
  const repeatedCheck =
    recurrence !== null &&
    /\b(check|look (?:at|for)|visit)\b/i.test(text) &&
    careersWord.test(text);

  let kind: OrbitKind = 'TASK';
  let kindDetected = false;
  if (isCompanyWatch || watchWords || repeatedCheck) {
    kind = 'WATCH';
    kindDetected = true;
  } else {
    for (const [pattern, candidate] of KIND_RULES) {
      if (pattern.test(text)) {
        kind = candidate;
        kindDetected = true;
        break;
      }
    }
  }

  if (!companyQuery && (kind === 'WATCH' || kind === 'REMINDER')) companyQuery = findCompany(text);

  // A company watch with no date still needs a first check: two weeks from now
  if (kind === 'WATCH' && !dueAt) {
    dueAt = firstOccurrence(now, { freq: 'WEEKLY', interval: 2 });
    allDay = true;
    dateText = 'in 2 weeks';
  }

  let title = text
    .replace(/^\s*(please\s+)?(remind me( to)?|reminder( to)?)[:\s]+/i, '')
    .replace(/\s+(in|on|at|by|for|after|before|next|this|from)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (kind === 'WATCH') {
    const noun = /\b(website|site)\b/i.test(text) ? 'website' : 'careers';
    const name = companyQuery;
    const onlyKeyword = /^(company\s+watch)?$/i.test(title);
    if (name) title = `Check ${name} ${noun}`;
    else if (onlyKeyword) title = 'Company watch';
  }
  // Only extras were typed (a tag, a company or a date): use the first of them as the title
  if (!title) title = tags[0] ?? companyQuery ?? dateText ?? 'New item';

  const words = title.split(/\s+/).filter(Boolean).length;
  return {
    title: capitalise(title),
    kind,
    kindDetected,
    dueAt,
    allDay,
    dateText,
    priority,
    tags,
    companyQuery,
    recurrence,
    recurrenceText: rec.matched,
    watchUrl,
    unsure: !kindDetected && !dueAt && words >= 4,
  };
}

/** Turns what the AI returned into the same shape the word-matching parser gives. */
export function aiToQuickAdd(dto: OrbitQuickParseDto): QuickAddResult {
  const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
  return {
    title: dto.title,
    kind: dto.kind,
    kindDetected: true,
    dueAt,
    allDay: dto.allDay,
    dateText: dueAt ? 'AI' : null,
    priority: dto.priority,
    tags: dto.tags,
    companyQuery: dto.company,
    recurrence: dto.recurrence,
    recurrenceText: dto.recurrence ? 'AI' : null,
    watchUrl: dto.watchUrl,
    unsure: false,
  };
}
