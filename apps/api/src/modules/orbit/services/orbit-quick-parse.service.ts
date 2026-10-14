import { AiFeature, type OrbitQuickParseDto, type OrbitQuickParseInput } from '@hiretrail/shared';
import { type AiProvider } from '../../../core/ports/ai-provider.port';
import {
  ORBIT_PARSE_SCHEMA,
  ORBIT_PARSE_SYSTEM_PROMPT,
  type OrbitParseAiOutput,
} from '../../../infrastructure/ai/gemini/prompts/orbit-parse.prompt';
import { type AiQuotaService } from '../../ai/services/ai-quota.service';
import { normalizeQuickParse } from './orbit-quick-parse';

/**
 * The AI refine button on quick add (PRO). Quick add already understands most sentences by matching
 * words, so this is only called when the user asks. The request is one sentence plus the time, on the
 * cheap model, and the answer only fills the preview.
 */
export class OrbitQuickParseService {
  constructor(
    private readonly ai: AiProvider,
    private readonly quota: AiQuotaService,
  ) {}

  public async parse(
    userId: string,
    input: OrbitQuickParseInput,
    now = new Date(),
  ): Promise<OrbitQuickParseDto> {
    const tzOffset = input.tzOffset ?? 0;
    const local = new Date(now.getTime() + tzOffset * 60_000).toISOString().slice(0, 16);

    const { result } = await this.quota.track(userId, AiFeature.ORBIT_PARSE, async (usage) => {
      const res = await this.ai.generateJson<OrbitParseAiOutput>({
        model: 'extract',
        system: ORBIT_PARSE_SYSTEM_PROMPT,
        content: JSON.stringify({ note: input.text, nowLocal: local, utcOffsetMinutes: tzOffset }),
        jsonSchema: ORBIT_PARSE_SCHEMA,
        timeoutMs: 15_000,
      });
      usage.add(res.modelId, res.usage);
      return res.data;
    });

    return normalizeQuickParse(result, { text: input.text, now, tzOffset });
  }
}
