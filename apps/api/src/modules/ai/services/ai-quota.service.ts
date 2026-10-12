import { AiFeature, type AiUsageDto } from '@hiretrail/shared';
import { AiQuotaExceededError, UpstreamError } from '../../../core/errors/domain-errors';
import { type Clock } from '../../../core/ports/clock.port';
import { type TokenUsage } from '../../../core/ports/ai-provider.port';
import { type AiUsageRepository } from '../repositories/ai-usage.repository';

export interface AiLimits {
  enabled: boolean;
  globalDailyLimit: number;
  perFeature: Record<AiFeature, number>;
}

export class UsageAccumulator {
  public model = '';
  public inputTokens = 0;
  public outputTokens = 0;

  public add(model: string, usage: TokenUsage): void {
    this.model = model;
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
  }
}

export class AiQuotaService {
  constructor(
    private readonly usageRepo: AiUsageRepository,
    private readonly clock: Clock,
    private readonly limits: AiLimits,
  ) {}

  private day(): string {
    return this.clock.now().toISOString().slice(0, 10);
  }

  private resetsAt(): string {
    const d = this.clock.now();
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
    ).toISOString();
  }

  /** Kill switch, global free-tier limit and the per-user daily quota. Throws before any model call. */
  public async assertAllowed(userId: string, feature: AiFeature): Promise<void> {
    if (!this.limits.enabled) {
      throw new UpstreamError('AI features are turned off right now');
    }
    const day = this.day();
    const [global, used] = await Promise.all([
      this.usageRepo.countGlobalForDay(day),
      this.usageRepo.countForUserFeature(userId, feature, day),
    ]);
    if (global >= this.limits.globalDailyLimit) {
      throw new UpstreamError('AI is busy right now, try again later');
    }
    if (used >= this.limits.perFeature[feature]) {
      throw new AiQuotaExceededError('Daily AI quota exceeded', { resetsAt: this.resetsAt() });
    }
  }

  /** Checks the quota, runs the work, and writes one aiUsage row (OK or ERROR). */
  public async track<T>(
    userId: string,
    feature: AiFeature,
    work: (usage: UsageAccumulator) => Promise<T>,
  ): Promise<{ result: T; usageId: string }> {
    await this.assertAllowed(userId, feature);
    const usage = new UsageAccumulator();
    const startedAt = Date.now();
    const base = { userId, feature, day: this.day() };
    try {
      const result = await work(usage);
      const row = await this.usageRepo.record({
        ...base,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: Date.now() - startedAt,
        outcome: 'OK',
      });
      return { result, usageId: row._id.toString() };
    } catch (err) {
      await this.usageRepo
        .record({
          ...base,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          latencyMs: Date.now() - startedAt,
          outcome: 'ERROR',
        })
        .catch(() => undefined);
      throw err;
    }
  }

  public async getUsage(userId: string): Promise<AiUsageDto> {
    const day = this.day();
    const features = Object.values(AiFeature);
    const counts = await Promise.all(
      features.map((f) => this.usageRepo.countForUserFeature(userId, f, day)),
    );
    const result = {} as AiUsageDto['features'];
    features.forEach((f, i) => {
      result[f] = { used: counts[i] ?? 0, limit: this.limits.perFeature[f] };
    });
    return { day, resetsAt: this.resetsAt(), features: result };
  }
}
