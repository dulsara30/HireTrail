'use client';

import React, { useState } from 'react';
import { useApplicationsInfinite } from '../../../api/hooks/queries/useApplicationsInfinite';
import {
  ApplicationFilters,
  EMPTY_APPLICATION_FILTERS,
  hasActiveFilters,
  type ApplicationFilterValues,
} from '../../../components/organisms/applications/ApplicationFilters';
import { DeleteApplicationDialog } from '../../../components/organisms/applications/DeleteApplicationDialog';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { ApplicationsTable } from '../../../components/organisms/applications/ApplicationsTable';
import { ApplicationPanel } from '../../../components/organisms/applications/ApplicationPanel';
import { Button } from '../../../components/atoms/Button';
import { Download, FileUp, Plus, Sparkles } from 'lucide-react';
import { ImportWizard } from '../../../components/organisms/applications/ImportWizard';
import { useDownload } from '../../../api/hooks/mutations/useDownload';
import { AutofillDialog } from '../../../components/organisms/applications/AutofillDialog';
import { type AutofillDraftDto } from '@hiretrail/shared';

export default function ApplicationsPage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAutofillOpen, setIsAutofillOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const download = useDownload();
  const [filters, setFilters] = useState<ApplicationFilterValues>(EMPTY_APPLICATION_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    roleTitle: string;
    companyName: string;
  } | null>(null);
  const debouncedQ = useDebouncedValue(filters.q.trim(), 300);
  const [draft, setDraft] = useState<AutofillDraftDto | null>(null);

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useApplicationsInfinite({
      q: debouncedQ || undefined,
      statusIds: filters.statusId ? [filters.statusId] : undefined,
      priorityIds: filters.priorityId ? [filters.priorityId] : undefined,
      companyId: filters.company?.id,
    });

  const allItems = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Applications</h1>
          <p className="text-xs text-text-muted">Table view of all your tracked applications</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => download.mutate('applications-csv')}
            disabled={download.isPending}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Import CSV
          </Button>
          <Button variant="accent" size="sm" onClick={() => setIsAutofillOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Autofill with AI
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>
      </div>

      <ApplicationFilters values={filters} onChange={setFilters} />

      <ApplicationsTable
        items={allItems}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onSelectApplication={(id: string) => setSelectedAppId(id)}
        onNewApplication={() => setIsCreateOpen(true)}
        onDelete={(app) => setDeleteTarget(app)}
        isFiltered={hasActiveFilters(filters)}
        onClearFilters={() => setFilters(EMPTY_APPLICATION_FILTERS)}
      />

      {/* Side Panel for Create / Edit */}
      {deleteTarget && (
        <DeleteApplicationDialog
          application={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            if (selectedAppId === deleteTarget.id) setSelectedAppId(null);
          }}
        />
      )}

      {isImportOpen && <ImportWizard onClose={() => setIsImportOpen(false)} />}

      {isAutofillOpen && (
        <AutofillDialog
          onClose={() => setIsAutofillOpen(false)}
          onManual={() => {
            setIsAutofillOpen(false);
            setIsCreateOpen(true);
          }}
          onDraft={(d) => {
            setDraft(d);
            setIsAutofillOpen(false);
          }}
        />
      )}

      {(selectedAppId || isCreateOpen || draft) && (
        <ApplicationPanel
          applicationId={selectedAppId}
          mode={draft ? 'ai-preview' : isCreateOpen ? 'create' : 'view'}
          draft={draft ?? undefined}
          onClose={() => {
            setSelectedAppId(null);
            setIsCreateOpen(false);
            setDraft(null);
          }}
          onApplicationCreated={(id: string) => {
            setIsCreateOpen(false);
            setDraft(null);
            setSelectedAppId(id);
          }}
        />
      )}
    </div>
  );
}
