import React from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { useOrbitPlan, useOrbitTasksInfinite } from '../../../../api/hooks/queries/useOrbitQueries';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import {
  DUE_BUCKET_LABEL,
  DUE_BUCKET_ORDER,
  dueBucket,
  type DueBucket,
} from '../../../../utils/helpers/orbit/orbit-dates';
import { taskToListItem, type OrbitListItem } from '../../../../utils/helpers/orbit/orbit-events';
import { Spinner } from '../../../atoms/Spinner';
import { EventRow } from '../EventRow';
import { useOrbitActions } from '../useOrbitActions';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

/** The to-do list: grouped by when things are due, with the page filters and search applied. */
export const TasksWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const filters = useOrbitUiStore((s) => s.filters);
  const q = useDebouncedValue(filters.q.trim(), 300);
  const { open, toggleDone, openNew } = useOrbitActions();
  const { data: plan } = useOrbitPlan();

  const query = useOrbitTasksInfinite({
    q: q || undefined,
    kind: filters.kinds.length > 0 ? filters.kinds : undefined,
    status: filters.showDone ? 'ALL' : 'OPEN',
    priority: filters.priority || undefined,
    sort: 'due',
  });
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  const items = React.useMemo(
    () => (query.data?.pages.flatMap((p) => p.items) ?? []).map((t) => taskToListItem(t, now)),
    [query.data, now],
  );
  const groups = React.useMemo(() => {
    const map = new Map<DueBucket, OrbitListItem[]>();
    for (const item of items) {
      const bucket = item.done ? 'later' : dueBucket(item.at, item.allDay, now);
      map.set(bucket, [...(map.get(bucket) ?? []), item]);
    }
    return DUE_BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      bucket: b,
      items: map.get(b)!,
    }));
  }, [items, now]);

  return (
    <WidgetFrame
      title="Tasks"
      icon={ListChecks}
      {...frame}
      actions={
        <>
          {plan && plan.plan === 'FREE' && (
            <span className="text-[11px] text-text-secondary" title="Free plan limit">
              {plan.openTasks}/{plan.limits.tasks} used
            </span>
          )}
          <button
            type="button"
            onClick={() => openNew({ kind: 'TASK' })}
            className="flex items-center gap-1 rounded-md border border-border-default px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted"
          >
            <Plus className="h-3 w-3" aria-hidden="true" /> New
          </button>
        </>
      }
    >
      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : query.isError ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load your tasks.
        </p>
      ) : items.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-text-primary">Nothing to do</p>
          <p className="text-xs text-text-secondary">
            {q || filters.kinds.length > 0
              ? 'No items match your filters.'
              : 'Add a task with the bar at the top.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ bucket, items: rows }) => (
            <section key={bucket} aria-label={DUE_BUCKET_LABEL[bucket]}>
              <h3
                className={`px-1.5 pb-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  bucket === 'overdue' ? 'text-text-danger' : 'text-text-tertiary'
                }`}
              >
                {DUE_BUCKET_LABEL[bucket]} · {rows.length}
              </h3>
              <ul>
                {rows.map((item) => (
                  <EventRow
                    key={item.id}
                    event={item}
                    now={now}
                    onOpen={open}
                    onToggleDone={toggleDone}
                  />
                ))}
              </ul>
            </section>
          ))}
          <div ref={sentinelRef} className="flex justify-center py-1">
            {query.isFetchingNextPage && <Spinner size="sm" />}
          </div>
        </div>
      )}
    </WidgetFrame>
  );
};
