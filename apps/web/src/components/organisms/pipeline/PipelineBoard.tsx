import React from 'react';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BoardDto, ApplicationListItemDto } from '@hiretrail/shared';
import { PipelineLane } from './PipelineLane';
import { ApplicationCard } from '../applications/ApplicationCard';
import { useBoardUiStore } from '../../../store/board-ui.store';
import { Spinner } from '../../atoms/Spinner';
import { DeleteApplicationDialog } from '../applications/DeleteApplicationDialog';

interface PipelineBoardProps {
  board?: BoardDto;
  isLoading: boolean;
  onMoveApplication: (id: string, targetStatusId: string, version: number) => void;
  onSelectApplication: (id: string) => void;
  onNewApplicationInLane: (statusId: string) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  board,
  isLoading,
  onMoveApplication,
  onSelectApplication,
  onNewApplicationInLane,
}) => {
  const { activeDragId, setActiveDragId } = useBoardUiStore();
  const [deleteTarget, setDeleteTarget] = React.useState<ApplicationListItemDto | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeApplication: ApplicationListItemDto | undefined = React.useMemo(() => {
    if (!activeDragId || !board) return undefined;
    for (const lane of board.lanes) {
      const match = lane.items.find((i) => i.id === activeDragId);
      if (match) return match;
    }
    return undefined;
  }, [activeDragId, board]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || !board) return;

    const activeId = String(active.id);
    let targetStatusId = String(over.id);

    // If dropped onto another card, find that card's lane status ID
    for (const lane of board.lanes) {
      if (lane.items.some((i) => i.id === targetStatusId)) {
        targetStatusId = lane.status.id;
        break;
      }
    }

    if (activeApplication && activeApplication.statusId !== targetStatusId) {
      onMoveApplication(activeId, targetStatusId, activeApplication.version);
    }
  };

  if (isLoading && !board) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4 pt-1 items-start">
        {board && board.lanes.length > 0 ? (
          board.lanes.map((lane) => (
            <PipelineLane
              key={lane.status.id}
              lane={lane}
              onSelectApplication={onSelectApplication}
              onNewApplicationInLane={onNewApplicationInLane}
              onDeleteApplication={setDeleteTarget}
            />
          ))
        ) : (
          <div className="flex w-full h-64 items-center justify-center border-2 border-dashed border-border-default rounded-xl p-8 text-center bg-bg-surface/50">
            <div>
              <p className="text-sm font-semibold text-text-primary">Pipeline is empty</p>
              <p className="text-xs text-text-secondary mt-1">
                Configure your pipeline stages in Settings or click "New Application" to add your
                first job.
              </p>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteApplicationDialog application={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}

      <DragOverlay>
        {activeApplication ? (
          <ApplicationCard application={activeApplication} onClick={() => {}} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
