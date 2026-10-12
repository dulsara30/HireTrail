import React from 'react';
import { ApplicationListItemDto } from '@hiretrail/shared';
import { StatusPill } from '../../molecules/StatusPill/StatusPill';
import { PriorityChip } from '../../molecules/PriorityChip/PriorityChip';
import { OPTION_COLOR_STYLES } from '../../../constants/option-colors';

interface ApplicationCardProps {
  application: ApplicationListItemDto;
  onClick: () => void;
  isDragging?: boolean;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onClick,
  isDragging = false,
}) => {
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
            ? `Applied ${new Date(application.dates.appliedAt).toLocaleDateString()}`
            : 'Saved'}
        </span>
        {application.resolvedStatus && (
          <StatusPill status={application.resolvedStatus} className="text-[10px] px-1.5 py-0" />
        )}
      </div>
    </div>
  );
};
