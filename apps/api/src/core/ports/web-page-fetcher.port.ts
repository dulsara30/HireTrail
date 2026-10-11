export interface WebPageContent {
  title: string;
  textContent: string;
  finalUrl: string;
}

export interface WebPageFetcher {
  fetch(url: string): Promise<WebPageContent>;
}
