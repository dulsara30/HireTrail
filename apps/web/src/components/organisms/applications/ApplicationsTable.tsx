import React from 'react';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { ApplicationListItemDto } from '@hiretrail/shared';

import { StatusPill } from '../../molecules/StatusPill/StatusPill';
import { PriorityChip } from '../../molecules/PriorityChip/PriorityChip';
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
    <div className="w-full overflow-x-auto rounded-md border border-border bg-bg">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-subtle text-xs font-semibold uppercase text-text-muted">
          <tr>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Applied Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((app) => (
            <tr
              key={app.id}
              onClick={() => onSelectApplication(app.id)}
              className="cursor-pointer hover:bg-bg-subtle transition-colors"
            >
              <td className="px-4 py-3 font-medium text-text">{app.roleTitle}</td>
              <td className="px-4 py-3 text-text-muted">{app.companyName}</td>
              <td className="px-4 py-3">
                <StatusPill status={app.resolvedStatus} />
              </td>
              <td className="px-4 py-3">
                <PriorityChip priority={app.resolvedPriority} />
              </td>
              <td className="px-4 py-3 text-text-muted">{app.location || '—'}</td>
              <td className="px-4 py-3 text-text-muted">
                {app.dates?.appliedAt ? new Date(app.dates.appliedAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="py-4 flex justify-center">
        {isFetchingNextPage && <Spinner size="sm" />}
      </div>
    </div>
  );
};
