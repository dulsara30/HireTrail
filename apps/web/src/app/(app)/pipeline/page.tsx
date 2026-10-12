'use client';

import React, { useState } from 'react';
import { useBoard } from '../../../api/hooks/queries/useBoard';
import { useMoveApplication } from '../../../api/hooks/mutations/useMoveApplication';
import { PipelineBoard } from '../../../components/organisms/pipeline/PipelineBoard';
import { ApplicationPanel } from '../../../components/organisms/applications/ApplicationPanel';
import { Button } from '../../../components/atoms/Button';
import { Plus, Sparkles } from 'lucide-react';
import { AutofillDialog } from '../../../components/organisms/applications/AutofillDialog';
import { type AutofillDraftDto } from '@hiretrail/shared';

export default function PipelinePage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [createWithStatusId, setCreateWithStatusId] = useState<string | null>(null);
  const [isAutofillOpen, setIsAutofillOpen] = useState(false);
  const [draft, setDraft] = useState<AutofillDraftDto | null>(null);

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
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Pipeline</h1>
          <p className="text-xs text-text-muted">Kanban board of your application stages</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setIsAutofillOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Autofill with AI
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateWithStatusId(board?.lanes[0]?.status.id || '')}
          >
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>
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

      {isAutofillOpen && (
        <AutofillDialog
          onClose={() => setIsAutofillOpen(false)}
          onManual={() => {
            setIsAutofillOpen(false);
            setCreateWithStatusId(board?.lanes[0]?.status.id || '');
          }}
          onDraft={(d) => {
            setDraft(d);
            setIsAutofillOpen(false);
          }}
        />
      )}

      {/* Side Panel for Create / AI preview / Edit */}
      {(selectedAppId || createWithStatusId !== null || draft) && (
        <ApplicationPanel
          applicationId={selectedAppId}
          mode={draft ? 'ai-preview' : createWithStatusId !== null ? 'create' : 'view'}
          draft={draft ?? undefined}
          initialStatusId={createWithStatusId || undefined}
          onClose={() => {
            setSelectedAppId(null);
            setCreateWithStatusId(null);
            setDraft(null);
          }}
          onApplicationCreated={(id: string) => {
            setCreateWithStatusId(null);
            setDraft(null);
            setSelectedAppId(id);
          }}
        />
      )}
    </div>
  );
}
