import React from 'react';
import { Check, Copy, ExternalLink, Lock, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
  ORBIT_KINDS,
  ORBIT_KIND_META,
  ORBIT_PRIORITIES,
  ORBIT_RECURRENCE_FREQS,
  type OrbitApplicationEventDto,
  type OrbitKind,
} from '@hiretrail/shared';
import {
  useCompleteOrbitTask,
  useCreateOrbitTask,
  useDeleteOrbitTask,
  useReopenOrbitTask,
  useSnoozeOrbitTask,
  useUpdateOrbitTask,
} from '../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitPlan, useOrbitTask } from '../../../api/hooks/queries/useOrbitQueries';
import { ORBIT_KIND_ICONS, orbitKindStyle } from '../../../constants/orbit-ui';
import { useNow } from '../../../hooks/useNow';
import { type OrbitSelection } from '../../../store/orbit-ui.store';
import { cn } from '../../../utils/helpers/class-names';
import {
  formatWhen,
  addDays,
  startOfLocalDay,
  toDateInput,
  toDateTimeLocal,
} from '../../../utils/helpers/orbit/orbit-dates';
import {
  REMIND_LABELS,
  changeAllDay,
  emptyTaskForm,
  formToCreateInput,
  formToUpdateInput,
  isFormChanged,
  taskToForm,
  validateForm,
  type RemindMode,
  type TaskFormValues,
} from '../../../utils/helpers/orbit/orbit-form';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { KindBadge } from '../../molecules/KindBadge';
import { ApplicationLinkField, CompanyLinkField } from './LinkFields';
import { OrbitProNote, isPlanError } from './OrbitProNote';
import { SnoozeMenu } from './SnoozeMenu';

interface ItemPanelProps {
  selection: OrbitSelection;
  onClose: () => void;
  onOpenApplication: (applicationId: string) => void;
  onSelect: (selection: OrbitSelection | null) => void;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';
const labelClass = 'block text-[11px] font-semibold uppercase text-text-secondary';

function newChecklistId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** The side panel: details of one item, with every field editable, plus complete, snooze, copy and delete. */
export const ItemPanel: React.FC<ItemPanelProps> = ({
  selection,
  onClose,
  onOpenApplication,
  onSelect,
}) => {
  if (selection.type === 'application') {
    return (
      <ApplicationEventPanel
        event={selection.event}
        onClose={onClose}
        onOpenApplication={onOpenApplication}
        onSelect={onSelect}
      />
    );
  }
  return (
    <TaskPanel
      taskId={selection.type === 'task' ? selection.id : null}
      draft={selection.type === 'new' ? selection.draft : undefined}
      onClose={onClose}
      onOpenApplication={onOpenApplication}
      onSelect={onSelect}
    />
  );
};

const Shell: React.FC<{
  title: string;
  onClose: () => void;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, onClose, header, children, footer }) => {
  React.useEffect(() => {
    const esc = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-bg-inverse/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border-default bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-accent bg-bg-accent-subtle px-5 py-3">
          <div className="min-w-0">
            {header ?? <h2 className="text-base font-bold text-text-primary">{title}</h2>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border-default px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
};

const ApplicationEventPanel: React.FC<{
  event: OrbitApplicationEventDto;
  onClose: () => void;
  onOpenApplication: (id: string) => void;
  onSelect: (selection: OrbitSelection | null) => void;
}> = ({ event, onClose, onOpenApplication, onSelect }) => {
  const now = useNow();
  const meta = ORBIT_KIND_META[event.kind];
  return (
    <Shell
      title={meta.label}
      onClose={onClose}
      header={<KindBadge kind={event.kind} className="text-xs" />}
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-text-primary">
          {event.roleTitle} at {event.companyName}
        </h3>
        <p className="text-sm text-text-secondary">{formatWhen(new Date(event.at), false, now)}</p>
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-bg-muted p-3 text-xs text-text-secondary">
        <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        This date is saved on the application, so it shows up here by itself. Change it on the
        application.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onOpenApplication(event.applicationId)}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open application
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            onSelect({
              type: 'new',
              draft: { kind: 'TASK', applicationId: event.applicationId, dueAt: event.at },
            })
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add a task for it
        </Button>
      </div>
    </Shell>
  );
};

interface TaskPanelProps {
  taskId: string | null;
  draft?: Extract<OrbitSelection, { type: 'new' }>['draft'];
  onClose: () => void;
  onOpenApplication: (id: string) => void;
  onSelect: (selection: OrbitSelection | null) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({
  taskId,
  draft,
  onClose,
  onOpenApplication,
  onSelect,
}) => {
  const now = useNow();
  const { data: task, isLoading, isError, refetch } = useOrbitTask(taskId);
  const { data: plan } = useOrbitPlan();
  const create = useCreateOrbitTask();
  const update = useUpdateOrbitTask();
  const complete = useCompleteOrbitTask();
  const reopen = useReopenOrbitTask();
  const snooze = useSnoozeOrbitTask();
  const remove = useDeleteOrbitTask();

  const isNew = taskId === null;
  const [form, setForm] = React.useState<TaskFormValues>(() => emptyTaskForm(draft));
  const [error, setError] = React.useState<{ message: string; code?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [tagText, setTagText] = React.useState('');
  const [checkText, setCheckText] = React.useState('');

  // Fill the form when the item loads or is saved elsewhere (a new version arrived)
  React.useEffect(() => {
    if (task) setForm(taskToForm(task));
  }, [task?.id, task?.version]);

  const limits = plan?.limits;
  const isPro = plan?.plan === 'PRO';
  const changed = isFormChanged(form, task ?? null);
  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const fail = (e: { message: string; code?: string }) =>
    setError({ message: e.message, code: e.code });

  const save = () => {
    const problem = validateForm(form);
    if (problem) return setError({ message: problem });
    setError(null);
    if (isNew) {
      create.mutate(formToCreateInput(form), { onSuccess: () => onClose(), onError: fail });
    } else if (task) {
      update.mutate(
        { id: task.id, input: formToUpdateInput(form, task.version) },
        { onError: fail },
      );
    }
  };

  const duplicate = () => {
    if (!task) return;
    const copy = { ...form, title: `${form.title} (copy)` };
    create.mutate(formToCreateInput(copy), {
      onSuccess: (created) => onSelect({ type: 'task', id: created.id }),
      onError: fail,
    });
  };

  const addTag = () => {
    const tag = tagText.trim().replace(/^#/, '');
    setTagText('');
    if (!tag || form.tags.includes(tag)) return;
    set('tags', [...form.tags, tag]);
  };

  const addCheck = () => {
    const text = checkText.trim();
    setCheckText('');
    if (text) set('checklist', [...form.checklist, { id: newChecklistId(), text, done: false }]);
  };

  const busy =
    create.isPending ||
    update.isPending ||
    complete.isPending ||
    reopen.isPending ||
    remove.isPending;
  const done = task?.status === 'DONE';
  const title = isNew ? 'New item' : task ? task.title : 'Item';

  if (!isNew && isLoading) {
    return (
      <Shell title="Item" onClose={onClose}>
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      </Shell>
    );
  }
  if (!isNew && (isError || !task)) {
    return (
      <Shell title="Item" onClose={onClose}>
        <p role="alert" className="text-sm text-text-danger">
          This item could not be loaded. It may have been deleted.
        </p>
      </Shell>
    );
  }

  const conflict = error?.code === 'CONFLICT';

  return (
    <Shell
      title={title}
      onClose={onClose}
      header={<KindBadge kind={form.kind} className="text-xs" />}
      footer={
        <>
          <Button onClick={save} disabled={busy || (!isNew && !changed)}>
            {create.isPending || update.isPending ? (
              <Spinner size="sm" />
            ) : isNew ? (
              'Add'
            ) : (
              'Save changes'
            )}
          </Button>
          {!isNew && task && (
            <>
              {done ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    reopen.mutate({ id: task.id, version: task.version }, { onError: fail })
                  }
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reopen
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    complete.mutate(
                      { id: task.id, version: task.version },
                      { onSuccess: () => onClose(), onError: fail },
                    )
                  }
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> Mark done
                </Button>
              )}
              <SnoozeMenu
                now={now}
                onSnooze={(until) =>
                  snooze.mutate(
                    { id: task.id, until, version: task.version },
                    { onSuccess: () => onClose(), onError: fail },
                  )
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={duplicate}
                disabled={busy}
                aria-label="Duplicate"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete"
                className="ml-auto text-text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </>
      }
    >
      {confirmDelete && task && (
        <div
          role="alertdialog"
          className="space-y-2 rounded-lg border border-border-danger bg-bg-surface p-3"
        >
          <p className="text-sm font-semibold text-text-primary">Delete this item?</p>
          <p className="text-xs text-text-secondary">“{task.title}” will be removed.</p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(task.id, { onSuccess: () => onClose(), onError: fail })}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </div>
        </div>
      )}

      {error &&
        (isPlanError(error.code) ? (
          <OrbitProNote message={error.message} />
        ) : (
          <div role="alert" className="space-y-2 text-xs text-text-danger">
            <p>
              {conflict
                ? 'This item was changed somewhere else. Reload it, then apply your edit again.'
                : error.message}
            </p>
            {conflict && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setError(null);
                  void refetch();
                }}
              >
                Reload
              </Button>
            )}
          </div>
        ))}

      <div className="space-y-1">
        <label htmlFor="orbit-title" className={labelClass}>
          Title
        </label>
        <input
          id="orbit-title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={200}
          placeholder="What needs doing?"
          className={inputClass}
          autoFocus={isNew}
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className={labelClass}>Kind</legend>
        <div className="flex flex-wrap gap-1.5">
          {ORBIT_KINDS.map((kind: OrbitKind) => {
            const style = orbitKindStyle(kind);
            const Icon = ORBIT_KIND_ICONS[kind];
            const locked = ORBIT_KIND_META[kind].pro && limits !== undefined && !limits.watch;
            const selected = form.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={selected}
                disabled={locked}
                title={
                  locked ? 'Company watch is a PRO feature' : ORBIT_KIND_META[kind].description
                }
                onClick={() => set('kind', kind)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold',
                  style.border,
                  selected
                    ? `${style.bg} ${style.text} ring-2 ring-border-focus`
                    : 'bg-bg-surface text-text-secondary hover:bg-bg-muted',
                  locked && 'cursor-not-allowed opacity-50',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {ORBIT_KIND_META[kind].label}
                {locked && <Lock className="h-3 w-3" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="orbit-due" className={labelClass}>
            Due
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => {
                setError(null);
                setForm((f) => changeAllDay(f, e.target.checked));
              }}
            />
            All day
          </label>
        </div>
        <input
          id="orbit-due"
          type={form.allDay ? 'date' : 'datetime-local'}
          value={form.due}
          onChange={(e) => set('due', e.target.value)}
          className={inputClass}
        />
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            ['Today', 0],
            ['Tomorrow', 1],
            ['In a week', 7],
            ['In 2 weeks', 14],
          ].map(([label, days]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => {
                const day = addDays(startOfLocalDay(now), days as number);
                set(
                  'due',
                  form.allDay
                    ? toDateInput(day)
                    : toDateTimeLocal(
                        new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9),
                      ),
                );
              }}
              className="rounded-full border border-border-default px-2 py-0.5 text-text-secondary hover:bg-bg-muted"
            >
              {label}
            </button>
          ))}
          {form.due && (
            <button
              type="button"
              onClick={() => set('due', '')}
              className="rounded-full border border-border-default px-2 py-0.5 text-text-secondary hover:bg-bg-muted"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="orbit-remind" className={labelClass}>
            Remind me
          </label>
          <select
            id="orbit-remind"
            value={form.remindMode}
            onChange={(e) => set('remindMode', e.target.value as RemindMode)}
            className={inputClass}
          >
            {(Object.keys(REMIND_LABELS) as RemindMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {REMIND_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-1">
          <legend className={labelClass}>Priority</legend>
          <div className="flex gap-1">
            {ORBIT_PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={form.priority === p}
                onClick={() => set('priority', p)}
                className={cn(
                  'flex-1 rounded-md border px-1 py-1.5 text-xs font-semibold capitalize',
                  form.priority === p
                    ? 'border-border-accent bg-bg-accent text-text-primary'
                    : 'border-border-default text-text-secondary hover:bg-bg-muted',
                )}
              >
                {p.toLowerCase()}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {form.remindMode === 'custom' && (
        <input
          type="datetime-local"
          aria-label="Reminder time"
          value={form.remindCustom}
          onChange={(e) => set('remindCustom', e.target.value)}
          className={inputClass}
        />
      )}
      {form.remindMode !== 'none' && !isPro && (
        <p className="text-[11px] text-text-secondary">
          Reminders show up on Orbit and in the bell. Email reminders are a PRO feature.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="orbit-notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="orbit-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={4}
          maxLength={9000}
          placeholder="Details, questions to ask, who to speak to."
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ApplicationLinkField
          value={
            form.applicationId ? { id: form.applicationId, label: form.applicationLabel } : null
          }
          onChange={(v) => {
            setError(null);
            setForm((f) => ({
              ...f,
              applicationId: v?.id ?? '',
              applicationLabel: v?.label ?? '',
            }));
          }}
        />
        <CompanyLinkField
          value={form.companyId ? { id: form.companyId, label: form.companyName } : null}
          onChange={(v) => {
            setError(null);
            setForm((f) => ({ ...f, companyId: v?.id ?? '', companyName: v?.label ?? '' }));
          }}
        />
      </div>
      {form.applicationId && (
        <button
          type="button"
          onClick={() => onOpenApplication(form.applicationId)}
          className="flex items-center gap-1 text-xs font-medium text-text-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" /> Open the application
        </button>
      )}

      {(form.kind === 'WATCH' || form.kind === 'REMINDER') && (
        <div className="space-y-1">
          <label htmlFor="orbit-url" className={labelClass}>
            Page to check
          </label>
          <input
            id="orbit-url"
            value={form.watchUrl}
            onChange={(e) => set('watchUrl', e.target.value)}
            placeholder="https://company.com/careers"
            className={inputClass}
          />
          {form.watchUrl.trim() && /^https?:\/\//i.test(form.watchUrl.trim()) && (
            <a
              href={form.watchUrl.trim()}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-xs font-medium text-text-accent hover:underline"
            >
              Open the page <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="orbit-tag" className={labelClass}>
          Tags{' '}
          {limits && (
            <span className="font-normal normal-case text-text-tertiary">
              ({form.tags.length}/{limits.tagsPerItem})
            </span>
          )}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {form.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text-primary"
            >
              #{tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() =>
                  set(
                    'tags',
                    form.tags.filter((t) => t !== tag),
                  )
                }
                className="text-text-tertiary hover:text-text-danger"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <input
          id="orbit-tag"
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="Type a tag and press Enter"
          maxLength={30}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <p className={labelClass}>Checklist</p>
        {limits && limits.checklistSteps === 0 ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-bg-muted p-2.5 text-xs text-text-secondary">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Checklists are a PRO feature.
          </p>
        ) : (
          <>
            <ul className="space-y-1">
              {form.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    aria-label={item.text}
                    onChange={(e) =>
                      set(
                        'checklist',
                        form.checklist.map((c) =>
                          c.id === item.id ? { ...c, done: e.target.checked } : c,
                        ),
                      )
                    }
                  />
                  <span className={cn('flex-1', item.done && 'text-text-tertiary line-through')}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.text}`}
                    onClick={() =>
                      set(
                        'checklist',
                        form.checklist.filter((c) => c.id !== item.id),
                      )
                    }
                    className="text-text-tertiary hover:text-text-danger"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <input
              value={checkText}
              onChange={(e) => setCheckText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCheck();
                }
              }}
              aria-label="Add a checklist step"
              placeholder="Add a step and press Enter"
              maxLength={200}
              className={inputClass}
            />
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <p className={labelClass}>Repeat</p>
        {limits && !limits.recurrence ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-bg-muted p-2.5 text-xs text-text-secondary">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Repeating items are a PRO feature.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              aria-label="Repeat"
              value={form.recurrenceFreq}
              onChange={(e) =>
                set('recurrenceFreq', e.target.value as TaskFormValues['recurrenceFreq'])
              }
              className={inputClass}
            >
              <option value="">Does not repeat</option>
              {ORBIT_RECURRENCE_FREQS.map((f) => (
                <option key={f} value={f}>
                  {f === 'DAILY' ? 'Every day' : f === 'WEEKLY' ? 'Every week' : 'Every month'}
                </option>
              ))}
            </select>
            {form.recurrenceFreq && (
              <label className="flex flex-shrink-0 items-center gap-1 text-xs text-text-secondary">
                every
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.recurrenceInterval}
                  onChange={(e) =>
                    set(
                      'recurrenceInterval',
                      Math.min(Math.max(Number(e.target.value) || 1, 1), 12),
                    )
                  }
                  className="w-14 rounded-md border border-border-default bg-bg-surface px-1.5 py-1 text-center text-sm"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {task && (
        <p className="text-[11px] text-text-tertiary">
          Created {new Date(task.createdAt).toLocaleDateString()}
          {task.completedAt ? ` · done ${new Date(task.completedAt).toLocaleDateString()}` : ''}
        </p>
      )}
    </Shell>
  );
};
