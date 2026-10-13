export interface CooldownEntry {
  key: string;
  /** ISO time when the provider may be tried again. */
  until: string;
  reason: string;
}

/**
 * Remembers which external providers (AI models, search APIs) just failed, so the app skips them
 * for a while instead of waiting on a call that will fail again.
 */
export interface ProviderHealth {
  isOpen(key: string): Promise<boolean>;
  trip(key: string, cooldownMs: number, reason: string): Promise<void>;
  snapshot(): Promise<CooldownEntry[]>;
}

/** Used when no store is wired in (tests, scripts): nothing is ever skipped. */
export class NoopProviderHealth implements ProviderHealth {
  public async isOpen(): Promise<boolean> {
    return false;
  }

  public async trip(): Promise<void> {
    // nothing to remember
  }

  public async snapshot(): Promise<CooldownEntry[]> {
    return [];
  }
}
