import React from 'react';
import { daysSince, formatDaysShort } from '../../../utils/helpers/days-since';
import { Trash2 } from 'lucide-react';
import { ApplicationListItemDto } from '@hiretrail/shared';
import { StatusPill } from '../../molecules/StatusPill/StatusPill';
import { PriorityChip } from '../../molecules/PriorityChip/PriorityChip';
import { OPTION_COLOR_STYLES } from '../../../constants/option-colors';

interface ApplicationCardProps {
  application: ApplicationListItemDto;
  onClick: () => void;
  isDragging?: boolean;
  /** Shows a delete button on hover or focus. */
  onDelete?: () => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onClick,
  isDragging = false,
  onDelete,
}) => {
  const appliedDays = daysSince(application.dates?.appliedAt);
  const tone = OPTION_COLOR_STYLES[application.resolvedStatus?.color ?? 'neutral'];
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`group relative flex flex-col gap-2 p-3.5 rounded-lg border border-l-4 ${tone.border} bg-bg-surface shadow-sm transition-all hover:border-border-interactive hover:shadow-md cursor-pointer select-none ${
        isDragging ? 'opacity-40 rotate-1 scale-95 ring-2 ring-border-accent' : ''
      }`}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Delete ${application.roleTitle}`}
          className="absolute right-1.5 top-1.5 z-10 rounded-md bg-bg-surface p-1 text-text-tertiary opacity-0 shadow-sm transition-opacity hover:bg-bg-danger-subtle hover:text-text-danger focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-text line-clamp-1 group-hover:text-text-accent transition-colors">
          {application.roleTitle}
        </h4>
        <PriorityChip priority={application.resolvedPriority} />
      </div>

      <div className="text-xs font-medium text-text-muted flex items-center justify-between">
        <span className="truncate">{application.companyName}</span>
        {application.location && (
          <span className="text-[11px] truncate">{application.location}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border-default text-[11px] text-text-muted">
        <span>
          {application.dates?.appliedAt
            ? `Applied ${new Date(application.dates.appliedAt).toLocaleDateString()}${appliedDays !== null ? ` · ${formatDaysShort(appliedDays)}` : ''}`
            : 'Saved'}
        </span>
        {application.resolvedStatus && (
          <StatusPill status={application.resolvedStatus} className="text-[10px] px-1.5 py-0" />
        )}
      </div>
    </div>
  );
};
