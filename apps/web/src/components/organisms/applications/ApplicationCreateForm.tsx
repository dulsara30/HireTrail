import React from 'react';
import { AlertTriangle, Lock, Plus, Sparkles } from 'lucide-react';
import {
  OptionType,
  type AutofillDraftDto,
  type AutofillFieldKey,
  type OptionDto,
} from '@hiretrail/shared';
import { useMe } from '../../../api/hooks/queries/useMe';
import { useAutofill } from '../../../api/hooks/mutations/useAutofill';
import { useCreateApplication } from '../../../api/hooks/mutations/useCreateApplication';
import { useCreateOption } from '../../../api/hooks/mutations/useCreateOption';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Skeleton } from '../../atoms/Skeleton';
import { Spinner } from '../../atoms/Spinner';
import { ProLockBanner } from '../../molecules/ProLockBanner/ProLockBanner';
import { CompanyCombobox } from './CompanyCombobox';
import { DriveResumePicker } from '../../molecules/DriveResumePicker/DriveResumePicker';
import {
  draftToFormValues,
  emptyDraft,
  formValuesToCreateInput,
  looksLikeUrl,
  type DraftFormValues,
} from '../../../utils/helpers/autofill';

interface ApplicationCreateFormProps {
  /** Pre-filled draft (AI preview). Omit for a blank form. */
  draft?: AutofillDraftDto;
  statuses: OptionDto[];
  priorities: OptionDto[];
  workModes: OptionDto[];
  jobTypes: OptionDto[];
  levels: OptionDto[];
  sources: OptionDto[];
  cvVersions: OptionDto[];
  initialStatusId?: string;
  onDiscard: () => void;
  onSaved: (id: string) => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm bg-bg-surface border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-border-accent';

type Suggestion = AutofillDraftDto['suggestedOptions'][number];
const SUGGESTION_TYPE: Record<Suggestion['type'], OptionType> = {
  WORK_MODE: OptionType.WORK_MODE,
  JOB_TYPE: OptionType.JOB_TYPE,
  LEVEL: OptionType.LEVEL,
};
const SUGGESTION_FIELD: Record<Suggestion['type'], keyof DraftFormValues> = {
  WORK_MODE: 'workModeId',
  JOB_TYPE: 'jobTypeId',
  LEVEL: 'levelId',
};

interface AiCtx {
  draft: AutofillDraftDto;
  edited: ReadonlySet<string>;
}
const AiContext = React.createContext<AiCtx | null>(null);

const Sparkle: React.FC<{ field: AutofillFieldKey }> = ({ field }) => {
  const ctx = React.useContext(AiContext);
  if (!ctx || !ctx.draft.aiFilledFields.includes(field) || ctx.edited.has(field)) return null;
  const evidence = ctx.draft.evidence[field];
  return (
    <span className="relative group inline-flex">
      <Sparkles className="h-3.5 w-3.5 text-text-accent" aria-label="Filled by AI" />
      {evidence && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-5 top-0 z-20 hidden w-64 rounded-md bg-bg-inverse px-2.5 py-1.5 text-[11px] font-normal normal-case text-text-inverse shadow-lg group-hover:block"
        >
          “{evidence}”
        </span>
      )}
    </span>
  );
};

const Field: React.FC<{
  label: string;
  aiKey?: AutofillFieldKey;
  htmlFor: string;
  children: React.ReactNode;
}> = ({ label, aiKey, htmlFor, children }) => {
  const ctx = React.useContext(AiContext);
  const warnings = aiKey ? (ctx?.draft.warnings.filter((w) => w.field === aiKey) ?? []) : [];
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary"
      >
        {label}
        {aiKey && <Sparkle field={aiKey} />}
      </label>
      {children}
      {warnings.map((w) => (
        <p key={w.message} className="flex items-start gap-1 text-[11px] text-text-accent">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
          {w.message}
        </p>
      ))}
    </div>
  );
};

export const ApplicationCreateForm: React.FC<ApplicationCreateFormProps> = ({
  draft: initialDraft,
  statuses,
  priorities,
  workModes,
  jobTypes,
  levels,
  sources,
  cvVersions,
  initialStatusId,
  onDiscard,
  onSaved,
}) => {
  const { data: me } = useMe();
  const isPro = me?.plan === 'PRO';
  const autofill = useAutofill();
  const createApplication = useCreateApplication();
  const createOption = useCreateOption();

  const [draft, setDraft] = React.useState<AutofillDraftDto>(initialDraft ?? emptyDraft());
  const [values, setValues] = React.useState<DraftFormValues>(() =>
    draftToFormValues(initialDraft ?? emptyDraft(), initialStatusId ?? statuses[0]?.id ?? ''),
  );
  const [edited, setEdited] = React.useState<Set<string>>(new Set());
  const [createdLabels, setCreatedLabels] = React.useState<Set<string>>(new Set());
  const [aiInput, setAiInput] = React.useState('');
  const [aiNotice, setAiNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!values.statusId && statuses[0]) {
      setValues((v) => ({ ...v, statusId: initialStatusId ?? statuses[0]!.id }));
    }
  }, [statuses, initialStatusId, values.statusId]);

  const markEdited = (aiKey?: AutofillFieldKey) => {
    if (aiKey) setEdited((e) => new Set(e).add(aiKey));
  };
  const set =
    <K extends keyof DraftFormValues>(field: K, aiKey?: AutofillFieldKey) =>
    (value: DraftFormValues[K]) => {
      setValues((v) => ({ ...v, [field]: value }));
      markEdited(aiKey);
    };

  const runAutofill = (e: React.FormEvent) => {
    e.preventDefault();
    const input = aiInput.trim();
    if (!input) return;
    setAiNotice(null);
    autofill.mutate(looksLikeUrl(input) ? { url: input } : { text: input }, {
      onSuccess: (next) => {
        if (!next.isJobPost) {
          setAiNotice('This does not look like a job post. Check the text and try again.');
          return;
        }
        setDraft(next);
        setEdited(new Set());
        setCreatedLabels(new Set());
        setValues((current) => ({
          ...draftToFormValues(next, current.statusId),
          priorityId: current.priorityId,
          sourceId: current.sourceId,
          cvVersionId: current.cvVersionId,
          coverLetter: current.coverLetter,
          appliedAt: current.appliedAt,
          resumeUrl: current.resumeUrl,
          resumeName: current.resumeName,
        }));
        setAiInput('');
      },
      onError: (err) => {
        if (err.code === 'SOURCE_UNREACHABLE') {
          setAiNotice("We couldn't read that link. Paste the job text instead.");
        }
      },
    });
  };

  const aiError = autofill.error;
  const aiErrorText = !aiError
    ? null
    : aiError.code === 'AI_UNAVAILABLE'
      ? 'AI is busy right now. Try again in a minute, or fill the form in manually.'
      : aiError.code === 'AI_QUOTA_EXCEEDED'
        ? 'Daily AI limit reached. It resets tomorrow.'
        : aiError.code === 'PLAN_REQUIRED'
          ? 'Autofill with AI is a PRO feature.'
          : aiError.code === 'EMAIL_NOT_VERIFIED'
            ? 'Verify your email to use AI autofill.'
            : aiError.code === 'SOURCE_UNREACHABLE'
              ? null
              : aiError.message;

  const optionSelect = (
    id: string,
    field: 'workModeId' | 'jobTypeId' | 'levelId' | 'priorityId' | 'sourceId' | 'cvVersionId',
    options: OptionDto[],
    aiKey?: AutofillFieldKey,
  ) => (
    <select
      id={id}
      value={values[field]}
      onChange={(e) => set(field, aiKey)(e.target.value)}
      className={inputClass}
    >
      <option value="">None</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const handleCreateOption = async (s: Suggestion) => {
    const option = await createOption.mutateAsync({
      type: SUGGESTION_TYPE[s.type],
      label: s.label,
      color: 'neutral',
    });
    setCreatedLabels((set) => new Set(set).add(`${s.type}:${s.label}`));
    setValues((v) => ({ ...v, [SUGGESTION_FIELD[s.type]]: option.id }));
  };

  const canSave = values.roleTitle.trim() && values.companyName.trim() && values.statusId;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const result = await createApplication.mutateAsync(
      formValuesToCreateInput(values, draft, edited),
    );
    onSaved(result.application.id);
  };

  const pendingSuggestions = draft.suggestedOptions.filter(
    (s) => !createdLabels.has(`${s.type}:${s.label}`),
  );
  const generalWarnings = draft.warnings.filter((w) => w.field === 'general');
  const isAiDraft = Boolean(draft.aiUsageId);
  const salaryWarnings = draft.warnings.filter((w) => w.field === 'salary');

  return (
    <AiContext.Provider value={{ draft, edited }}>
      <form onSubmit={handleSave} className="space-y-6">
        {/* AI autofill */}
        {!isPro ? (
          <ProLockBanner
            feature="Autofill with AI"
            description="Paste a job link or the whole job post and every field is filled in for you to check."
          />
        ) : (
          <section
            aria-labelledby="ai-box-title"
            className="space-y-3 rounded-xl border border-border-accent bg-bg-accent-subtle p-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-text-accent" aria-hidden="true" />
              <h3 id="ai-box-title" className="text-sm font-bold text-text-primary">
                Autofill with AI
              </h3>
              <Badge color="accent">PRO</Badge>
            </div>
            <p className="text-xs text-text-secondary">
              Paste a job link or the whole job post. Every field below is filled for you to check.
            </p>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={4}
              aria-label="Job link or job post text"
              placeholder="https://… or paste the full job post here"
              className={inputClass}
              disabled={!isPro || autofill.isPending}
            />
            {autofill.isPending && (
              <div className="space-y-2" role="status" aria-live="polite">
                <p className="text-xs font-medium text-text-secondary">Reading the post…</p>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            )}
            {aiNotice && (
              <p role="alert" className="text-xs text-text-accent">
                {aiNotice}
              </p>
            )}
            {aiErrorText && (
              <p role="alert" className="text-xs text-text-danger">
                {aiErrorText}
              </p>
            )}
            <div className="flex justify-end">
              {isPro ? (
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={runAutofill}
                  disabled={!aiInput.trim() || autofill.isPending}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Autofill
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" disabled title="PRO feature">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  PRO only
                </Button>
              )}
            </div>
          </section>
        )}

        {isAiDraft && (
          <div
            role="note"
            className="flex items-start gap-2 rounded-lg border border-border-accent bg-bg-accent-subtle px-4 py-3 text-sm text-text-accent"
          >
            <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>Filled by AI from the job post. Check before saving. Nothing is saved yet.</span>
          </div>
        )}

        {generalWarnings.map((w) => (
          <p key={w.message} className="flex items-center gap-1.5 text-xs text-text-accent">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {w.message}
          </p>
        ))}

        {pendingSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-text-secondary">
              Suggested new options
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingSuggestions.map((s) => (
                <button
                  key={`${s.type}:${s.label}`}
                  type="button"
                  disabled={createOption.isPending}
                  onClick={() => handleCreateOption(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-accent bg-bg-accent-subtle px-2.5 py-1 text-xs font-medium text-text-accent transition-colors hover:bg-bg-accent hover:text-text-primary disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Create option “{s.label}”?
                  <span className="text-[10px] opacity-70">
                    {s.type.replace('_', ' ').toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Role title *" aiKey="roleTitle" htmlFor="cf-role">
            <input
              id="cf-role"
              required
              value={values.roleTitle}
              onChange={(e) => set('roleTitle', 'roleTitle')(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className={inputClass}
            />
          </Field>
          <Field label="Company *" aiKey="companyName" htmlFor="cf-company">
            <CompanyCombobox
              id="cf-company"
              value={{ name: values.companyName, companyId: values.companyId || null }}
              onChange={(c) =>
                setValues((v) => ({ ...v, companyName: c.name, companyId: c.companyId ?? '' }))
              }
              onEdited={() => markEdited('companyName')}
            />
          </Field>
          <Field label="Status *" htmlFor="cf-status">
            <select
              id="cf-status"
              value={values.statusId}
              onChange={(e) => set('statusId')(e.target.value)}
              className={inputClass}
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority" htmlFor="cf-priority">
            {optionSelect('cf-priority', 'priorityId', priorities)}
          </Field>
          <Field label="Location" aiKey="location" htmlFor="cf-location">
            <input
              id="cf-location"
              value={values.location}
              onChange={(e) => set('location', 'location')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Job link" aiKey="jobUrl" htmlFor="cf-url">
            <input
              id="cf-url"
              type="url"
              value={values.jobUrl}
              onChange={(e) => set('jobUrl', 'jobUrl')(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </Field>
          <Field label="Work mode" aiKey="workModeId" htmlFor="cf-workmode">
            {optionSelect('cf-workmode', 'workModeId', workModes, 'workModeId')}
          </Field>
          <Field label="Job type" aiKey="jobTypeId" htmlFor="cf-jobtype">
            {optionSelect('cf-jobtype', 'jobTypeId', jobTypes, 'jobTypeId')}
          </Field>
          <Field label="Experience level" aiKey="levelId" htmlFor="cf-level">
            {optionSelect('cf-level', 'levelId', levels, 'levelId')}
          </Field>
          <Field label="Application source" htmlFor="cf-source">
            {optionSelect('cf-source', 'sourceId', sources)}
          </Field>
          <Field label="CV version" htmlFor="cf-cv">
            {optionSelect('cf-cv', 'cvVersionId', cvVersions)}
          </Field>
          <Field label="Contact email" aiKey="contactEmail" htmlFor="cf-email">
            <input
              id="cf-email"
              type="email"
              value={values.contactEmail}
              onChange={(e) => set('contactEmail', 'contactEmail')(e.target.value)}
              placeholder="recruiter@company.com"
              className={inputClass}
            />
          </Field>
          <Field label="Resume (Google Drive link)" htmlFor="cf-resume">
            <input
              id="cf-resume"
              type="url"
              value={values.resumeUrl}
              onChange={(e) => {
                set('resumeUrl')(e.target.value);
                set('resumeName')('');
              }}
              placeholder="https://drive.google.com/file/d/..."
              className={inputClass}
            />
            {values.resumeName && (
              <p className="text-xs font-medium text-text-secondary">
                Selected: {values.resumeName}
              </p>
            )}
            <DriveResumePicker
              onPick={(file) => {
                set('resumeUrl')(file.url);
                set('resumeName')(file.name);
              }}
            />
            <p className="text-[11px] text-text-tertiary">
              Pick a file from Drive, or paste a link. Share the file so reviewers can open it.
            </p>
          </Field>
          <Field label="Applied date" htmlFor="cf-applied">
            <input
              id="cf-applied"
              type="date"
              value={values.appliedAt}
              onChange={(e) => set('appliedAt')(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-text-tertiary">
              Today by default. Change it if you applied on another day.
            </p>
          </Field>
          <Field label="Deadline" aiKey="deadlineAt" htmlFor="cf-deadline">
            <input
              id="cf-deadline"
              type="date"
              value={values.deadlineAt}
              onChange={(e) => set('deadlineAt', 'deadlineAt')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase text-text-secondary">
              Cover letter
            </span>
            <div
              role="group"
              aria-label="Cover letter sent"
              className="flex w-fit gap-1 rounded-lg bg-bg-muted p-1"
            >
              {[
                { label: 'Yes', value: true },
                { label: 'No', value: false },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={values.coverLetter === o.value}
                  onClick={() => set('coverLetter')(o.value)}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                    values.coverLetter === o.value
                      ? 'bg-bg-accent text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase text-text-secondary">
            Salary <Sparkle field="salary" />
          </legend>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input
              aria-label="Salary minimum"
              inputMode="decimal"
              placeholder="Min"
              value={values.salaryMin}
              onChange={(e) => set('salaryMin', 'salary')(e.target.value)}
              className={inputClass}
            />
            <input
              aria-label="Salary maximum"
              inputMode="decimal"
              placeholder="Max"
              value={values.salaryMax}
              onChange={(e) => set('salaryMax', 'salary')(e.target.value)}
              className={inputClass}
            />
            <input
              aria-label="Currency code"
              maxLength={3}
              placeholder="LKR"
              value={values.currency}
              onChange={(e) => set('currency', 'salary')(e.target.value)}
              className={inputClass}
            />
            <select
              aria-label="Pay period"
              value={values.period}
              onChange={(e) => set('period', 'salary')(e.target.value as DraftFormValues['period'])}
              className={inputClass}
            >
              <option value="">Period</option>
              <option value="HOUR">Per hour</option>
              <option value="MONTH">Per month</option>
              <option value="YEAR">Per year</option>
            </select>
          </div>
          {salaryWarnings.map((w) => (
            <p key={w.message} className="flex items-center gap-1 text-[11px] text-text-accent">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {w.message}
            </p>
          ))}
        </fieldset>

        {draft.skills.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase text-text-secondary">Skills mentioned</p>
            <div className="flex flex-wrap gap-1.5">
              {draft.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="cf-jd" className="text-xs font-semibold uppercase text-text-secondary">
            Job description
          </label>
          <textarea
            id="cf-jd"
            value={values.jobDescription}
            onChange={(e) => set('jobDescription')(e.target.value)}
            rows={18}
            placeholder="Paste the job description here. It is saved exactly as written."
            className="w-full min-h-[22rem] resize-y rounded-xl border border-border-default bg-bg-surface p-4 text-[15px] leading-7 focus:outline-none focus:ring-2 focus:ring-border-accent"
          />
        </div>

        {createApplication.isError && (
          <p role="alert" className="text-xs text-text-danger">
            {createApplication.error.message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border-default pt-4">
          <Button type="button" variant="ghost" onClick={onDiscard}>
            {isAiDraft ? 'Discard' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!canSave || createApplication.isPending}
          >
            {createApplication.isPending ? <Spinner size="sm" /> : 'Save application'}
          </Button>
        </div>
      </form>
    </AiContext.Provider>
  );
};
