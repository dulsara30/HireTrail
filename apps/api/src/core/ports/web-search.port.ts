export interface WebSearchResult {
  url: string;
  title: string;
  /** Short snippet from the search engine. */
  snippet: string;
  /** Page text when the engine returned it, otherwise null. */
  text: string | null;
}

export type WebSearchFailure = 'QUOTA' | 'RATE_LIMIT' | 'AUTH' | 'ERROR';

/** Thrown when the search service cannot be used right now. The reason decides how long to skip it. */
export class WebSearchUnavailableError extends Error {
  constructor(
    public readonly reason: WebSearchFailure,
    message = 'Web search is unavailable',
  ) {
    super(message);
    this.name = 'WebSearchUnavailableError';
  }
}

export interface WebSearchProvider {
  readonly id: string;
  isConfigured(): boolean;
  search(query: string, options?: { maxResults?: number }): Promise<WebSearchResult[]>;
}
