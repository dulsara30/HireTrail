import React from 'react';
import { Chip } from '../../atoms/Chip';
import { OptionDto } from '@hiretrail/shared';

interface PriorityChipProps {
  priority?: OptionDto | null;
  className?: string;
}

export const PriorityChip: React.FC<PriorityChipProps> = ({ priority, className }) => {
  if (!priority) return null;

  return (
    <Chip color={priority.color} className={className}>
      {priority.label}
    </Chip>
  );
};
