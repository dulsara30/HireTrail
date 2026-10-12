import React, { useState } from 'react';
import { OptionDto, type AutofillDraftDto } from '@hiretrail/shared';
import { ApplicationCreateForm } from './ApplicationCreateForm';
import { VerificationBadge } from '../../molecules/VerificationBadge/VerificationBadge';
import { useCompany } from '../../../api/hooks/queries/useCompany';
import { JobDescriptionField } from '../../molecules/JobDescriptionField/JobDescriptionField';
import { InlineEditField } from '../../molecules/InlineEditField/InlineEditField';
import { ActivityFeed } from '../activity/ActivityFeed';

import { useApplication } from '../../../api/hooks/queries/useApplication';
import { useOptions } from '../../../api/hooks/queries/useOptions';
import { useComments } from '../../../api/hooks/queries/useComments';
import { useActivitiesInfinite } from '../../../api/hooks/queries/useActivitiesInfinite';
import { useUpdateApplicationField } from '../../../api/hooks/mutations/useUpdateApplicationField';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { X, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { useDeleteApplicationPermanently } from '../../../api/hooks/mutations/useDeleteApplicationPermanently';

export type ApplicationPanelMode = 'create' | 'view' | 'ai-preview';

interface ApplicationPanelProps {
  applicationId: string | null;
  mode?: ApplicationPanelMode;
  initialStatusId?: string;
  draft?: AutofillDraftDto;
  onClose: () => void;
  onApplicationCreated?: (id: string) => void;
}

export const ApplicationPanel: React.FC<ApplicationPanelProps> = ({
  applicationId,
  mode = 'view',
  initialStatusId,
  draft,
  onClose,
  onApplicationCreated,
}) => {
  const isCreate = mode !== 'view';

  // Concurrency conflict banner state
  const [hasConflict, setHasConflict] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteApplicationPermanently();

  // Queries
  const {
    data: application,
    isLoading: isAppLoading,
    refetch: refetchApp,
  } = useApplication(isCreate ? null : applicationId);
  const { data: optionsData } = useOptions();
  const { data: comments = [], refetch: refetchComments } = useComments(
    isCreate ? null : applicationId,
  );
  const {
    data: activitiesData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchActivities,
  } = useActivitiesInfinite(isCreate ? null : applicationId);

  const { data: linkedCompany } = useCompany(application?.companyId ?? '');
  const updateFieldMutation = useUpdateApplicationField();

  const optionsRecord = optionsData as Record<string, OptionDto[]> | undefined;
  const statuses = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'STATUS')
    : optionsRecord?.STATUS || [];

  const priorities = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'PRIORITY')
    : optionsRecord?.PRIORITY || [];

  const workModes = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'WORK_MODE')
    : optionsRecord?.WORK_MODE || [];

  const jobTypes = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'JOB_TYPE')
    : optionsRecord?.JOB_TYPE || [];

  const levels = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'LEVEL')
    : optionsRecord?.LEVEL || [];

  const sources = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'SOURCE')
    : optionsRecord?.SOURCE || [];

  const cvVersions = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'CV_VERSION')
    : optionsRecord?.CV_VERSION || [];

  const handleUpdateField = async (fieldName: string, value: unknown) => {
    if (!application) return;
    try {
      setHasConflict(false);
      await updateFieldMutation.mutateAsync({
        id: application.id,
        input: {
          [fieldName]: value,
          version: application.version,
        },
      });
    } catch (err: unknown) {
      const errCode =
        (err as { code?: string; response?: { data?: { error?: { code?: string } } } })?.code ||
        (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error
          ?.code;
      if (errCode === 'CONFLICT') {
        setHasConflict(true);
      }
      throw err;
    }
  };

  const allActivities = React.useMemo(() => {
    return activitiesData?.pages.flatMap((p) => p.items) || [];
  }, [activitiesData]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay - click outside to close */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel: wide slide-over */}
      <div
        className="relative z-10 w-full max-w-6xl bg-bg border-l border-border shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-accent bg-bg-accent-subtle">
          <div>
            <h2 className="text-base font-semibold text-text">
              {mode === 'ai-preview'
                ? 'Review AI draft'
                : isCreate
                  ? 'New Application'
                  : application?.roleTitle || 'Application Details'}
            </h2>
            {!isCreate && application?.companyName && (
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-xs text-text-muted">{application.companyName}</p>
                {linkedCompany?.verification && (
                  <VerificationBadge
                    score={linkedCompany.verification.score}
                    checkedAt={linkedCompany.verification.checkedAt}
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isCreate && application && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete application"
                className="text-text-secondary hover:text-text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {confirmDelete && application && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-app-title"
            className="absolute inset-0 z-30 flex items-center justify-center bg-bg-inverse/50 p-4"
          >
            <div className="w-full max-w-md space-y-4 rounded-xl border border-border-danger bg-bg-surface p-5 shadow-lg">
              <h3 id="delete-app-title" className="text-base font-bold text-text-primary">
                Delete this application permanently?
              </h3>
              <p className="text-sm text-text-secondary">
                “{application.roleTitle}” at {application.companyName}, with all its comments and
                history, will be removed for good. This cannot be undone.
              </p>
              {deleteMutation.isError && (
                <p role="alert" className="text-xs text-text-danger">
                  {deleteMutation.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate(application.id, {
                      onSuccess: () => {
                        setConfirmDelete(false);
                        onClose();
                      },
                    })
                  }
                >
                  {deleteMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete permanently
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CONFLICT Banner */}
        {hasConflict && (
          <div className="bg-danger/10 border-b border-danger/30 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-danger">
              <AlertCircle className="h-4 w-4" />
              <span>This application changed elsewhere.</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-7"
              onClick={() => {
                refetchApp();
                setHasConflict(false);
              }}
            >
              Reload
            </Button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isCreate ? (
            <ApplicationCreateForm
              draft={mode === 'ai-preview' ? draft : undefined}
              statuses={statuses}
              priorities={priorities}
              workModes={workModes}
              jobTypes={jobTypes}
              levels={levels}
              sources={sources}
              cvVersions={cvVersions}
              initialStatusId={initialStatusId}
              onDiscard={onClose}
              onSaved={(id) => onApplicationCreated?.(id)}
            />
          ) : isAppLoading || !application ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
                {/* Left Column (Main details) */}
                <div className="min-w-0 space-y-5">
                  <InlineEditField
                    label="Role Title"
                    value={application.roleTitle}
                    onSave={(val) => handleUpdateField('roleTitle', val)}
                  />
                  <InlineEditField
                    label="Company Name"
                    value={application.companyName}
                    onSave={(val) => handleUpdateField('companyName', val)}
                  />
                  <InlineEditField
                    label="Location"
                    value={application.location || ''}
                    placeholder="Add location (e.g. Remote, San Francisco, CA)…"
                    onSave={(val) => handleUpdateField('location', val)}
                  />
                  <InlineEditField
                    label="Job Link"
                    value={application.jobUrl || ''}
                    placeholder="https://..."
                    onSave={(val) => handleUpdateField('jobUrl', val)}
                  />
                  <InlineEditField
                    label="Contact Email"
                    value={application.contactEmail || ''}
                    placeholder="recruiter@company.com"
                    onSave={(val) => handleUpdateField('contactEmail', val)}
                  />
                  <div className="space-y-1">
                    <InlineEditField
                      label="Resume (Google Drive link)"
                      value={application.resumeUrl || ''}
                      placeholder="https://drive.google.com/file/d/..."
                      onSave={(val) => handleUpdateField('resumeUrl', val)}
                    />
                    {application.resumeUrl && (
                      <a
                        href={application.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-text-accent hover:underline"
                      >
                        Open resume in Google Drive
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <JobDescriptionField
                    value={application.jobDescription?.html || ''}
                    onSave={(html) => handleUpdateField('jobDescriptionHtml', html)}
                  />
                  <InlineEditField
                    label="Notes"
                    type="textarea"
                    value={application.notesHtml || ''}
                    placeholder="Add personal notes, interview prep, questions…"
                    onSave={(val) => handleUpdateField('notesHtml', val)}
                  />
                </div>

                {/* Right Column (Sidebar attributes & metadata) */}
                <div className="space-y-4 lg:border-l border-border-default lg:pl-6">
                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Status
                    </span>
                    <select
                      value={application.statusId}
                      onChange={(e) => handleUpdateField('statusId', e.target.value)}
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Priority
                    </span>
                    <select
                      value={application.priorityId || ''}
                      onChange={(e) =>
                        handleUpdateField('priorityId', e.target.value ? e.target.value : null)
                      }
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">None</option>
                      {priorities.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Work Mode
                    </span>
                    <select
                      value={application.workModeId || ''}
                      onChange={(e) =>
                        handleUpdateField('workModeId', e.target.value ? e.target.value : null)
                      }
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">None</option>
                      {workModes.map((wm) => (
                        <option key={wm.id} value={wm.id}>
                          {wm.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Job Type
                    </span>
                    <select
                      value={application.jobTypeId || ''}
                      onChange={(e) =>
                        handleUpdateField('jobTypeId', e.target.value ? e.target.value : null)
                      }
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">None</option>
                      {jobTypes.map((jt) => (
                        <option key={jt.id} value={jt.id}>
                          {jt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Experience Level
                    </span>
                    <select
                      value={application.levelId || ''}
                      onChange={(e) =>
                        handleUpdateField('levelId', e.target.value ? e.target.value : null)
                      }
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">None</option>
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Application Source
                    </span>
                    <select
                      value={application.sourceId || ''}
                      onChange={(e) =>
                        handleUpdateField('sourceId', e.target.value ? e.target.value : null)
                      }
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">None</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      CV Version
                    </span>
                    <select
                      value={application.cvVersionId || ''}
                      onChange={(e) =>
                        handleUpdateField('cvVersionId', e.target.value ? e.target.value : null)
                      }
                      className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">None</option>
                      {cvVersions.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          {cv.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                      Cover Letter
                    </span>
                    <div
                      role="group"
                      aria-label="Cover letter sent"
                      className="inline-flex p-1 bg-bg-muted rounded-lg gap-1"
                    >
                      {[
                        { label: 'Yes', value: true },
                        { label: 'No', value: false },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          aria-pressed={application.coverLetter === o.value}
                          onClick={() => {
                            if (application.coverLetter !== o.value) {
                              handleUpdateField('coverLetter', o.value);
                            }
                          }}
                          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            application.coverLetter === o.value
                              ? 'bg-bg-accent text-text-primary'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Salary section */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1.5">
                      Compensation
                    </span>
                    <div className="space-y-2">
                      <InlineEditField
                        label="Expected / Max Salary"
                        value={
                          application.salary?.expected
                            ? String(application.salary.expected)
                            : application.salary?.max
                              ? String(application.salary.max)
                              : ''
                        }
                        placeholder="e.g. 120000"
                        onSave={(val) => {
                          const num = val ? Number(val) : null;
                          return handleUpdateField('salary', {
                            ...application.salary,
                            expected: num,
                            max: num,
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="block text-xs font-semibold text-text-muted uppercase mb-1.5">
                      Dates
                    </span>
                    <div className="mb-3 space-y-2">
                      {(
                        [
                          ['appliedAt', 'Applied'],
                          ['deadlineAt', 'Deadline'],
                          ['followUpAt', 'Follow-up'],
                          ['nextInterviewAt', 'Next interview'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key}>
                          <label
                            htmlFor={`date-${key}`}
                            className="block text-[11px] font-semibold uppercase text-text-muted mb-0.5"
                          >
                            {label}
                          </label>
                          <input
                            id={`date-${key}`}
                            type="date"
                            value={application.dates?.[key]?.slice(0, 10) ?? ''}
                            onChange={(e) =>
                              handleUpdateField('dates', {
                                ...(application.dates ?? {}),
                                [key]: e.target.value || null,
                              })
                            }
                            className="w-full text-xs font-medium bg-bg border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-text-muted space-y-1">
                      <p>
                        Created:{' '}
                        <span className="text-text font-mono">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                      <p>
                        Updated:{' '}
                        <span className="text-text font-mono">
                          {new Date(application.updatedAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Activity Section */}
              <ActivityFeed
                applicationId={application.id}
                activities={allActivities}
                comments={comments}
                isLoading={false}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={() => fetchNextPage()}
                onCommentAdded={() => {
                  refetchComments();
                  refetchActivities();
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
