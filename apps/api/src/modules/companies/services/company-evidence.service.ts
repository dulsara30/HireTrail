import { type GroundingSource } from '../../../core/ports/ai-provider.port';
import { type ProviderHealth } from '../../../core/ports/provider-health.port';
import { type WebPageFetcher } from '../../../core/ports/web-page-fetcher.port';
import {
  WebSearchUnavailableError,
  type WebSearchFailure,
  type WebSearchProvider,
} from '../../../core/ports/web-search.port';
import { logger } from '../../../core/logger/logger';
import { type ExternalUsageRepository } from '../../ai/repositories/external-usage.repository';
import { registrableDomain } from './company-domain';
import { candidateDomains, mentionsCompany, type EvidencePage } from './company-evidence';

const MAX_PAGES = 5;
const MAX_TEXT = 4000;
const MIN_TEXT = 80;

/** Pages on a company site that usually hold the facts we want. */
const SUBPAGES = ['/about', '/contact', '/careers', '/about-us', '/contact-us'];

export interface Evidence {
  pages: EvidencePage[];
  /** Every address found that is about the company (pages and other search results, for example LinkedIn). */
  urls: string[];
  sources: GroundingSource[];
  /** True when the search service could not be used (no key, out of credits, cooling down). */
  searchUnavailable: boolean;
}

export interface EvidenceOptions {
  monthlyBudget: number;
  /** Try the company's own website when search gives nothing. */
  websiteGuess: boolean;
}

const COOLDOWN_MS: Record<Exclude<WebSearchFailure, 'QUOTA'>, number> = {
  RATE_LIMIT: 60_000,
  AUTH: 6 * 60 * 60 * 1000,
  ERROR: 2 * 60_000,
};

const monthKey = (now = new Date()): string => now.toISOString().slice(0, 7);

/** Milliseconds until the first moment of next month (UTC), when search credits renew. */
const untilNextMonth = (now = new Date()): number =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - now.getTime();

/**
 * Collects real public pages about a company: web search first, then the company's own website.
 * Models only ever read these pages, so every value can be traced to a source.
 */
export class CompanyEvidenceService {
  private readonly inflight = new Map<string, Promise<Evidence>>();

  constructor(
    private readonly search: WebSearchProvider,
    private readonly fetcher: WebPageFetcher,
    private readonly health: ProviderHealth,
    private readonly usage: ExternalUsageRepository,
    private readonly options: EvidenceOptions,
  ) {}

  /** Simultaneous requests for the same company share one search. */
  public gather(
    name: string,
    opts: { hint?: string | null; query?: string } = {},
  ): Promise<Evidence> {
    const key = `${name.toLowerCase()}|${opts.hint ?? ''}|${opts.query ?? ''}`;
    const running = this.inflight.get(key);
    if (running) return running;
    const promise = this.collect(name, opts).finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  private async collect(
    name: string,
    opts: { hint?: string | null; query?: string },
  ): Promise<Evidence> {
    const query = opts.query ?? `${name} company official website ${opts.hint ?? ''}`.trim();
    const searched = await this.fromSearch(name, query);
    let pages = searched.pages;
    if (pages.length === 0 && this.options.websiteGuess) {
      pages = await this.fromWebsites(name, opts.hint);
    }
    const urls = Array.from(new Set([...searched.urls, ...pages.map((p) => p.url)]));
    return {
      pages,
      urls,
      sources: pages.map((p) => ({ url: p.url, title: p.title })),
      searchUnavailable: searched.unavailable,
    };
  }

  private async fromSearch(
    name: string,
    query: string,
  ): Promise<{ pages: EvidencePage[]; urls: string[]; unavailable: boolean }> {
    if (!this.search.isConfigured()) return { pages: [], urls: [], unavailable: true };
    const key = `search:${this.search.id}`;
    if (await this.health.isOpen(key)) return { pages: [], urls: [], unavailable: true };

    const allowed = await this.usage.reserve(
      this.search.id,
      monthKey(),
      1,
      this.options.monthlyBudget,
    );
    if (!allowed) return { pages: [], urls: [], unavailable: true };

    try {
      const results = await this.search.search(query, { maxResults: MAX_PAGES });
      const pages: EvidencePage[] = [];
      const urls: string[] = [];
      for (const r of results) {
        const text = (r.text ?? r.snippet).trim().slice(0, MAX_TEXT);
        if (mentionsCompany(`${r.title} ${r.snippet} ${r.url}`, name)) urls.push(r.url);
        // A page must be about this company, otherwise a generic result could be mistaken for it
        if (text.length < MIN_TEXT || !mentionsCompany(`${r.title} ${text} ${r.url}`, name))
          continue;
        pages.push({ url: r.url, title: r.title, text, via: 'search' });
      }
      return { pages, urls, unavailable: false };
    } catch (err) {
      const reason: WebSearchFailure =
        err instanceof WebSearchUnavailableError ? err.reason : 'ERROR';
      const cooldown = reason === 'QUOTA' ? untilNextMonth() : COOLDOWN_MS[reason];
      logger.warn({ provider: this.search.id, reason }, 'Web search unavailable');
      await this.health.trip(key, cooldown, `search ${reason.toLowerCase()}`);
      return { pages: [], urls: [], unavailable: true };
    }
  }

  /**
   * Guards against private and local addresses live in the fetcher, so guessed domains are safe to try.
   * Once the home page is found, the site's own about, contact and careers pages are read too: they
   * hold the contact email and careers link, and each address is real because it answered.
   */
  private async fromWebsites(name: string, hint?: string | null): Promise<EvidencePage[]> {
    if (!this.options.websiteGuess) return [];
    const urls = candidateDomains(name, hint);
    const settled = await Promise.allSettled(urls.map((url) => this.fetcher.fetch(url)));
    const pages: EvidencePage[] = [];
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const page = result.value;
      const text = page.textContent.trim().slice(0, MAX_TEXT);
      if (text.length < MIN_TEXT || !mentionsCompany(`${page.title} ${text}`, name)) continue;
      pages.push({ url: page.finalUrl, title: page.title, text, via: 'website' });
      break;
    }
    const home = pages[0];
    if (!home) return pages;

    const base = registrableDomain(home.url);
    const seen = new Set(pages.map((p) => p.url.replace(/\/$/, '')));
    const origin = new URL(home.url).origin;
    const subpages = await Promise.allSettled(
      SUBPAGES.map((path) => this.fetcher.fetch(`${origin}${path}`)),
    );
    for (const result of subpages) {
      if (result.status !== 'fulfilled') continue;
      const page = result.value;
      const text = page.textContent.trim().slice(0, MAX_TEXT);
      const key = page.finalUrl.replace(/\/$/, '');
      // A missing page often redirects to the home page: skip anything we already have
      if (text.length < MIN_TEXT || seen.has(key) || registrableDomain(page.finalUrl) !== base)
        continue;
      seen.add(key);
      pages.push({ url: page.finalUrl, title: page.title, text, via: 'website' });
    }
    return pages;
  }
}
