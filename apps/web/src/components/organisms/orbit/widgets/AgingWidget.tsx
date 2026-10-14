import React from 'react';
import { Hourglass } from 'lucide-react';
import { useApplicationsInfinite } from '../../../../api/hooks/queries/useApplicationsInfinite';
import { daysSince } from '../../../../utils/helpers/days-since';
import { Spinner } from '../../../atoms/Spinner';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

/** Applications still waiting for a reply, longest wait first. */
export const AgingWidget: React.FC<WidgetProps> = ({ frame }) => {
  const { data, isLoading, isError } = useApplicationsInfinite({
    archived: false,
    sort: 'appliedAt',
    order: 'asc',
    limit: 50,
  });
  const rows = React.useMemo(
    () =>
      (data?.pages.flatMap((p) => p.items) ?? [])
        .filter((a) => a.statusCategory === 'APPLIED' && a.dates?.appliedAt)
        .map((a) => ({ app: a, days: daysSince(a.dates?.appliedAt) }))
        .filter((r): r is { app: typeof r.app; days: number } => r.days !== null)
        .sort((a, b) => b.days - a.days)
        .slice(0, 8),
    [data],
  );

  return (
    <WidgetFrame title="Waiting the longest" icon={Hourglass} {...frame}>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load applications.
        </p>
      ) : rows.length === 0 ? (
        <p className="py-3 text-center text-xs text-text-secondary">
          No application is waiting for a reply.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map(({ app, days }) => (
            <li key={app.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-text-primary">
                  {app.roleTitle}
                </span>
                <span className="block truncate text-text-secondary">{app.companyName}</span>
              </span>
              <span
                className={`flex-shrink-0 rounded-md px-1.5 py-0.5 font-semibold ${
                  days >= 21
                    ? 'bg-bg-danger-subtle text-text-danger'
                    : 'bg-bg-muted text-text-secondary'
                }`}
              >
                {days === 0 ? 'today' : `${days}d`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
};
