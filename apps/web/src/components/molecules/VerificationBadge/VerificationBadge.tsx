import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { checkedLabel, verificationLook } from '../../../utils/helpers/verification';

interface VerificationBadgeProps {
  score: number | null | undefined;
  checkedAt?: string | null;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  score,
  checkedAt,
  className,
}) => {
  if (score === null || score === undefined) {
    return (
      <Badge color="neutral" className={className}>
        Not checked yet
      </Badge>
    );
  }
  const look = verificationLook(score);
  const checked = checkedLabel(checkedAt);
  return (
    <Badge color={look.tone} className={className} title={`Accuracy score ${score} of 100`}>
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      {look.label} · {score}
      {checked && <span className="font-normal opacity-80"> · {checked}</span>}
    </Badge>
  );
};
