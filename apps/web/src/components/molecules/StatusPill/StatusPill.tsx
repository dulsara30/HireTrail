import React from 'react';
import { Badge } from '../../atoms/Badge';
import { OptionDto } from '@hiretrail/shared';

interface StatusPillProps {
  status?: OptionDto;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className }) => {
  if (!status) return null;

  return (
    <Badge color={status.color} dot className={className}>
      {status.label}
    </Badge>
  );
};
