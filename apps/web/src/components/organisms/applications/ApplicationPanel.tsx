import React, { useState, useEffect } from 'react';
import { OptionDto } from '@hiretrail/shared';
import { InlineEditField } from '../../molecules/InlineEditField/InlineEditField';
import { ActivityFeed } from '../activity/ActivityFeed';

import { useApplication } from '../../../api/hooks/queries/useApplication';
import { useOptions } from '../../../api/hooks/queries/useOptions';
import { useComments } from '../../../api/hooks/queries/useComments';
import { useActivitiesInfinite } from '../../../api/hooks/queries/useActivitiesInfinite';
import { useUpdateApplicationField } from '../../../api/hooks/mutations/useUpdateApplicationField';
import { useCreateApplication } from '../../../api/hooks/mutations/useCreateApplication';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { X, AlertCircle } from 'lucide-react';

export type ApplicationPanelMode = 'create' | 'view' | 'ai-preview';

interface ApplicationPanelProps {
  applicationId: string | null;
  mode?: ApplicationPanelMode;
  initialStatusId?: string;
  onClose: () => void;
  onApplicationCreated?: (id: string) => void;
}

export const ApplicationPanel: React.FC<ApplicationPanelProps> = ({
  applicationId,
  mode = 'view',
  initialStatusId,
  onClose,
  onApplicationCreated,
}) => {
  const isCreate = mode === 'create';

  // Create mode state
  const [createRole, setCreateRole] = useState('');
  const [createCompany, setCreateCompany] = useState('');
  const [createStatusId, setCreateStatusId] = useState(initialStatusId || '');

  // Concurrency conflict banner state
  const [hasConflict, setHasConflict] = useState(false);

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

  const updateFieldMutation = useUpdateApplicationField();
  const createMutation = useCreateApplication();

  const optionsRecord = optionsData as Record<string, OptionDto[]> | undefined;
  const statuses = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'STATUS')
    : optionsRecord?.STATUS || [];

  const priorities = Array.isArray(optionsData)
    ? optionsData.filter((o) => o.type === 'PRIORITY')
    : optionsRecord?.PRIORITY || [];

  useEffect(() => {
    if (initialStatusId) {
      setCreateStatusId(initialStatusId);
    } else if (statuses.length > 0 && !createStatusId && statuses[0]) {
      setCreateStatusId(statuses[0].id);
    }
  }, [initialStatusId, statuses, createStatusId]);

  const handleUpdateField = async (fieldName: string, value: string | null) => {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRole.trim() || !createCompany.trim() || !createStatusId) return;

    const result = await createMutation.mutateAsync({
      roleTitle: createRole,
      companyName: createCompany,
      statusId: createStatusId,
      labelIds: [],
      contacts: [],
    });

    if (onApplicationCreated) {
      onApplicationCreated(result.application.id);
    }
  };

  const allActivities = React.useMemo(() => {
    return activitiesData?.pages.flatMap((p) => p.items) || [];
  }, [activitiesData]);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-bg border-l border-border shadow-2xl flex flex-col transition-transform">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text">
          {isCreate ? 'New Application' : application?.roleTitle || 'Application Details'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

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
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Role Title
              </label>
              <input
                type="text"
                required
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={createCompany}
                onChange={(e) => setCreateCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Initial Status
              </label>
              <select
                value={createStatusId}
                onChange={(e) => setCreateStatusId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isPending || !createRole || !createCompany}
              >
                {createMutation.isPending ? <Spinner size="sm" /> : 'Create'}
              </Button>
            </div>
          </form>
        ) : isAppLoading || !application ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column (Main) */}
              <div className="md:col-span-2 space-y-5">
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
                  placeholder="Add location (e.g. Remote, New York)…"
                  onSave={(val) => handleUpdateField('location', val)}
                />
                <InlineEditField
                  label="Job Link"
                  value={application.jobUrl || ''}
                  placeholder="Add job post URL…"
                  onSave={(val) => handleUpdateField('jobUrl', val)}
                />
                <InlineEditField
                  label="Notes"
                  type="textarea"
                  value={application.notesHtml || ''}
                  placeholder="Add notes about this role…"
                  onSave={(val) => handleUpdateField('notesHtml', val)}
                />
              </div>

              {/* Right Column (Sidebar) */}
              <div className="space-y-4 border-l border-border/40 pl-4">
                <div>
                  <span className="block text-xs font-semibold text-text-muted uppercase mb-1">
                    Status
                  </span>
                  <select
                    value={application.statusId}
                    onChange={(e) => handleUpdateField('statusId', e.target.value)}
                    className="w-full text-xs font-medium bg-bg border border-border rounded px-2 py-1.5 focus:outline-none"
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
                    className="w-full text-xs font-medium bg-bg border border-border rounded px-2 py-1.5 focus:outline-none"
                  >
                    <option value="">None</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
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
  );
};
