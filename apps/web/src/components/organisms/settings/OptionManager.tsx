import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, Plus, RotateCcw, Undo2 } from 'lucide-react';
import {
  ClosedReason,
  StatusCategory,
  type OptionColor,
  type OptionDto,
  type OptionType,
} from '@hiretrail/shared';
import { useOptions } from '../../../api/hooks/queries/useOptions';
import { useCreateOption } from '../../../api/hooks/mutations/useCreateOption';
import { useUpdateOption } from '../../../api/hooks/mutations/useUpdateOption';
import { useMoveOption } from '../../../api/hooks/mutations/useMoveOption';
import { useArchiveOption } from '../../../api/hooks/mutations/useArchiveOption';
import { useRestoreOption } from '../../../api/hooks/mutations/useRestoreOption';
import { useResetDefaultOptions } from '../../../api/hooks/mutations/useResetDefaultOptions';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { OPTION_COLOR_STYLES } from '../../../constants/option-colors';

const COLORS: OptionColor[] = [
  'neutral',
  'accent',
  'orange',
  'danger',
  'pink',
  'purple',
  'indigo',
  'info',
  'teal',
  'success',
  'lime',
  'brown',
];

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  [StatusCategory.SAVED]: 'Saved',
  [StatusCategory.APPLIED]: 'Applied',
  [StatusCategory.IN_PROGRESS]: 'In progress',
  [StatusCategory.INTERVIEW]: 'Interview',
  [StatusCategory.OFFER]: 'Offer',
  [StatusCategory.ACCEPTED]: 'Accepted',
  [StatusCategory.CLOSED]: 'Closed',
};

const inputClass =
  'rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

function errorText(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message || fallback;
}

interface RowProps {
  option: OptionDto;
  isStatus: boolean;
  onRename: (option: OptionDto, label: string) => Promise<void>;
  onRecolor: (option: OptionDto, color: OptionColor) => void;
  onStatusMeta: (option: OptionDto, category: StatusCategory, reason?: ClosedReason) => void;
  onArchive: (option: OptionDto) => void;
}

const SortableRow: React.FC<RowProps> = ({
  option,
  isStatus,
  onRename,
  onRecolor,
  onStatusMeta,
  onArchive,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(option.label);
  const [colorOpen, setColorOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setLabel(option.label), [option.label]);

  const commit = async () => {
    const next = label.trim();
    if (!next || next === option.label) {
      setLabel(option.label);
      setEditing(false);
      return;
    }
    try {
      await onRename(option, next);
      setError(null);
      setEditing(false);
    } catch (err) {
      setError(errorText(err, 'Could not rename'));
    }
  };

  const meta = (option.meta ?? {}) as { category?: StatusCategory; closedReason?: ClosedReason };
  const category = (meta.category ?? StatusCategory.SAVED) as StatusCategory;
  // Older data may still hold the previous category names; show them as their current equivalents
  const knownCategory = (Object.values(StatusCategory) as string[]).includes(category)
    ? category
    : StatusCategory.SAVED;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative first:rounded-t-xl last:rounded-b-xl flex flex-wrap items-center gap-3 bg-bg-surface px-3 py-2.5 ${colorOpen ? 'z-30' : ''} ${
        isDragging ? 'relative z-10 rounded-lg shadow-lg ring-2 ring-border-accent' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-text-tertiary hover:bg-bg-muted active:cursor-grabbing"
        aria-label={`Reorder ${option.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setColorOpen((o) => !o)}
          aria-label={`Change colour of ${option.label}`}
          aria-expanded={colorOpen}
          className={`h-6 w-6 rounded-full border-2 ${OPTION_COLOR_STYLES[option.color].swatch} border-bg-surface shadow-sm`}
        />
        {colorOpen && (
          <div className="absolute left-0 top-8 z-40 flex gap-1.5 rounded-lg border border-border-default bg-bg-surface p-2 shadow-lg">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => {
                  onRecolor(option, c);
                  setColorOpen(false);
                }}
                className={`h-6 w-6 rounded-full border-2 ${OPTION_COLOR_STYLES[c].swatch} border-bg-surface shadow-sm ${
                  c === option.color ? 'ring-2 ring-border-inverse ring-offset-1' : ''
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="min-w-[8rem] flex-1">
        {editing ? (
          <input
            autoFocus
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit();
              if (e.key === 'Escape') {
                setLabel(option.label);
                setEditing(false);
              }
            }}
            aria-label={`Rename ${option.label}`}
            className={`${inputClass} w-full`}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-1 py-0.5 text-left hover:bg-bg-muted"
            title="Click to rename"
          >
            <Badge color={option.color} dot>
              {option.label}
            </Badge>
          </button>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-text-danger">
            {error}
          </p>
        )}
      </div>

      {isStatus && (
        <div className="flex items-center gap-2">
          <select
            aria-label={`Category of ${option.label}`}
            value={knownCategory}
            onChange={(e) => onStatusMeta(option, e.target.value as StatusCategory, undefined)}
            className={inputClass}
          >
            {Object.values(StatusCategory).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {knownCategory === StatusCategory.CLOSED && (
            <select
              aria-label={`Closed reason of ${option.label}`}
              value={meta.closedReason ?? ClosedReason.OTHER}
              onChange={(e) =>
                onStatusMeta(option, StatusCategory.CLOSED, e.target.value as ClosedReason)
              }
              className={inputClass}
            >
              {Object.values(ClosedReason).map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onArchive(option)}
        aria-label={`Remove ${option.label}`}
        className="text-text-secondary hover:text-text-danger"
      >
        <Archive className="h-4 w-4" />
      </Button>
    </li>
  );
};

interface OptionManagerProps {
  type: OptionType;
  title: string;
}

/** Add, rename, recolour, reorder, archive (with reassign), restore and reset one option type. */
export const OptionManager: React.FC<OptionManagerProps> = ({ type, title }) => {
  const { data, isLoading } = useOptions(type, true);
  const all = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const active = React.useMemo(() => all.filter((o) => !o.archivedAt), [all]);
  const archived = React.useMemo(() => all.filter((o) => o.archivedAt), [all]);

  const createOption = useCreateOption();
  const updateOption = useUpdateOption();
  const moveOption = useMoveOption();
  const archiveOption = useArchiveOption();
  const restoreOption = useRestoreOption();
  const resetDefaults = useResetDefaultOptions();

  const [newLabel, setNewLabel] = React.useState('');
  const [newColor, setNewColor] = React.useState<OptionColor>('accent');
  const [message, setMessage] = React.useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [reassign, setReassign] = React.useState<{ option: OptionDto; target: string } | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    try {
      await createOption.mutateAsync({ type, label, color: newColor });
      setNewLabel('');
      setMessage(null);
    } catch (err) {
      setMessage({ tone: 'error', text: errorText(err, 'Could not add the option') });
    }
  };

  const handleRename = async (option: OptionDto, label: string) => {
    await updateOption.mutateAsync({ id: option.id, input: { label, version: option.version } });
  };

  const handleRecolor = (option: OptionDto, color: OptionColor) => {
    updateOption.mutate({ id: option.id, input: { color, version: option.version } });
  };

  const handleStatusMeta = (
    option: OptionDto,
    category: StatusCategory,
    closedReason?: ClosedReason,
  ) => {
    const meta: Record<string, unknown> = { ...(option.meta ?? {}), category };
    if (category === StatusCategory.CLOSED) meta.closedReason = closedReason ?? ClosedReason.OTHER;
    else delete meta.closedReason;
    updateOption.mutate({ id: option.id, input: { meta, version: option.version } });
  };

  const tryArchive = async (option: OptionDto, reassignToId?: string) => {
    try {
      await archiveOption.mutateAsync({ id: option.id, input: { reassignToId } });
      setReassign(null);
      setMessage({ tone: 'ok', text: `“${option.label}” was removed. Restore it any time below.` });
    } catch (err) {
      if ((err as { code?: string }).code === 'OPTION_IN_USE') {
        const other = active.find((o) => o.id !== option.id);
        setReassign({ option, target: other?.id ?? '' });
        setMessage(null);
      } else {
        setMessage({ tone: 'error', text: errorText(err, 'Could not remove the option') });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const from = active.findIndex((o) => o.id === dragged.id);
    const to = active.findIndex((o) => o.id === over.id);
    if (from < 0 || to < 0) return;
    const without = active.filter((o) => o.id !== dragged.id);
    const before = without[to - 1]?.id ?? null;
    const after = without[to]?.id ?? null;
    moveOption.mutate({ id: String(dragged.id), input: { beforeId: before, afterId: after } });
  };

  const handleReset = async () => {
    try {
      const result = await resetDefaults.mutateAsync(type);
      setMessage({
        tone: 'ok',
        text: `Defaults restored. ${result.length} option${result.length === 1 ? '' : 's'} in this list.`,
      });
    } catch (err) {
      setMessage({ tone: 'error', text: errorText(err, 'Could not restore defaults') });
    }
  };

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Drag to reorder, click a name to rename, click the dot to change colour. An option that is
          used by applications can only be removed after moving them to another option.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          disabled={resetDefaults.isPending}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {resetDefaults.isPending ? 'Restoring…' : 'Restore defaults'}
        </Button>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={40}
          placeholder={`Add a new ${title.toLowerCase()}…`}
          aria-label={`New ${title} name`}
          className={`${inputClass} min-w-[12rem] flex-1`}
        />
        <div className="flex gap-1.5" role="group" aria-label="Colour">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={newColor === c}
              onClick={() => setNewColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${OPTION_COLOR_STYLES[c].swatch} border-bg-surface shadow-sm ${
                newColor === c ? 'ring-2 ring-border-inverse ring-offset-1' : ''
              }`}
            />
          ))}
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!newLabel.trim() || createOption.isPending}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </form>

      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-md border px-3 py-2 text-xs ${
            message.tone === 'error'
              ? 'border-border-danger bg-bg-danger-subtle text-text-danger'
              : 'border-tag-success-border bg-bg-success-subtle text-text-success'
          }`}
        >
          {message.text}
        </p>
      )}

      {reassign && (
        <div
          role="alertdialog"
          aria-label="Move applications before removing"
          className="space-y-3 rounded-xl border border-border-accent bg-bg-accent-subtle p-4"
        >
          <p className="text-sm font-semibold text-text-primary">
            “{reassign.option.label}” is used by existing applications.
          </p>
          <p className="text-xs text-text-secondary">
            Choose where those applications should move. Then it is removed from the list (it is
            kept as archived, so history stays correct).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Move applications to"
              value={reassign.target}
              onChange={(e) => setReassign({ ...reassign, target: e.target.value })}
              className={inputClass}
            >
              {active
                .filter((o) => o.id !== reassign.option.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>
            <Button
              size="sm"
              variant="primary"
              disabled={!reassign.target || archiveOption.isPending}
              onClick={() => tryArchive(reassign.option, reassign.target)}
            >
              Move and remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReassign(null)}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-default bg-bg-surface shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner size="md" />
          </div>
        ) : active.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-secondary">
            Nothing here yet. Add one above, or restore the defaults.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={active.map((o) => o.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border-default">
                {active.map((option) => (
                  <SortableRow
                    key={option.id}
                    option={option}
                    isStatus={type === 'STATUS'}
                    onRename={handleRename}
                    onRecolor={handleRecolor}
                    onStatusMeta={handleStatusMeta}
                    onArchive={(o) => tryArchive(o)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {archived.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-text-secondary">Removed (archived)</h3>
          <ul className="divide-y divide-border-default overflow-hidden rounded-xl border border-border-default bg-bg-muted">
            {archived.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <Badge color="neutral">{o.label}</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => restoreOption.mutate(o.id)}
                  disabled={restoreOption.isPending}
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
