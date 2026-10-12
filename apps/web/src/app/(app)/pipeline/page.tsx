'use client';

import React, { useState } from 'react';
import { useBoard } from '../../../api/hooks/queries/useBoard';
import { useMoveApplication } from '../../../api/hooks/mutations/useMoveApplication';
import { PipelineBoard } from '../../../components/organisms/pipeline/PipelineBoard';
import { ApplicationPanel } from '../../../components/organisms/applications/ApplicationPanel';
import { Button } from '../../../components/atoms/Button';
import { Plus } from 'lucide-react';

export default function PipelinePage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [createWithStatusId, setCreateWithStatusId] = useState<string | null>(null);

  const { data: board, isLoading } = useBoard();
  const moveMutation = useMoveApplication();

  const handleMove = (id: string, targetStatusId: string, version: number) => {
    moveMutation.mutate({
      id,
      input: {
        statusId: targetStatusId,
        version,
      },
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Pipeline</h1>
          <p className="text-xs text-text-muted">Kanban board of your application stages</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateWithStatusId(board?.lanes[0]?.status.id || '')}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Application
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <PipelineBoard
          board={board}
          isLoading={isLoading}
          onMoveApplication={handleMove}
          onSelectApplication={(id: string) => setSelectedAppId(id)}
          onNewApplicationInLane={(statusId: string) => setCreateWithStatusId(statusId)}
        />
      </div>

      {/* Side Panel for Create / Edit */}
      {(selectedAppId || createWithStatusId !== null) && (
        <ApplicationPanel
          applicationId={selectedAppId}
          mode={createWithStatusId !== null ? 'create' : 'view'}
          initialStatusId={createWithStatusId || undefined}
          onClose={() => {
            setSelectedAppId(null);
            setCreateWithStatusId(null);
          }}
          onApplicationCreated={(id: string) => {
            setCreateWithStatusId(null);
            setSelectedAppId(id);
          }}
        />
      )}
    </div>
  );
}
