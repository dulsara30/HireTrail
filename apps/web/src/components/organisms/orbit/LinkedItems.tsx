import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, ListChecks, Plus } from 'lucide-react';
import {
  useCompleteOrbitTask,
  useCreateOrbitTask,
  useReopenOrbitTask,
} from '../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitTasksInfinite } from '../../../api/hooks/queries/useOrbitQueries';
import { ROUTES } from '../../../constants/routes';
import { useNow } from '../../../hooks/useNow';
import { useOrbitUiStore } from '../../../store/orbit-ui.store';
import { formatWhen } from '../../../utils/helpers/orbit/orbit-dates';
import { taskToListItem, type OrbitListItem } from '../../../utils/helpers/orbit/orbit-events';
import { parseQuickAdd } from '../../../utils/helpers/orbit/quick-add';
import { Spinner } from '../../atoms/Spinner';
import { EventRow } from './EventRow';
import { OrbitProNote, isPlanError } from './OrbitProNote';

interface LinkedItemsProps {
  /** Show what is linked to this application. */
  applicationId?: string;
  /** Show what is linked to this company (reminders, company watch, tasks). */
  companyId?: string;
  /** A short label for the empty state and the placeholder, for example the role or company name. */
  subject: string;
  className?: string;
}

/**
 * The tasks, reminders, calls and company watches linked to an application or a company, with a quick
 * way to add one. Used under the application details and on the company page. Items open on Orbit.
 */
export const LinkedItems: React.FC<LinkedItemsProps> = ({
  applicationId,
  companyId,
  subject,
  className,
}) => {
  const router = useRouter();
  const now = useNow();
  const select = useOrbitUiStore((s) => s.select);
  const complete = useCompleteOrbitTask();
  const reopen = useReopenOrbitTask();
  const create = useCreateOrbitTask();
  const [text, setText] = React.useState('');
  const [showDone, setShowDone] = React.useState(false);

  const query = useOrbitTasksInfinite({
    applicationId,
    companyId,
    status: 'ALL',
    sort: 'due',
  });
  const items = React.useMemo(
    () => (query.data?.pages.flatMap((p) => p.items) ?? []).map((t) => taskToListItem(t, now)),
    [query.data, now],
  );
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const openOnOrbit = (item: OrbitListItem) => {
    if (!item.task) return;
    select({ type: 'task', id: item.task.id });
    router.push(ROUTES.orbit);
  };

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const line = text.trim();
    if (!line) return;
    // The same word matching as Orbit quick add: "follow up in 3 days", "call tomorrow 3pm"
    const parsed = parseQuickAdd(line, now);
    const kind = parsed.kind === 'WATCH' ? 'REMINDER' : parsed.kind;
    setText('');
    create.mutate(
      {
        title: parsed.title,
        kind: applicationId && kind === 'TASK' && /follow/i.test(line) ? 'FOLLOW_UP' : kind,
        priority: parsed.priority ?? 'MEDIUM',
        dueAt: parsed.dueAt,
        allDay: parsed.allDay,
        tags: parsed.tags,
        checklist: [],
        applicationId: applicationId ?? null,
        companyId: companyId ?? null,
      },
      { onError: () => setText((current) => current || line) },
    );
  };

  return (
    <section aria-label="Tasks and reminders" className={className}>
      <div className="mb-2 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-primary">Tasks and reminders</h3>
        {open.length > 0 && (
          <span className="rounded-full bg-bg-accent-subtle px-2 py-0.5 text-[11px] font-semibold text-text-primary">
            {open.length} open
          </span>
        )}
      </div>

      <form onSubmit={add} className="mb-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            create.reset();
          }}
          aria-label={`Add a task or reminder for ${subject}`}
          placeholder="Add one, for example: follow up in 3 days"
          className="h-8 min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Add"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-bg-accent text-text-primary hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      {create.isError &&
        (isPlanError(create.error.code) ? (
          <OrbitProNote message={create.error.message} className="mb-2" />
        ) : (
          <p role="alert" className="mb-2 text-xs text-text-danger">
            {create.error.message}
          </p>
        ))}

      {query.isLoading ? (
        <div className="flex justify-center py-3">
          <Spinner size="sm" />
        </div>
      ) : query.isError ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load the linked items.
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg bg-bg-muted px-3 py-3 text-xs text-text-secondary">
          Nothing linked to {subject} yet. Add a follow-up or a reminder above, or link an item to
          it on Orbit.
        </p>
      ) : (
        <>
          {open.length > 0 && (
            <ul>
              {open.map((item) => (
                <EventRow
                  key={item.id}
                  event={item}
                  now={now}
                  onOpen={openOnOrbit}
                  onToggleDone={(i) =>
                    i.task && complete.mutate({ id: i.task.id, version: i.task.version })
                  }
                />
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
                className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary"
              >
                {showDone ? (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                )}
                {done.length} done
              </button>
              {showDone && (
                <ul>
                  {done.map((item) => (
                    <EventRow
                      key={item.id}
                      event={item}
                      now={now}
                      onOpen={openOnOrbit}
                      onToggleDone={(i) =>
                        i.task && reopen.mutate({ id: i.task.id, version: i.task.version })
                      }
                      showWhen={false}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
          {query.hasNextPage && (
            <button
              type="button"
              onClick={() => void query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="mt-1 px-1.5 text-[11px] font-medium text-text-accent hover:underline"
            >
              Show more
            </button>
          )}
          {open.length === 0 && done.length > 0 && !showDone && (
            <p className="px-1.5 pt-1 text-[11px] text-text-secondary">
              All done. Last one {formatWhen(done[0]?.at ?? null, false, now).toLowerCase()}.
            </p>
          )}
        </>
      )}
    </section>
  );
};
