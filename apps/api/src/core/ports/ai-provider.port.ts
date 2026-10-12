export type AiModelKind = 'extract' | 'grounded';
export type AiTool = 'google_search' | 'url_context';

export interface GroundingSource {
  url: string;
  title?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateJsonRequest {
  model: AiModelKind;
  system: string;
  /** Untrusted content. Adapters fence it as data. */
  content: string;
  jsonSchema: object;
  tools?: AiTool[];
  timeoutMs: number;
}

export interface GenerateJsonResult<T> {
  data: T;
  groundingSources: GroundingSource[];
  usage: TokenUsage;
  modelId: string;
}

export interface ModelProbe {
  model: string;
  role: 'extract' | 'fallback' | 'search';
  ok: boolean;
  status: number | null;
  ms: number;
  message: string | null;
}

export interface AiProvider {
  generateJson<T>(req: GenerateJsonRequest): Promise<GenerateJsonResult<T>>;
  /** Optional diagnostics: a tiny call to each configured model (used by the admin "Test AI models" button). */
  probe?(): Promise<ModelProbe[]>;
}

/** Thrown by an adapter when the requested search tool cannot be used (e.g. free tier). */
export class AiToolUnavailableError extends Error {
  constructor(message = 'AI tool unavailable') {
    super(message);
    this.name = 'AiToolUnavailableError';
  }
}
