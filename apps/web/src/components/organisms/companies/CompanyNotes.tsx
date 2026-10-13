import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { type CompanyNoteDto } from '@hiretrail/shared';
import { useCompanyNotes } from '../../../api/hooks/queries/useCompanyNotes';
import {
  useCreateCompanyNote,
  useDeleteCompanyNote,
  useUpdateCompanyNote,
} from '../../../api/hooks/mutations/useCompanyNoteMutations';
import { useSetCompanyRating } from '../../../api/hooks/mutations/useSetCompanyRating';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { StarRating } from '../../molecules/StarRating';
import { sourceTextToHtml } from '../../../utils/helpers/autofill';
import { htmlToText, splitParagraphs } from '../../../utils/helpers/job-description';
import { formatNoteDate } from '../../../utils/helpers/company-notes';

interface CompanyNotesProps {
  companyId: string;
  initialRating: number | null;
}

const textareaClass =
  'w-full rounded-lg border border-border-default bg-bg-surface p-3 text-sm focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-accent';

/** One private note: shows its text and date, and can be edited or deleted in place. */
const NoteItem: React.FC<{ note: CompanyNoteDto; companyId: string }> = ({ note, companyId }) => {
  const update = useUpdateCompanyNote(companyId);
  const remove = useDeleteCompanyNote(companyId);
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const text = htmlToText(note.bodyHtml);

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
    setConfirming(false);
    update.reset();
  };

  const save = () => {
    update.mutate(
      {
        noteId: note.id,
        input: { bodyHtml: sourceTextToHtml(draft.trim()), version: note.version },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <li className="space-y-2 rounded-lg border border-border-default bg-bg-subtle p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-text-tertiary">
          {formatNoteDate(note.createdAt)}
          {note.editedAt && <span> · edited {formatNoteDate(note.editedAt)}</span>}
        </p>
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit note"
              className="rounded p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-primary"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Delete note"
              className="rounded p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={9000}
            aria-label="Edit note text"
            className={textareaClass}
          />
          {update.isError && (
            <p role="alert" className="text-xs text-text-danger">
              {update.error.code === 'CONFLICT'
                ? 'This note was changed somewhere else. Close and reopen it.'
                : update.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!draft.trim() || update.isPending}>
              {update.isPending ? <Spinner size="sm" /> : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-text-primary">
          {splitParagraphs(text).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap break-words">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {confirming && (
        <div className="flex items-center gap-2 rounded-md border border-border-danger bg-bg-surface px-2 py-1.5 text-xs">
          <span className="flex-1 text-text-secondary">Delete this note?</span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => remove.mutate(note.id)}
            disabled={remove.isPending}
          >
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      )}
    </li>
  );
};

/** The signed-in user's private rating and notes about one company. Nobody else can see them. */
export const CompanyNotes: React.FC<CompanyNotesProps> = ({ companyId, initialRating }) => {
  const { data: notes, isLoading, isError } = useCompanyNotes(companyId);
  const setRating = useSetCompanyRating(companyId);
  const create = useCreateCompanyNote(companyId);
  const [rating, setLocalRating] = React.useState<number | null>(initialRating);
  const [draft, setDraft] = React.useState('');

  React.useEffect(() => setLocalRating(initialRating), [initialRating]);

  const changeRating = (next: number | null) => {
    const previous = rating;
    setLocalRating(next);
    setRating.mutate({ myRating: next }, { onError: () => setLocalRating(previous) });
  };

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    create.mutate({ bodyHtml: sourceTextToHtml(text) }, { onSuccess: () => setDraft('') });
  };

  return (
    <section
      aria-label="My private notes"
      className="space-y-5 rounded-xl border border-border-default bg-bg-surface p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-text-primary">My Private Notes</h2>
        <p className="text-xs text-text-tertiary">Only you can see this rating and your notes.</p>
      </div>

      <div className="space-y-1.5">
        <p className="block text-xs font-medium text-text-secondary">My impression (1–5)</p>
        <div className="flex items-center gap-2">
          <StarRating value={rating} onChange={changeRating} label="My impression rating" />
          {rating && (
            <button
              type="button"
              onClick={() => changeRating(null)}
              className="text-xs text-text-tertiary hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>
        {setRating.isError && (
          <p role="alert" className="text-xs text-text-danger">
            {setRating.error.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="new-company-note" className="block text-xs font-medium text-text-secondary">
          Add a note
        </label>
        <textarea
          id="new-company-note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Interview contacts, feedback, salary impressions..."
          rows={4}
          maxLength={9000}
          className={textareaClass}
        />
        {create.isError && (
          <p role="alert" className="text-xs text-text-danger">
            {create.error.message}
          </p>
        )}
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={addNote}
          disabled={!draft.trim() || create.isPending}
        >
          {create.isPending ? (
            <Spinner size="sm" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Add note
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">
          Notes{notes ? ` (${notes.length})` : ''}
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <p role="alert" className="text-xs text-text-danger">
            Could not load your notes.
          </p>
        ) : notes && notes.length > 0 ? (
          <ul className="space-y-2">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} companyId={companyId} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-tertiary">
            No notes yet. Add one each time you learn something new.
          </p>
        )}
      </div>
    </section>
  );
};
