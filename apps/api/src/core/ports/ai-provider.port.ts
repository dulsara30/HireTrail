export interface ExtractedJobData {
  companyName?: string;
  roleTitle?: string;
  location?: string;
  workMode?: string;
  jobType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  descriptionHtml?: string;
  confidenceScore?: number;
  evidenceQuotes?: Record<string, string>;
}

export interface AiProvider {
  extractJobPost(content: string): Promise<ExtractedJobData>;
}
