import { type AiProvider, type GenerateJsonResult } from '../../core/ports/ai-provider.port';
import { UpstreamError } from '../../core/errors/domain-errors';

/** Used when AI is disabled or GEMINI_API_KEY is missing: every call fails with AI_UNAVAILABLE. */
export class UnconfiguredAiProvider implements AiProvider {
  public generateJson<T>(): Promise<GenerateJsonResult<T>> {
    return Promise.reject(new UpstreamError('AI is not configured on this server'));
  }
}
