import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { type WebPageContent, type WebPageFetcher } from '../../core/ports/web-page-fetcher.port';
import { SourceUnreachableError } from '../../core/errors/domain-errors';
import { isPublicIp } from '../../core/security/ip-guard';
import { ContentExtractor } from './content-extractor';

interface FetchLimits {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
}

const DEFAULT_LIMITS: FetchLimits = { timeoutMs: 8000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3 };
const ALLOWED_TYPES = ['text/html', 'text/plain', 'application/xhtml+xml'];

interface RawResponse {
  status: number;
  location?: string;
  contentType: string;
  body: string;
}

interface ResolvedIp {
  address: string;
  family: 4 | 6;
}

export class SafeWebPageFetcher implements WebPageFetcher {
  constructor(private readonly limits: FetchLimits = DEFAULT_LIMITS) {}

  public async fetch(rawUrl: string): Promise<WebPageContent> {
    let current = this.parseUrl(rawUrl);

    for (let hop = 0; hop <= this.limits.maxRedirects; hop++) {
      const ip = await this.resolvePublicIp(current.hostname);
      const res = await this.request(current, ip);

      if (res.status >= 300 && res.status < 400 && res.location) {
        if (hop === this.limits.maxRedirects) break;
        current = this.parseUrl(new URL(res.location, current).toString());
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        throw new SourceUnreachableError('The page could not be read');
      }

      const type = res.contentType.split(';')[0]?.trim().toLowerCase() ?? '';
      if (!ALLOWED_TYPES.includes(type)) {
        throw new SourceUnreachableError('The page is not a readable HTML or text document');
      }

      let extracted;
      try {
        extracted =
          type === 'text/plain'
            ? ContentExtractor.fromPlain(res.body)
            : await ContentExtractor.fromHtml(res.body, current.toString());
      } catch {
        // The page could not be parsed: callers fall back to pasted text or the AI URL reader
        throw new SourceUnreachableError('The page could not be read');
      }
      return { title: extracted.title, textContent: extracted.text, finalUrl: current.toString() };
    }

    throw new SourceUnreachableError('Too many redirects');
  }

  private parseUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new SourceUnreachableError('Invalid URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new SourceUnreachableError('Only http and https links are supported');
    }
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (port !== 80 && port !== 443) {
      throw new SourceUnreachableError('Only standard web ports are supported');
    }
    if (url.username || url.password) {
      throw new SourceUnreachableError('Links with credentials are not supported');
    }
    return url;
  }

  /** Resolves DNS and rejects the host if ANY answer is not a public address. */
  private async resolvePublicIp(hostname: string): Promise<ResolvedIp> {
    const bare = hostname.replace(/^\[|\]$/g, '');
    const literal = isIP(bare);
    if (literal) {
      if (!isPublicIp(bare)) throw new SourceUnreachableError('This address is not allowed');
      return { address: bare, family: literal as 4 | 6 };
    }

    let answers: Array<{ address: string; family: number }>;
    try {
      answers = await dns.lookup(bare, { all: true, verbatim: true });
    } catch {
      throw new SourceUnreachableError('The host could not be found');
    }
    const first = answers[0];
    if (!first || answers.some((a) => !isPublicIp(a.address))) {
      throw new SourceUnreachableError('This address is not allowed');
    }
    return { address: first.address, family: first.family as 4 | 6 };
  }

  /** Connects to the exact IP that was checked; Host header and SNI keep the original name. */
  private request(url: URL, ip: ResolvedIp): Promise<RawResponse> {
    const isHttps = url.protocol === 'https:';
    const lookup = ((
      _host: string,
      options: { all?: boolean },
      cb: (...args: unknown[]) => void,
    ) => {
      if (options.all) {
        cb(null, [{ address: ip.address, family: ip.family }]);
        return;
      }
      cb(null, ip.address, ip.family);
    }) as unknown as LookupFunction;

    return new Promise<RawResponse>((resolve, reject) => {
      const lib = isHttps ? https : http;
      const bareHost = url.hostname.replace(/^\[|\]$/g, '');
      const req = lib.request(
        {
          hostname: bareHost,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          lookup,
          servername: isIP(bareHost) ? undefined : bareHost,
          timeout: this.limits.timeoutMs,
          headers: {
            Host: url.host,
            'User-Agent': 'HireTrailBot/1.0 (+job-post-reader)',
            Accept: 'text/html,text/plain;q=0.9',
            'Accept-Encoding': 'identity',
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > this.limits.maxBytes) {
              req.destroy(new SourceUnreachableError('The page is too large'));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              location: res.headers.location,
              contentType: String(res.headers['content-type'] ?? ''),
              body: Buffer.concat(chunks).toString('utf8'),
            }),
          );
          res.on('error', () => reject(new SourceUnreachableError('The page could not be read')));
        },
      );
      req.on('timeout', () => req.destroy(new SourceUnreachableError('The page took too long')));
      req.on('error', (err) =>
        reject(
          err instanceof SourceUnreachableError
            ? err
            : new SourceUnreachableError('The page could not be reached'),
        ),
      );
      req.end();
    });
  }
}
