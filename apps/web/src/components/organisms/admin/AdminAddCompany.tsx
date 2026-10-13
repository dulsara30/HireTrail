import React from 'react';
import { ExternalLink, Plus, Search, Sparkles } from 'lucide-react';
import { type CompanyLookupDto } from '@hiretrail/shared';
import { useAdminCompanyLookup } from '../../../api/hooks/mutations/useAdminCompanyLookup';
import { useAdminCreateCompany } from '../../../api/hooks/mutations/useAdminCreateCompany';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import {
  EMPTY_CREATE_FORM,
  formValuesToCreateInput,
  lookupToFormValues,
  type AdminCreateFormValues,
} from '../../../utils/helpers/admin-company-create';

interface AdminAddCompanyProps {
  /** Called with the new company id so the page can open its details. */
  onCreated: (companyId: string) => void;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

const Field: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({
  id,
  label,
  children,
}) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-[11px] font-semibold uppercase text-text-secondary">
      {label}
    </label>
    {children}
  </div>
);

/**
 * Adds a company to the shared directory. The admin looks it up on public sources, reviews and
 * edits what was found, then saves. Values without a public source arrive empty.
 */
export const AdminAddCompany: React.FC<AdminAddCompanyProps> = ({ onCreated }) => {
  const lookup = useAdminCompanyLookup();
  const create = useAdminCreateCompany();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [hint, setHint] = React.useState('');
  const [result, setResult] = React.useState<CompanyLookupDto | null>(null);
  const [values, setValues] = React.useState<AdminCreateFormValues | null>(null);
  const [reason, setReason] = React.useState('');

  const reset = () => {
    setName('');
    setHint('');
    setResult(null);
    setValues(null);
    setReason('');
    lookup.reset();
    create.reset();
  };

  const runLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const query = name.trim();
    if (query.length < 2) return;
    create.reset();
    lookup.mutate(
      { name: query, hint: hint.trim() || undefined },
      {
        onSuccess: (data) => {
          setResult(data);
          setValues(lookupToFormValues(data, query));
        },
      },
    );
  };

  const startManual = () => {
    setResult(null);
    setValues({ ...EMPTY_CREATE_FORM, name: name.trim() });
    create.reset();
  };

  const set =
    <K extends keyof AdminCreateFormValues>(field: K) =>
    (value: AdminCreateFormValues[K]) =>
      setValues((current) => (current ? { ...current, [field]: value } : current));
  const text = (field: keyof Omit<AdminCreateFormValues, 'region' | 'tier'>) => ({
    id: `add-${field}`,
    value: values?.[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field)(e.target.value),
    className: inputClass,
  });

  const canCreate = Boolean(values?.name.trim()) && reason.trim().length >= 5 && !create.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values || !canCreate) return;
    create.mutate(formValuesToCreateInput(values, result, reason), {
      onSuccess: (data) => {
        reset();
        setOpen(false);
        onCreated(data.company.id);
      },
    });
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add company
      </Button>
    );
  }

  const duplicate = create.isError && create.error.code === 'DUPLICATE';

  return (
    <section
      aria-label="Add a company"
      className="space-y-4 rounded-xl border border-border-accent bg-bg-surface p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <Sparkles className="h-4 w-4 text-text-accent" aria-hidden="true" />
          Add a company from public sources
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={runLookup} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field id="add-search-name" label="Company name">
          <input
            id="add-search-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="For example Acentura"
            className={inputClass}
          />
        </Field>
        <Field id="add-search-hint" label="Hint (optional)">
          <input
            id="add-search-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={200}
            placeholder="Country, website or industry"
            className={inputClass}
          />
        </Field>
        <Button type="submit" size="md" disabled={name.trim().length < 2 || lookup.isPending}>
          {lookup.isPending ? (
            <Spinner size="sm" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Look up
        </Button>
      </form>

      {lookup.isPending && (
        <p role="status" className="text-xs text-text-secondary">
          Searching public sources. This can take up to a minute.
        </p>
      )}
      {lookup.isError && (
        <div role="alert" className="space-y-2 text-xs text-text-danger">
          <p>{lookup.error.message}</p>
          <Button type="button" size="sm" variant="secondary" onClick={startManual}>
            Add it manually instead
          </Button>
        </div>
      )}
      {!values && !lookup.isPending && !lookup.isError && (
        <button
          type="button"
          onClick={startManual}
          className="text-xs font-medium text-text-accent hover:underline"
        >
          Skip the lookup and add it manually
        </button>
      )}

      {values && (
        <form onSubmit={submit} className="space-y-4 border-t border-border-default pt-4">
          {result && !result.found && (
            <p role="status" className="text-xs text-text-secondary">
              Nothing could be confirmed from public sources. You can fill the details in yourself.
            </p>
          )}
          {result?.found && (
            <p role="status" className="text-xs text-text-secondary">
              {result.fromCache ? 'Found earlier, shown from the saved result. ' : ''}
              Check each value against the sources below before saving. Anything without a public
              source was left empty.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Field id="add-name" label="Name">
              <input {...text('name')} maxLength={120} />
            </Field>
            <Field id="add-website" label="Website">
              <input {...text('website')} maxLength={300} />
            </Field>
            <Field id="add-careersUrl" label="Careers page">
              <input {...text('careersUrl')} maxLength={300} />
            </Field>
            <Field id="add-industry" label="Industry">
              <input {...text('industry')} maxLength={120} />
            </Field>
            <Field id="add-country" label="Country">
              <input {...text('country')} maxLength={80} />
            </Field>
            <Field id="add-city" label="City">
              <input {...text('city')} maxLength={80} />
            </Field>
            <Field id="add-size" label="Size">
              <input {...text('size')} maxLength={60} />
            </Field>
            <Field id="add-linkedinUrl" label="LinkedIn">
              <input {...text('linkedinUrl')} maxLength={300} />
            </Field>
            <Field id="add-contactEmail" label="Contact email">
              <input {...text('contactEmail')} maxLength={254} />
            </Field>
            <Field id="add-foundedYear" label="Founded">
              <input {...text('foundedYear')} maxLength={10} />
            </Field>
            <Field id="add-techStack" label="Tech stack (comma separated)">
              <input {...text('techStack')} />
            </Field>
            <Field id="add-region" label="Region">
              <select
                id="add-region"
                value={values.region}
                onChange={(e) => set('region')(e.target.value as AdminCreateFormValues['region'])}
                className={inputClass}
              >
                <option value="">Not set</option>
                <option value="LOCAL">Local</option>
                <option value="FOREIGN">Foreign</option>
              </select>
            </Field>
            <Field id="add-tier" label="Tier">
              <select
                id="add-tier"
                value={values.tier}
                onChange={(e) => set('tier')(e.target.value as AdminCreateFormValues['tier'])}
                className={inputClass}
              >
                <option value="">Not set</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </Field>
          </div>
          <Field id="add-description" label="Description">
            <textarea {...text('description')} rows={3} maxLength={2000} />
          </Field>

          {result?.found && result.sources.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase text-text-secondary">
                Public sources used
              </p>
              <ul className="space-y-1">
                {result.sources.slice(0, 6).map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 break-all text-xs text-text-accent hover:underline"
                    >
                      {source.title || source.url}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Field id="add-reason" label="Reason (goes to the audit log)">
            <input
              id="add-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="At least 5 characters"
              className={inputClass}
            />
          </Field>

          {create.isError && (
            <p role="alert" className="text-xs text-text-danger">
              {duplicate
                ? 'This company is already in the directory. Search for it in the list.'
                : create.error.message}
            </p>
          )}

          <Button type="submit" disabled={!canCreate}>
            {create.isPending ? <Spinner size="sm" /> : 'Add to directory'}
          </Button>
        </form>
      )}
    </section>
  );
};
