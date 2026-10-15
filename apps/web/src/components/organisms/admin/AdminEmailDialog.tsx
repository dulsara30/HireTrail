import React from 'react';
import { Mail, Send, X } from 'lucide-react';
import {
  ADMIN_EMAIL_TEMPLATES,
  ADMIN_EMAIL_TEMPLATE_META,
  type AdminEmailResultDto,
  type AdminEmailTemplate,
  type AdminUserDto,
} from '@hiretrail/shared';
import { useAdminSendEmail } from '../../../api/hooks/mutations/useAdminSendEmail';
import { useAdminEmailPreview } from '../../../api/hooks/mutations/useAdminEmailPreview';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
  emailFormError,
  emailFormFor,
  toPreviewPayload,
  toSendPayload,
  type EmailFormValues,
} from '../../../utils/helpers/admin/email-form';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

interface AdminEmailDialogProps {
  recipients: AdminUserDto[];
  /** The signed-in admin's id, used for "Send a test to me". */
  adminId: string | undefined;
  onClose: () => void;
}

const fieldClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';
const labelClass = 'mb-1 block text-xs font-semibold text-text-secondary';

const OUTCOME_COLOR = { SENT: 'success', SKIPPED: 'neutral', FAILED: 'danger' } as const;

export const AdminEmailDialog: React.FC<AdminEmailDialogProps> = ({
  recipients,
  adminId,
  onClose,
}) => {
  const [form, setForm] = React.useState<EmailFormValues>(() => emailFormFor('GENERAL'));
  const [result, setResult] = React.useState<AdminEmailResultDto | null>(null);
  const send = useAdminSendEmail();
  const { mutate: loadPreview, data: preview, isPending: previewing } = useAdminEmailPreview();

  const meta = ADMIN_EMAIL_TEMPLATE_META[form.template];
  const formError = emailFormError(form);
  const debounced = useDebouncedValue(form, 400);

  React.useEffect(() => {
    if (!emailFormError(debounced)) loadPreview(toPreviewPayload(debounced));
  }, [debounced, loadPreview]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (patch: Partial<EmailFormValues>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = (userIds: string[]) => {
    setResult(null);
    send.mutate(toSendPayload(form, userIds), { onSuccess: setResult });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send email"
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-accent bg-bg-accent-subtle px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Send email
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <span className={labelClass}>Template</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Template">
                {ADMIN_EMAIL_TEMPLATES.map((template: AdminEmailTemplate) => {
                  const active = form.template === template;
                  return (
                    <button
                      key={template}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setResult(null);
                        setForm(emailFormFor(template));
                      }}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'border-border-accent bg-bg-accent-subtle'
                          : 'border-border-default hover:bg-bg-muted'
                      }`}
                    >
                      <span className="block font-semibold text-text-primary">
                        {ADMIN_EMAIL_TEMPLATE_META[template].label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-text-secondary">{meta.description}</p>
            </div>

            <div>
              <label htmlFor="email-subject" className={labelClass}>
                Subject
              </label>
              <input
                id="email-subject"
                value={form.subject}
                maxLength={150}
                onChange={(e) => set({ subject: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="email-heading" className={labelClass}>
                Heading
              </label>
              <input
                id="email-heading"
                value={form.heading}
                maxLength={120}
                onChange={(e) => set({ heading: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="email-message" className={labelClass}>
                {meta.generatedBody ? 'Note (optional, shown above the task list)' : 'Message'}
              </label>
              <textarea
                id="email-message"
                value={form.message}
                maxLength={5000}
                rows={meta.generatedBody ? 3 : 7}
                onChange={(e) => set({ message: e.target.value })}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-text-tertiary">
                A blank line starts a new paragraph. The greeting is added for you.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="email-cta-label" className={labelClass}>
                  Button text
                </label>
                <input
                  id="email-cta-label"
                  value={form.ctaLabel}
                  maxLength={40}
                  onChange={(e) => set({ ctaLabel: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="email-cta-url" className={labelClass}>
                  Button link (optional)
                </label>
                <input
                  id="email-cta-url"
                  value={form.ctaUrl}
                  placeholder="https://"
                  onChange={(e) => set({ ctaUrl: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className={labelClass}>
              Preview {previewing && <Spinner size="sm" />}
              {meta.generatedBody && (
                <span className="ml-1 font-normal text-text-tertiary">(sample tasks)</span>
              )}
            </span>
            <p className="text-sm font-medium text-text-primary">
              {preview?.subject ?? form.subject}
            </p>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview?.html ?? ''}
              className="h-80 w-full rounded-lg border border-border-default bg-white"
            />
          </div>
        </div>

        {(result || send.isError) && (
          <div className="max-h-40 overflow-y-auto border-t border-border-default px-5 py-3 text-sm">
            {send.isError ? (
              <p role="alert" className="text-text-danger">
                {send.error.message}
              </p>
            ) : (
              result && (
                <div role="status" className="space-y-1.5">
                  <p className="font-semibold text-text-primary">
                    {result.sent} of {result.results.length} sent
                  </p>
                  <ul className="space-y-1">
                    {result.results.map((r) => (
                      <li key={r.userId} className="flex flex-wrap items-center gap-2">
                        <Badge color={OUTCOME_COLOR[r.outcome]}>{r.outcome}</Badge>
                        <span className="break-all text-text-secondary">{r.email ?? r.userId}</span>
                        {r.reason && <span className="text-xs text-text-tertiary">{r.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3">
          <div className="text-xs text-text-secondary">
            {formError ? (
              <span className="text-text-danger">{formError}</span>
            ) : (
              <span>
                To {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
                {recipients.length > 0 && `: ${recipients[0]?.email}`}
                {recipients.length > 1 && ` and ${recipients.length - 1} more`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {adminId && (
              <Button
                variant="secondary"
                size="sm"
                disabled={Boolean(formError) || send.isPending}
                onClick={() => submit([adminId])}
              >
                Send a test to me
              </Button>
            )}
            <Button
              variant="accent"
              size="sm"
              isLoading={send.isPending}
              disabled={Boolean(formError) || recipients.length === 0}
              onClick={() => submit(recipients.map((r) => r.id))}
              leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Send to {recipients.length}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
