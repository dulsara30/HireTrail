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
        {board?.lanes.map((lane) => (
          <PipelineLane
            key={lane.status.id}
            lane={lane}
            onSelectApplication={onSelectApplication}
            onNewApplicationInLane={onNewApplicationInLane}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApplication ? (
          <ApplicationCard application={activeApplication} onClick={() => {}} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
