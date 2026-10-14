import React from 'react';
import { Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  ORBIT_TEMPLATES,
  ORBIT_TEMPLATE_META,
  type OrbitPlanDto,
  type OrbitSpaceDto,
  type OrbitTemplate,
} from '@hiretrail/shared';
import {
  useCreateOrbitSpace,
  useDeleteOrbitSpace,
  useUpdateOrbitSpace,
} from '../../../api/hooks/mutations/useOrbitSpaceMutations';
import { cn } from '../../../utils/helpers/class-names';
import { Button } from '../../atoms/Button';
import { OrbitProNote, isPlanError } from './OrbitProNote';

interface SpaceTabsProps {
  spaces: OrbitSpaceDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  plan: OrbitPlanDto | undefined;
  editMode: boolean;
}

/** Saved layouts. Switch between them, and (when editing) rename or delete them. */
export const SpaceTabs: React.FC<SpaceTabsProps> = ({
  spaces,
  activeId,
  onSelect,
  plan,
  editMode,
}) => {
  const create = useCreateOrbitSpace();
  const update = useUpdateOrbitSpace();
  const remove = useDeleteOrbitSpace();
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const [template, setTemplate] = React.useState<OrbitTemplate | ''>('');
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameText, setRenameText] = React.useState('');
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const templatesLocked = plan?.plan === 'FREE';
  const error = create.error ?? update.error ?? remove.error;

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), template: template || undefined },
      {
        onSuccess: (space) => {
          setAdding(false);
          setName('');
          setTemplate('');
          onSelect(space.id);
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Spaces">
        {spaces.map((space) => {
          const active = space.id === activeId;
          if (renaming === space.id) {
            return (
              <form
                key={space.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (renameText.trim())
                    update.mutate({
                      id: space.id,
                      input: { name: renameText.trim(), version: space.version },
                    });
                  setRenaming(null);
                }}
                className="flex items-center gap-1"
              >
                <input
                  autoFocus
                  value={renameText}
                  maxLength={40}
                  onChange={(e) => setRenameText(e.target.value)}
                  aria-label="Space name"
                  className="h-8 w-36 rounded-md border border-border-accent bg-bg-surface px-2 text-sm"
                />
                <button
                  type="submit"
                  aria-label="Save name"
                  className="rounded p-1 text-text-success hover:bg-bg-muted"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setRenaming(null)}
                  className="rounded p-1 text-text-tertiary hover:bg-bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            );
          }
          return (
            <div key={space.id} className="flex items-center">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(space.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                  active
                    ? 'border-border-accent bg-bg-accent text-text-primary'
                    : 'border-border-default bg-bg-surface text-text-secondary hover:bg-bg-muted',
                )}
              >
                {space.name}
              </button>
              {editMode && active && (
                <>
                  <button
                    type="button"
                    aria-label={`Rename ${space.name}`}
                    onClick={() => {
                      setRenaming(space.id);
                      setRenameText(space.name);
                    }}
                    className="ml-1 rounded p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  {spaces.length > 1 &&
                    (confirmId === space.id ? (
                      <span className="ml-1 flex items-center gap-1 text-xs">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            remove.mutate(space.id);
                            setConfirmId(null);
                          }}
                        >
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          Keep
                        </Button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete ${space.name}`}
                        onClick={() => setConfirmId(space.id)}
                        className="rounded p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ))}
                </>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="flex items-center gap-1 rounded-full border border-dashed border-border-default px-3 py-1 text-sm text-text-secondary hover:bg-bg-muted"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New space
          {plan && spaces.length >= plan.limits.spaces && (
            <Lock className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={submitCreate}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-border-default bg-bg-surface p-3"
        >
          <div className="space-y-1">
            <label
              htmlFor="space-name"
              className="block text-[11px] font-semibold uppercase text-text-secondary"
            >
              Name
            </label>
            <input
              id="space-name"
              autoFocus
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Interview week"
              className="h-9 w-48 rounded-md border border-border-default bg-bg-surface px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="space-template"
              className="block text-[11px] font-semibold uppercase text-text-secondary"
            >
              Start from
            </label>
            <select
              id="space-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value as OrbitTemplate | '')}
              className="h-9 rounded-md border border-border-default bg-bg-surface px-2 text-sm"
            >
              <option value="">Today layout</option>
              {ORBIT_TEMPLATES.filter((t) => t !== 'TODAY').map((t) => (
                <option key={t} value={t} disabled={templatesLocked}>
                  {ORBIT_TEMPLATE_META[t].name}
                  {templatesLocked ? ' (PRO)' : ''}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" disabled={!name.trim() || create.isPending}>
            Create
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </form>
      )}

      {error &&
        (isPlanError(error.code) ? (
          <OrbitProNote message={error.message} />
        ) : (
          <p role="alert" className="text-xs text-text-danger">
            {error.message}
          </p>
        ))}
    </div>
  );
};
