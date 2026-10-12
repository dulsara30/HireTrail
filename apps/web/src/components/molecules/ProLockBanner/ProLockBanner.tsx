import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Badge } from '../../atoms/Badge';

interface ProLockBannerProps {
  /** What is locked, for example "Autofill with AI". */
  feature: string;
  /** One sentence on what the feature does. */
  description?: string;
  compact?: boolean;
  className?: string;
}

/** Shown to FREE users in place of AI features. The server blocks the same calls with PLAN_REQUIRED. */
export const ProLockBanner: React.FC<ProLockBannerProps> = ({
  feature,
  description,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        role="note"
        className={`flex items-center gap-2 rounded-lg border border-border-accent bg-bg-accent-subtle px-3 py-2 text-xs ${className}`}
      >
        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-text-accent" aria-hidden="true" />
        <span className="font-semibold text-text-primary">{feature} is locked.</span>
        <span className="text-text-secondary">Upgrade to PRO to use it.</span>
      </div>
    );
  }

  return (
    <div
      role="note"
      className={`flex items-start gap-4 rounded-xl border border-border-accent bg-bg-accent-subtle p-4 ${className}`}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-bg-inverse text-text-inverse"
        aria-hidden="true"
      >
        <Lock className="h-5 w-5" />
      </span>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-text-primary">{feature}</p>
          <Badge color="accent">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            PRO
          </Badge>
        </div>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
        <p className="text-sm font-semibold text-text-accent">
          Upgrade to PRO to access AI features.
        </p>
        <p className="text-xs text-text-tertiary">
          PRO access is switched on by an admin for now. Everything else works on the free plan.
        </p>
      </div>
    </div>
  );
};
