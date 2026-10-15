'use client';

import React from 'react';
import { useAuditLogsInfinite } from '../../../../api/hooks/queries/useAuditLogsInfinite';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import { Badge } from '../../../../components/atoms/Badge';
import { Spinner } from '../../../../components/atoms/Spinner';
import { EmptyState } from '../../../../components/molecules/EmptyState';

const ACTIONS = [
  'USER_PLAN_CHANGED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'COMPANY_MERGED',
  'VERIFICATION_APPLIED',
  'ADMIN_EMAIL_SENT',
];

function summarise(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(', ');
  }
  return String(value);
}

export default function AuditLogPage() {
  const [action, setAction] = React.useState('');
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAuditLogsInfinite(action || undefined);
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    onLoadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });
  const logs = React.useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label
          htmlFor="audit-action"
          className="text-xs font-semibold uppercase text-text-secondary"
        >
          Action
        </label>
        <select
          id="audit-action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, ' ').toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-text-danger">
          Failed to load the audit log.
        </p>
      ) : logs.length === 0 ? (
        <EmptyState
          title="No admin actions yet"
          description="Plan changes, suspensions and company merges will be listed here."
        />
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className="space-y-2 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge color="accent">{log.action.replace(/_/g, ' ')}</Badge>
                <time dateTime={log.createdAt} className="text-xs text-text-secondary">
                  {new Date(log.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="text-sm text-text-primary">
                <span className="font-semibold">{log.actorEmail ?? 'System'}</span> on{' '}
                {log.targetType}{' '}
                <span className="break-all text-text-secondary">{log.targetId}</span>
              </p>
              <div className="grid gap-2 text-xs md:grid-cols-2">
                <p className="rounded-md bg-bg-danger-subtle px-3 py-2 text-text-danger break-words">
                  <span className="font-semibold">Before:</span> {summarise(log.before)}
                </p>
                <p className="rounded-md bg-bg-success-subtle px-3 py-2 text-text-success break-words">
                  <span className="font-semibold">After:</span> {summarise(log.after)}
                </p>
              </div>
              {log.reason && <p className="text-xs text-text-secondary">Reason: {log.reason}</p>}
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="flex justify-center py-2">
        {isFetchingNextPage && <Spinner size="sm" />}
      </div>
    </div>
  );
}
