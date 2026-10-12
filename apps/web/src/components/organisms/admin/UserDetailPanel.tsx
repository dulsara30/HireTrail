import React from 'react';
import { X } from 'lucide-react';
import { useAdminUser } from '../../../api/hooks/queries/useAdminUser';
import { useAdminChangePlan } from '../../../api/hooks/mutations/useAdminChangePlan';
import { useAdminChangeStatus } from '../../../api/hooks/mutations/useAdminChangeStatus';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

interface UserDetailPanelProps {
  userId: string;
  currentAdminId: string | undefined;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

export const UserDetailPanel: React.FC<UserDetailPanelProps> = ({
  userId,
  currentAdminId,
  onClose,
}) => {
  const { data: user, isLoading } = useAdminUser(userId);
  const changePlan = useAdminChangePlan(userId);
  const changeStatus = useAdminChangeStatus(userId);
  const [reason, setReason] = React.useState('');

  const isSelf = currentAdminId === userId;
  const canSubmit = reason.trim().length >= 5;
  const nextPlan = user?.plan === 'PRO' ? 'FREE' : 'PRO';
  const nextStatus = user?.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

  const done = () => setReason('');
  const error = changePlan.error ?? changeStatus.error;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="User details"
        className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-default bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-accent bg-bg-accent-subtle px-5 py-4">
          <h2 className="text-base font-bold text-text-primary">User details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close user details">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading || !user ? (
          <div className="flex justify-center p-10">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="space-y-6 p-5">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-text-primary">{user.name}</p>
              <p className="break-all text-sm text-text-secondary">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge color={user.plan === 'PRO' ? 'accent' : 'neutral'}>{user.plan}</Badge>
                <Badge color={user.role === 'ADMIN' ? 'purple' : 'neutral'}>{user.role}</Badge>
                <Badge color={user.status === 'ACTIVE' ? 'success' : 'danger'}>{user.status}</Badge>
                <Badge color={user.emailVerified ? 'success' : 'orange'}>
                  {user.emailVerified ? 'Email verified' : 'Email not verified'}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {(
                [
                  ['Applications', user.counts.applications],
                  ['Comments', user.counts.comments],
                  ['Options', user.counts.options],
                  ['Private companies', user.counts.privateCompanies],
                  ['Active sessions', user.activeSessions],
                  ['AI calls this month', user.aiUsageThisMonth.calls],
                  ['AI failures', user.aiUsageThisMonth.failures],
                  [
                    'AI tokens',
                    (
                      user.aiUsageThisMonth.inputTokens + user.aiUsageThisMonth.outputTokens
                    ).toLocaleString(),
                  ],
                ] as Array<[string, number | string]>
              ).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border-default bg-bg-subtle p-3">
                  <dt className="text-[11px] font-semibold uppercase text-text-secondary">{k}</dt>
                  <dd className="text-lg font-bold text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-1 text-xs text-text-secondary">
              <p>Joined {new Date(user.createdAt).toLocaleDateString()}</p>
              <p>
                Last login{' '}
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'never'}
              </p>
              <p>
                Sign-in: {user.hasPassword ? 'password' : ''}
                {user.hasPassword && user.googleLinked ? ' + ' : ''}
                {user.googleLinked ? 'Google' : ''}
              </p>
              {user.planMeta?.reason && <p>Last plan note: {user.planMeta.reason}</p>}
            </div>

            <div className="space-y-3 rounded-xl border border-border-accent bg-bg-accent-subtle p-4">
              <label
                htmlFor="admin-reason"
                className="text-xs font-semibold uppercase text-text-accent"
              >
                Note (optional for plan changes, required to suspend)
              </label>
              <textarea
                id="admin-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Why are you making this change?"
                className={inputClass}
              />
              {error && (
                <p role="alert" className="text-xs text-text-danger">
                  {error.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={changePlan.isPending}
                  onClick={() =>
                    changePlan.mutate(
                      { plan: nextPlan, reason: reason.trim() || undefined },
                      { onSuccess: done },
                    )
                  }
                >
                  {nextPlan === 'PRO' ? 'Make PRO' : 'Change to FREE'}
                </Button>
                <Button
                  size="sm"
                  variant={nextStatus === 'SUSPENDED' ? 'danger' : 'secondary'}
                  disabled={!canSubmit || changeStatus.isPending || isSelf}
                  title={isSelf ? 'You cannot change your own status' : undefined}
                  onClick={() =>
                    changeStatus.mutate(
                      { status: nextStatus, reason: reason.trim() },
                      { onSuccess: done },
                    )
                  }
                >
                  {nextStatus === 'SUSPENDED' ? 'Suspend account' : 'Reactivate account'}
                </Button>
              </div>
              {nextStatus === 'SUSPENDED' && (
                <p className="text-[11px] text-text-secondary">
                  Suspending signs the user out of every device right away.
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
