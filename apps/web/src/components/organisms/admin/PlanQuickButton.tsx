import React from 'react';
import { Check, Crown } from 'lucide-react';
import { type AdminUserDto } from '@hiretrail/shared';
import { useAdminChangePlan } from '../../../api/hooks/mutations/useAdminChangePlan';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

interface PlanQuickButtonProps {
  user: AdminUserDto;
}

/** One click: FREE becomes PRO (for example after a payment). It is still written to the audit log. */
export const PlanQuickButton: React.FC<PlanQuickButtonProps> = ({ user }) => {
  const changePlan = useAdminChangePlan(user.id);

  if (user.plan === 'PRO') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-success">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        PRO
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="accent"
        onClick={() => changePlan.mutate({ plan: 'PRO' })}
        disabled={changePlan.isPending}
        aria-label={`Make ${user.email} PRO`}
      >
        {changePlan.isPending ? (
          <Spinner size="sm" />
        ) : (
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Make PRO
      </Button>
      {changePlan.isError && (
        <p role="alert" className="text-[11px] text-text-danger">
          {changePlan.error.message}
        </p>
      )}
    </div>
  );
};
