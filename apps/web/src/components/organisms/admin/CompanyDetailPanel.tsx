import React from 'react';
import { X } from 'lucide-react';
import { useAdminCompany } from '../../../api/hooks/queries/useAdminCompany';
import { useAdminUpdateCompany } from '../../../api/hooks/mutations/useAdminUpdateCompany';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { StarRating } from '../../molecules/StarRating';
import {
  REPORT_RATING_KEYS,
  companyToFormValues,
  formValuesToUpdateInput,
  isFormDirty,
  type AdminCompanyFormValues,
} from '../../../utils/helpers/admin-company-form';

interface CompanyDetailPanelProps {
  companyId: string;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

const RATING_LABELS: Record<(typeof REPORT_RATING_KEYS)[number], string> = {
  culture: 'Culture',
  workExperience: 'Work experience',
  salary: 'Salary',
  learning: 'Learning',
  overall: 'Overall',
  scale: 'Scale',
  appeal: 'Appeal',
};

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

/** Side panel for admins: the average user rating (never who rated) and full company editing. */
export const CompanyDetailPanel: React.FC<CompanyDetailPanelProps> = ({ companyId, onClose }) => {
  const { data, isLoading, isError, refetch } = useAdminCompany(companyId);
  const update = useAdminUpdateCompany(companyId);
  const [values, setValues] = React.useState<AdminCompanyFormValues | null>(null);
  const [reason, setReason] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  // Fill the form when the company loads, and again after a save or reload
  React.useEffect(() => {
    if (data) setValues(companyToFormValues(data.company));
  }, [data]);

  if (isLoading || isError || !data || !values) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
        <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border-default bg-bg-surface shadow-lg">
          <div className="flex justify-end p-3">
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close company details">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isError ? (
            <p role="alert" className="p-5 text-sm text-text-danger">
              Could not load this company.
            </p>
          ) : (
            <div className="flex justify-center p-10">
              <Spinner size="md" />
            </div>
          )}
        </aside>
      </div>
    );
  }

  const { company, averageRating, ratingCount } = data;
  const set =
    <K extends keyof AdminCompanyFormValues>(field: K) =>
    (value: AdminCompanyFormValues[K]) => {
      setSaved(false);
      setValues((current) => (current ? { ...current, [field]: value } : current));
    };
  const text = (
    field: keyof Omit<AdminCompanyFormValues, 'reportRatings' | 'region' | 'tier'>,
  ) => ({
    id: `co-${field}`,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field)(e.target.value),
    className: inputClass,
  });

  const canSave =
    isFormDirty(values, company) &&
    values.name.trim().length > 0 &&
    reason.trim().length >= 5 &&
    !update.isPending;

  const save = () => {
    update.mutate(formValuesToUpdateInput(values, data.version, reason), {
      onSuccess: () => {
        setReason('');
        setSaved(true);
      },
    });
  };

  const conflict = update.isError && update.error.code === 'CONFLICT';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Company details"
        className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-default bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-accent bg-bg-accent-subtle px-5 py-4">
          <h2 className="truncate text-base font-bold text-text-primary">{company.name}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close company details">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 p-5">
          <section
            aria-label="Average user rating"
            className="space-y-2 rounded-lg border border-border-default bg-bg-subtle p-4"
          >
            <p className="text-[11px] font-semibold uppercase text-text-secondary">
              Average user rating
            </p>
            {averageRating === null ? (
              <p className="text-sm text-text-secondary">No ratings yet.</p>
            ) : (
              <div className="flex items-center gap-3">
                <StarRating
                  value={averageRating}
                  readOnly
                  size="sm"
                  label={`Average rating ${averageRating} out of 5`}
                />
                <p className="text-sm font-semibold text-text-primary">
                  {averageRating.toFixed(1)} / 5
                  <span className="ml-1 font-normal text-text-secondary">
                    ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
                  </span>
                </p>
              </div>
            )}
            <p className="text-[11px] text-text-tertiary">
              Ratings and notes are private. You only see the average.
            </p>
          </section>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSave) save();
            }}
          >
            <h3 className="text-sm font-bold text-text-primary">Edit company</h3>

            <Field id="co-name" label="Name">
              <input {...text('name')} maxLength={120} />
            </Field>
            <Field id="co-aliases" label="Aliases (comma separated)">
              <input {...text('aliases')} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field id="co-region" label="Region">
                <select
                  id="co-region"
                  value={values.region}
                  onChange={(e) =>
                    set('region')(e.target.value as AdminCompanyFormValues['region'])
                  }
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  <option value="LOCAL">Local</option>
                  <option value="FOREIGN">Foreign</option>
                </select>
              </Field>
              <Field id="co-tier" label="Tier">
                <select
                  id="co-tier"
                  value={values.tier}
                  onChange={(e) => set('tier')(e.target.value as AdminCompanyFormValues['tier'])}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </Field>
              <Field id="co-country" label="Country">
                <input {...text('country')} maxLength={80} />
              </Field>
              <Field id="co-city" label="City">
                <input {...text('city')} maxLength={80} />
              </Field>
            </div>

            <Field id="co-website" label="Website">
              <input {...text('website')} maxLength={300} />
            </Field>
            <Field id="co-careersUrl" label="Careers page">
              <input {...text('careersUrl')} maxLength={300} />
            </Field>
            <Field id="co-linkedinUrl" label="LinkedIn">
              <input {...text('linkedinUrl')} maxLength={300} />
            </Field>
            <Field id="co-contactEmail" label="Contact email">
              <input {...text('contactEmail')} maxLength={254} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field id="co-foundedYear" label="Founded">
                <input {...text('foundedYear')} maxLength={10} />
              </Field>
              <Field id="co-size" label="Size">
                <input {...text('size')} maxLength={60} />
              </Field>
              <Field id="co-industry" label="Industry">
                <input {...text('industry')} maxLength={120} />
              </Field>
              <Field id="co-hiringModel" label="Hiring model">
                <input {...text('hiringModel')} maxLength={120} />
              </Field>
            </div>

            <Field id="co-techStack" label="Tech stack (comma separated)">
              <input {...text('techStack')} />
            </Field>
            <Field id="co-description" label="Description">
              <textarea {...text('description')} rows={4} maxLength={2000} />
            </Field>

            <fieldset className="space-y-2">
              <legend className="text-[11px] font-semibold uppercase text-text-secondary">
                Research report ratings (0 to 10)
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {REPORT_RATING_KEYS.map((key) => (
                  <Field key={key} id={`co-rating-${key}`} label={RATING_LABELS[key]}>
                    <input
                      id={`co-rating-${key}`}
                      type="number"
                      min={0}
                      max={10}
                      step="0.1"
                      value={values.reportRatings[key]}
                      onChange={(e) =>
                        set('reportRatings')({ ...values.reportRatings, [key]: e.target.value })
                      }
                      className={inputClass}
                    />
                  </Field>
                ))}
              </div>
            </fieldset>

            <Field id="co-reason" label="Reason (goes to the audit log)">
              <input
                id="co-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="At least 5 characters"
                className={inputClass}
              />
            </Field>

            {update.isError && (
              <div role="alert" className="space-y-2 text-xs text-text-danger">
                <p>
                  {conflict
                    ? 'Someone else changed this company. Reload it, then apply your edit again.'
                    : update.error.message}
                </p>
                {conflict && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      update.reset();
                      void refetch();
                    }}
                  >
                    Reload company
                  </Button>
                )}
              </div>
            )}
            {saved && (
              <p role="status" className="text-xs font-medium text-text-success">
                Saved. The change is in the audit log.
              </p>
            )}

            <Button type="submit" disabled={!canSave} className="w-full">
              {update.isPending ? <Spinner size="sm" /> : 'Save changes'}
            </Button>
          </form>
        </div>
      </aside>
    </div>
  );
};
