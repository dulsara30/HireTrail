import React from 'react';
import { ActivityDto } from '@hiretrail/shared';
import { Spinner } from '../../atoms/Spinner';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { Clock } from 'lucide-react';

interface RecentActivityListProps {
  activities: ActivityDto[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) => {
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  });

  return (
    <div className="space-y-3">
      {activities.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-1 text-xs border-l-2 border-border-default pl-3 py-1 bg-bg-surface-raised rounded-r-lg p-2.5"
        >
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="font-semibold text-text-primary">{item.summary}</span>
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(item.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          {item.changes && item.changes.length > 0 && (
            <p className="text-[11px] text-text-secondary mt-0.5">
              {item.changes
                .map((c) => `${c.field}: ${c.from ?? 'none'} → ${c.to ?? 'none'}`)
                .join(', ')}
            </p>
          )}
        </div>
      ))}

      {activities.length === 0 && !isLoading && (
        <p className="text-xs text-text-tertiary italic text-center py-6">
          No pipeline activity recorded yet.
        </p>
      )}

      <div ref={sentinelRef} className="py-2 flex justify-center">
        {isFetchingNextPage && <Spinner size="sm" />}
      </div>
    </div>
  );
};
