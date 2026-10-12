import React from 'react';
import { Lightbulb, Lock, RefreshCw } from 'lucide-react';
import { useMe } from '../../../api/hooks/queries/useMe';
import { useInsights } from '../../../api/hooks/queries/useInsights';
import { useRefreshInsights } from '../../../api/hooks/mutations/useRefreshInsights';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ProLockBanner } from '../../molecules/ProLockBanner/ProLockBanner';

function refreshError(err: { code?: string; message?: string; details?: unknown }): string {
  if (err.code === 'RATE_LIMITED') {
    const resetsAt = (err.details as { resetsAt?: string } | undefined)?.resetsAt;
    return `Insights refresh once a day. Next refresh: ${
      resetsAt ? new Date(resetsAt).toLocaleString() : 'tomorrow'
    }.`;
  }
  if (err.code === 'EMAIL_NOT_VERIFIED') return 'Verify your email to use AI insights.';
  if (err.code === 'AI_QUOTA_EXCEEDED') return 'Daily AI limit reached. It resets tomorrow.';
  return err.message || 'AI is busy right now. Try again in a minute.';
}

/** Weekly AI insights (PRO). Only aggregated numbers are sent to the AI. */
export const InsightsCard: React.FC = () => {
  const { data: me } = useMe();
  const isPro = me?.plan === 'PRO';
  const { data: insights, isLoading } = useInsights(isPro);
  const refresh = useRefreshInsights();

  const canRefreshAt = insights ? new Date(insights.nextRefreshAt) : null;
  const waiting = canRefreshAt !== null && canRefreshAt.getTime() > Date.now();

  return (
    <section
      aria-labelledby="insights-title"
      className="space-y-4 rounded-2xl border border-border-default border-t-4 border-t-border-accent bg-bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-text-accent" aria-hidden="true" />
          <h2 id="insights-title" className="text-base font-bold text-text-primary">
            Weekly insights
          </h2>
          <Badge color="accent">PRO</Badge>
        </div>
        {isPro ? (
          <Button
            size="sm"
            variant="accent"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending || waiting}
            title={waiting ? 'You can refresh once a day' : undefined}
          >
            {refresh.isPending ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {insights ? 'Refresh' : 'Generate insights'}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled title="PRO feature">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            PRO only
          </Button>
        )}
      </div>

      {!isPro && (
        <ProLockBanner
          feature="Weekly AI insights"
          description="A short weekly read of what your numbers say and what to try next."
        />
      )}
      {refresh.isPending && (
        <p role="status" className="text-xs text-text-secondary">
          Reading your numbers…
        </p>
      )}
      {refresh.isError && (
        <p role="alert" className="text-xs text-text-danger">
          {refreshError(refresh.error)}
        </p>
      )}
      {isPro && isLoading && <Spinner size="sm" />}

      {isPro && !isLoading && !insights && !refresh.isPending && (
        <p className="text-sm text-text-secondary">
          No insights yet. Generate them once you have a few applications tracked.
        </p>
      )}

      {insights && (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {insights.insights.map((item) => (
              <li
                key={item.title}
                className="space-y-1.5 rounded-xl border border-border-accent bg-bg-accent-subtle p-4"
              >
                <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.detail}</p>
                {item.basedOn.length > 0 && (
                  <p className="text-[11px] text-text-tertiary">
                    Based on: {item.basedOn.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-text-tertiary">
            AI-written from your aggregated numbers, week {insights.isoWeek}. Updated{' '}
            {new Date(insights.refreshedAt).toLocaleString()}.
          </p>
        </>
      )}
    </section>
  );
};
