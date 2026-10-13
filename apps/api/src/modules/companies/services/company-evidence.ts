import { registrableDomain } from './company-domain';

export interface EvidencePage {
  url: string;
  title: string;
  text: string;
  via: 'search' | 'website';
}

const LEGAL_WORDS = new Set([
  'inc',
  'incorporated',
  'ltd',
  'limited',
  'llc',
  'plc',
  'pvt',
  'private',
  'corp',
  'corporation',
  'co',
  'company',
  'group',
  'holdings',
  'gmbh',
  'pty',
]);

const TLDS = ['com', 'lk', 'io', 'co', 'net', 'org'];

/** Lowercase letters and digits separated by single spaces. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** The distinctive part of a company name, without legal words such as Inc, Ltd or Pvt. */
export function coreName(name: string): string {
  return normalizeText(name)
    .split(' ')
    .filter((word) => word && !LEGAL_WORDS.has(word))
    .join(' ');
}

/** True when the text mentions the company (with or without spaces, ignoring legal words). */
export function mentionsCompany(text: string, name: string): boolean {
  const core = coreName(name);
  if (core.length < 3) return false;
  const haystack = normalizeText(text);
  return haystack.includes(core) || haystack.replace(/ /g, '').includes(core.replace(/ /g, ''));
}

/** Up to six website addresses to try for a company. A domain in the hint is used on its own. */
export function candidateDomains(name: string, hint?: string | null): string[] {
  const fromHint = hint?.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})/i)?.[1];
  if (fromHint) return [`https://${fromHint.toLowerCase()}`];

  const slug = coreName(name).replace(/ /g, '');
  if (slug.length < 3) return [];
  return TLDS.map((tld) => `https://${slug}.${tld}`);
}

/**
 * A value is accepted only when a page it cites really contains it. This keeps invented values
 * out, even when a model claims a source.
 */
export function valueBackedByPages(
  value: string,
  citedUrls: string[],
  pages: EvidencePage[],
  kind: 'url' | 'text' = 'text',
): boolean {
  const cited = new Set(citedUrls.map((u) => registrableDomain(u)));
  const relevant = pages.filter(
    (p) => citedUrls.includes(p.url) || cited.has(registrableDomain(p.url)),
  );
  if (relevant.length === 0) return false;

  if (kind === 'url') {
    const domain = registrableDomain(value);
    if (!domain) return false;
    return relevant.some(
      (p) => registrableDomain(p.url) === domain || p.text.toLowerCase().includes(domain),
    );
  }

  const needle = normalizeText(value);
  if (!needle) return false;
  return relevant.some((p) => normalizeText(`${p.title} ${p.text}`).includes(needle));
}

const CAREERS_PATH = /(career|jobs|join-us|work-with-us|vacanc|opportunit)/i;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PREFERRED_MAILBOXES = [
  'careers',
  'hr',
  'jobs',
  'info',
  'hello',
  'contact',
  'enquiries',
  'support',
];

/** The company's LinkedIn page, taken from a real result address (never invented). */
export function findLinkedinCompanyUrl(urls: string[], name: string): string | null {
  const core = coreName(name).replace(/ /g, '');
  if (core.length < 3) return null;
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) continue;
      const slug = /^\/company\/([a-z0-9._%-]+)/i.exec(url.pathname)?.[1];
      if (!slug) continue;
      const flat = normalizeText(decodeURIComponent(slug)).replace(/ /g, '');
      if (flat.includes(core) || core.includes(flat)) {
        return `https://www.linkedin.com/company/${slug.toLowerCase()}`;
      }
    } catch {
      // not a usable address
    }
  }
  return null;
}

/** A careers or jobs page on the company's own domain, from the addresses we actually found. */
export function findCareersUrl(urls: string[], websiteUrl: string | null): string | null {
  if (!websiteUrl) return null;
  const base = registrableDomain(websiteUrl);
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (registrableDomain(url.hostname) !== base) continue;
      if (CAREERS_PATH.test(url.pathname) || /^careers?\./i.test(url.hostname)) return raw;
    } catch {
      // not a usable address
    }
  }
  return null;
}

/**
 * A contact email written on one of the pages, on the company's own domain. Found by code, not by a
 * model, so it can never be made up. Role mailboxes such as careers@ or info@ are preferred.
 */
export function extractContactEmail(
  pages: EvidencePage[],
  websiteUrl: string | null,
): { email: string; url: string } | null {
  const first = pages[0];
  const base = websiteUrl
    ? registrableDomain(websiteUrl)
    : first
      ? registrableDomain(first.url)
      : '';
  if (!base) return null;

  const found: Array<{ email: string; url: string }> = [];
  for (const page of pages) {
    for (const match of page.text.match(EMAIL_PATTERN) ?? []) {
      const email = match.toLowerCase();
      const [local = '', domain = ''] = email.split('@');
      if (registrableDomain(domain) !== base) continue;
      if (
        /(no-?reply|example|sentry|wixpress)/.test(local) ||
        /\.(png|jpe?g|gif|svg|webp)$/.test(domain)
      ) {
        continue;
      }
      found.push({ email, url: page.url });
    }
  }
  const rank = (email: string): number => {
    const index = PREFERRED_MAILBOXES.indexOf(email.split('@')[0] ?? '');
    return index === -1 ? PREFERRED_MAILBOXES.length : index;
  };
  return found.sort((a, b) => rank(a.email) - rank(b.email))[0] ?? null;
}

/** A plausible founding year: four digits, not in the future. */
export function isPlausibleYear(value: string, now = new Date()): boolean {
  return /^(18|19|20)\d{2}$/.test(value) && Number(value) <= now.getFullYear();
}

/** A city is a short place name. Street addresses (digits, long text) are rejected. */
export function looksLikeCityName(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && v.length <= 40 && !/\d/.test(v);
}
