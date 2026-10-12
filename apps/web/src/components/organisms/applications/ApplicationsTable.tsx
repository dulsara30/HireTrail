import React from 'react';
import { Columns3 } from 'lucide-react';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { ApplicationListItemDto } from '@hiretrail/shared';

import { StatusPill } from '../../molecules/StatusPill/StatusPill';
import { PriorityChip } from '../../molecules/PriorityChip/PriorityChip';
import { Badge } from '../../atoms/Badge';
import { Spinner } from '../../atoms/Spinner';
import { EmptyState } from '../../molecules/EmptyState';
import { Button } from '../../atoms/Button';

interface ApplicationsTableProps {
  items: ApplicationListItemDto[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectApplication: (id: string) => void;
  onNewApplication: () => void;
}

type ColumnKey =
  'role' | 'company' | 'status' | 'priority' | 'location' | 'appliedDate' | 'coverLetter';

const COLUMNS: Array<{ key: ColumnKey; label: string }> = [
  { key: 'role', label: 'Role' },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'location', label: 'Location' },
  { key: 'appliedDate', label: 'Applied Date' },
  { key: 'coverLetter', label: 'Cover Letter' },
];

const STORAGE_KEY = 'ht_app_columns';
const DEFAULT_VISIBLE: ColumnKey[] = COLUMNS.map((c) => c.key);

function loadVisible(): ColumnKey[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((k): k is ColumnKey => COLUMNS.some((c) => c.key === k));
      if (valid.length > 0) return valid;
    }
  } catch {
    // storage unavailable: use defaults
  }
  return DEFAULT_VISIBLE;
}

export const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  items,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectApplication,
  onNewApplication,
}) => {
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  });
  const [visible, setVisible] = React.useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  React.useEffect(() => {
    setVisible(loadVisible());
  }, []);

  const toggle = (key: ColumnKey) => {
    setVisible((current) => {
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      if (next.length === 0) return current;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable: keep in memory only
      }
      return next;
    });
  };

  const show = (key: ColumnKey) => visible.includes(key);

  if (isLoading && items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No applications found"
        description="Track your first job application to get started."
        action={
          <Button variant="primary" onClick={onNewApplication}>
            Add Application
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          aria-haspopup="true"
        >
          <Columns3 className="h-4 w-4" aria-hidden="true" />
          Columns
        </Button>
        {pickerOpen && (
          <div
            role="menu"
            className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-border-default bg-bg-surface p-2 shadow-lg"
          >
            {COLUMNS.map((c) => (
              <label
                key={c.key}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={show(c.key)}
                  onChange={() => toggle(c.key)}
                  className="h-3.5 w-3.5"
                />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-border-default bg-bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-default bg-bg-accent-subtle text-xs font-semibold uppercase text-text-accent">
            <tr>
              {show('role') && <th className="px-4 py-3">Role</th>}
              {show('company') && <th className="px-4 py-3">Company</th>}
              {show('status') && <th className="px-4 py-3">Status</th>}
              {show('priority') && <th className="px-4 py-3">Priority</th>}
              {show('location') && <th className="px-4 py-3">Location</th>}
              {show('appliedDate') && <th className="px-4 py-3">Applied Date</th>}
              {show('coverLetter') && <th className="px-4 py-3">Cover Letter</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {items.map((app) => (
              <tr
                key={app.id}
                onClick={() => onSelectApplication(app.id)}
                className="cursor-pointer hover:bg-bg-accent-subtle transition-colors"
              >
                {show('role') && (
                  <td className="px-4 py-3 font-medium text-text-primary">{app.roleTitle}</td>
                )}
                {show('company') && (
                  <td className="px-4 py-3 text-text-secondary">{app.companyName}</td>
                )}
                {show('status') && (
                  <td className="px-4 py-3">
                    <StatusPill status={app.resolvedStatus} />
                  </td>
                )}
                {show('priority') && (
                  <td className="px-4 py-3">
                    <PriorityChip priority={app.resolvedPriority} />
                  </td>
                )}
                {show('location') && (
                  <td className="px-4 py-3 text-text-secondary">{app.location || '—'}</td>
                )}
                {show('appliedDate') && (
                  <td className="px-4 py-3 text-text-secondary">
                    {app.dates?.appliedAt
                      ? new Date(app.dates.appliedAt).toLocaleDateString()
                      : '—'}
                  </td>
                )}
                {show('coverLetter') && (
                  <td className="px-4 py-3">
                    <Badge color={app.coverLetter ? 'success' : 'neutral'}>
                      {app.coverLetter ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {isFetchingNextPage && <Spinner size="sm" />}
        </div>
      </div>
    </div>
  );
};
