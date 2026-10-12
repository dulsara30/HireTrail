import React from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { htmlToText, splitParagraphs } from '../../../utils/helpers/job-description';
import { sourceTextToHtml } from '../../../utils/helpers/autofill';

interface JobDescriptionFieldProps {
  /** Stored sanitised HTML. */
  value: string;
  onSave: (html: string) => Promise<void> | void;
  placeholder?: string;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

/** Large, readable job description. Rendered as plain text (never injected as HTML). */
export const JobDescriptionField: React.FC<JobDescriptionFieldProps> = ({
  value,
  onSave,
  placeholder = 'Paste the job description here…',
}) => {
  const text = React.useMemo(() => htmlToText(value), [value]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(text);
  const [status, setStatus] = React.useState<Status>('idle');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEditing) setDraft(text);
  }, [text, isEditing]);

  const handleSave = async () => {
    if (draft.trim() === text.trim()) {
      setIsEditing(false);
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      await onSave(draft.trim() ? sourceTextToHtml(draft.trim()) : '');
      setStatus('saved');
      setIsEditing(false);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setError((err as Error)?.message || 'Failed to save');
    }
  };

  const paragraphs = splitParagraphs(text);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-text-secondary">Job Description</span>
        <div className="flex items-center gap-2">
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-text-success">
              <Check className="h-3 w-3" aria-hidden="true" /> Saved
            </span>
          )}
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {text ? 'Edit' : 'Add'}
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={24}
            aria-label="Job description"
            placeholder={placeholder}
            className="w-full min-h-[28rem] resize-y rounded-xl border border-border-default bg-bg-surface p-5 text-[15px] leading-7 text-text-primary focus:outline-none focus:ring-2 focus:ring-border-accent"
          />
          {error && (
            <p role="alert" className="text-xs text-text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(text);
                setIsEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              isLoading={status === 'saving'}
            >
              Save
            </Button>
          </div>
        </div>
      ) : paragraphs.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex min-h-[12rem] w-full items-center justify-center rounded-xl border border-dashed border-border-strong bg-bg-surface text-sm italic text-text-tertiary hover:bg-bg-accent-subtle"
        >
          {placeholder}
        </button>
      ) : (
        <div className="max-h-[75vh] min-h-[16rem] overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-5 md:p-6 shadow-sm">
          <div className="mx-auto max-w-3xl space-y-4 text-[15px] leading-7 text-text-primary">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line break-words">
                {p}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
