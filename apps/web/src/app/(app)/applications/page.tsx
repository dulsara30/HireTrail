'use client';

import React, { useState } from 'react';
import { useApplicationsInfinite } from '../../../api/hooks/queries/useApplicationsInfinite';
import { ApplicationsTable } from '../../../components/organisms/applications/ApplicationsTable';
import { ApplicationPanel } from '../../../components/organisms/applications/ApplicationPanel';
import { Button } from '../../../components/atoms/Button';
import { Plus } from 'lucide-react';

export default function ApplicationsPage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useApplicationsInfinite();

  const allItems = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Applications</h1>
          <p className="text-xs text-text-muted">Table view of all your tracked applications</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Application
        </Button>
      </div>

      <ApplicationsTable
        items={allItems}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onSelectApplication={(id: string) => setSelectedAppId(id)}
        onNewApplication={() => setIsCreateOpen(true)}
      />

      {/* Side Panel for Create / Edit */}
      {(selectedAppId || isCreateOpen) && (
        <ApplicationPanel
          applicationId={selectedAppId}
          mode={isCreateOpen ? 'create' : 'view'}
          onClose={() => {
            setSelectedAppId(null);
            setIsCreateOpen(false);
          }}
          onApplicationCreated={(id: string) => {
            setIsCreateOpen(false);
            setSelectedAppId(id);
          }}
        />
      )}
    </div>
  );
}
