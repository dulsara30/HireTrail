import { type GroundingSource } from '../../../core/ports/ai-provider.port';

const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);

export function registrableDomain(hostOrUrl: string): string {
  let host = hostOrUrl.trim().toLowerCase();
  try {
    host = new URL(host.includes('://') ? host : `https://${host}`).hostname;
  } catch {
    // keep the raw value
  }
  const parts = host
    .replace(/^www\./, '')
    .split('.')
    .filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const second = parts[parts.length - 2] ?? '';
  const take = SECOND_LEVEL.has(second) ? 3 : 2;
  return parts.slice(-take).join('.');
}

/** A claimed source must match a grounding source by exact URL, or by domain / title (redirect links). */
export function matchesGroundingSource(url: string, sources: GroundingSource[]): boolean {
  const domain = registrableDomain(url);
  return sources.some((s) => {
    if (s.url === url) return true;
    if (registrableDomain(s.url) === domain && !/vertexaisearch|googleusercontent/i.test(s.url)) {
      return true;
    }
    return Boolean(s.title) && registrableDomain(s.title ?? '') === domain;
  });
}
