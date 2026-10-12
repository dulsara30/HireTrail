import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BoardLaneDto, ApplicationListItemDto } from '@hiretrail/shared';
import { ApplicationCard } from '../applications/ApplicationCard';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Plus } from 'lucide-react';

interface SortableApplicationCardProps {
  application: ApplicationListItemDto;
  onSelect: (id: string) => void;
  onDelete?: (application: ApplicationListItemDto) => void;
}

const SortableApplicationCard: React.FC<SortableApplicationCardProps> = ({
  application,
  onSelect,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: { application },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ApplicationCard
        application={application}
        onClick={() => onSelect(application.id)}
        isDragging={isDragging}
        onDelete={onDelete ? () => onDelete(application) : undefined}
      />
    </div>
  );
};

interface PipelineLaneProps {
  lane: BoardLaneDto;
  onSelectApplication: (id: string) => void;
  onNewApplicationInLane: (statusId: string) => void;
  onDeleteApplication?: (application: ApplicationListItemDto) => void;
}

export const PipelineLane: React.FC<PipelineLaneProps> = ({
  lane,
  onSelectApplication,
  onNewApplicationInLane,
  onDeleteApplication,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.status.id,
    data: { lane },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 flex-shrink-0 bg-bg-surface rounded-xl border shadow-sm p-3 transition-colors max-h-full ${
        isOver ? 'border-border-accent bg-bg-accent-subtle' : 'border-border-default'
      }`}
    >
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <Badge color={lane.status.color} dot className="text-xs font-semibold">
            {lane.status.label}
          </Badge>
          <span className="text-xs font-medium text-text-muted">({lane.total})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-text-muted hover:text-text"
          onClick={() => onNewApplicationInLane(lane.status.id)}
          aria-label={`Add application to ${lane.status.label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-[150px] flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        <SortableContext items={lane.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {lane.items.map((app) => (
            <SortableApplicationCard
              key={app.id}
              application={app}
              onSelect={onSelectApplication}
              onDelete={onDeleteApplication}
            />
          ))}
        </SortableContext>
        {lane.items.length === 0 && (
          <div className="flex h-24 items-center justify-center border border-dashed border-border rounded-md text-xs text-text-muted">
            Empty lane
          </div>
        )}
      </div>
    </div>
  );
};
