import React from 'react';
import { Link2, Lock, Sparkles, X } from 'lucide-react';
import { AI_TEXT_MAX, type AutofillDraftDto } from '@hiretrail/shared';
import { useMe } from '../../../api/hooks/queries/useMe';
import { useAutofill } from '../../../api/hooks/mutations/useAutofill';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Skeleton } from '../../atoms/Skeleton';

interface AutofillDialogProps {
  onClose: () => void;
  onDraft: (draft: AutofillDraftDto) => void;
  onManual: () => void;
}

type Tab = 'text' | 'url';

const inputClass =
  'w-full px-3 py-2 text-sm bg-bg-surface border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-border-accent';

export const AutofillDialog: React.FC<AutofillDialogProps> = ({ onClose, onDraft, onManual }) => {
  const { data: me } = useMe();
  const autofill = useAutofill();
  const [tab, setTab] = React.useState<Tab>('text');
  const [text, setText] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [notice, setNotice] = React.useState<string | null>(null);

  const isPro = me?.plan === 'PRO';
  const canSubmit = tab === 'text' ? text.trim().length > 0 : url.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    autofill.mutate(tab === 'text' ? { text } : { url }, {
      onSuccess: (draft) => {
        if (!draft.isJobPost) {
          setNotice('This does not look like a job post. Check the text and try again.');
          return;
        }
        onDraft(draft);
      },
      onError: (err) => {
        if (err.code === 'SOURCE_UNREACHABLE') {
          setTab('text');
          setNotice("We couldn't read that link. Paste the job text instead.");
        }
      },
    });
  };

  const error = autofill.error;
  const errorText = !error
    ? null
    : error.code === 'AI_UNAVAILABLE'
      ? 'AI is busy right now. Try again in a minute, or fill it in manually.'
      : error.code === 'AI_QUOTA_EXCEEDED'
        ? 'Daily AI limit reached. It resets tomorrow.'
        : error.code === 'PLAN_REQUIRED'
          ? 'Autofill with AI is a PRO feature.'
          : error.code === 'EMAIL_NOT_VERIFIED'
            ? 'Verify your email to use AI autofill.'
            : error.code === 'SOURCE_UNREACHABLE'
              ? null
              : error.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="autofill-title"
        className="relative z-10 w-full max-w-xl bg-bg-surface rounded-xl border border-border-default border-t-4 border-t-border-accent shadow-lg"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-accent-subtle rounded-t-xl">
          <h2
            id="autofill-title"
            className="flex items-center gap-2 text-base font-bold text-text-primary"
          >
            <Sparkles className="h-5 w-5 text-text-accent" aria-hidden="true" />
            Autofill with AI
            <Badge color="accent">PRO</Badge>
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close autofill dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div role="tablist" className="inline-flex p-1 bg-bg-muted rounded-lg gap-1">
            {(
              [
                ['text', 'Paste job post'],
                ['url', 'Job link'],
              ] as Array<[Tab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tab === key
                    ? 'bg-bg-accent text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'text' ? (
            <div className="space-y-1">
              <label
                htmlFor="autofill-text"
                className="text-xs font-semibold uppercase text-text-secondary"
              >
                Job post text
              </label>
              <textarea
                id="autofill-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={AI_TEXT_MAX}
                rows={9}
                placeholder="Paste the full job post here…"
                className={inputClass}
              />
              <p className="text-[11px] text-text-tertiary text-right">
                {text.length.toLocaleString()} / {AI_TEXT_MAX.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <label
                htmlFor="autofill-url"
                className="text-xs font-semibold uppercase text-text-secondary"
              >
                Job link
              </label>
              <div className="relative">
                <Link2
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary"
                  aria-hidden="true"
                />
                <input
                  id="autofill-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                Some sites like LinkedIn block reading. If it fails, paste the text.
              </p>
            </div>
          )}

          {notice && (
            <p
              role="alert"
              className="text-xs text-text-accent bg-bg-accent-subtle border border-border-accent rounded-md px-3 py-2"
            >
              {notice}
            </p>
          )}
          {errorText && (
            <div
              role="alert"
              className="text-xs text-text-danger bg-bg-danger-subtle border border-border-danger rounded-md px-3 py-2 flex items-center justify-between gap-3"
            >
              <span>{errorText}</span>
              {error?.code === 'AI_UNAVAILABLE' && (
                <Button type="button" size="sm" variant="secondary" onClick={onManual}>
                  Fill manually
                </Button>
              )}
            </div>
          )}

          {autofill.isPending && (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="text-xs font-medium text-text-secondary">Reading the post…</p>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {isPro ? (
              <Button type="submit" variant="accent" disabled={!canSubmit || autofill.isPending}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Autofill
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled title="PRO feature">
                <Lock className="h-4 w-4" aria-hidden="true" />
                PRO only
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
