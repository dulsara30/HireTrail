import React from 'react';
import { Lock, X } from 'lucide-react';
import { useUpdateOrbitSettings } from '../../../api/hooks/mutations/useOrbitSpaceMutations';
import { useOrbitPlan, useOrbitSettings } from '../../../api/hooks/queries/useOrbitQueries';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { OrbitProNote, isPlanError } from './OrbitProNote';

interface OrbitSettingsDialogProps {
  onClose: () => void;
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Time zone, weekly goal and email preferences. Emails are sent to Pro accounts with a verified address. */
export const OrbitSettingsDialog: React.FC<OrbitSettingsDialogProps> = ({ onClose }) => {
  const { data: settings, isLoading } = useOrbitSettings();
  const { data: plan } = useOrbitPlan();
  const update = useUpdateOrbitSettings();
  const emailLocked = plan ? !plan.limits.email : false;

  React.useEffect(() => {
    const esc = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const zone = browserTimeZone();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-bg-inverse/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Orbit settings"
        className="relative z-10 w-full max-w-md space-y-4 rounded-xl border border-border-default bg-bg-surface p-5 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">Orbit settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading || !settings ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="space-y-4">
            {update.isError &&
              (isPlanError(update.error.code) ? (
                <OrbitProNote message={update.error.message} />
              ) : (
                <p role="alert" className="text-xs text-text-danger">
                  {update.error.message}
                </p>
              ))}

            <div className="space-y-1">
              <label
                htmlFor="orbit-tz"
                className="block text-[11px] font-semibold uppercase text-text-secondary"
              >
                Time zone
              </label>
              <div className="flex gap-2">
                <input
                  id="orbit-tz"
                  readOnly
                  value={settings.timezone}
                  className="h-9 flex-1 rounded-md border border-border-default bg-bg-muted px-2 text-sm"
                />
                {settings.timezone !== zone && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => update.mutate({ timezone: zone })}
                  >
                    Use {zone}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                Used for the morning email and for what counts as “today”.
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="orbit-goal"
                className="block text-[11px] font-semibold uppercase text-text-secondary"
              >
                Weekly goal (applications)
              </label>
              <input
                id="orbit-goal"
                type="number"
                min={1}
                max={100}
                defaultValue={settings.weeklyGoal}
                key={settings.weeklyGoal}
                onBlur={(e) => {
                  const n = Math.min(
                    Math.max(Number(e.target.value) || settings.weeklyGoal, 1),
                    100,
                  );
                  if (n !== settings.weeklyGoal) update.mutate({ weeklyGoal: n });
                }}
                className="h-9 w-24 rounded-md border border-border-default bg-bg-surface px-2 text-sm"
              />
            </div>

            <fieldset className="space-y-2 rounded-lg border border-border-default p-3">
              <legend className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase text-text-secondary">
                Email {emailLocked && <Lock className="h-3 w-3" aria-hidden="true" />}
              </legend>
              {emailLocked && (
                <p className="text-xs text-text-secondary">
                  Email reminders and the morning summary are PRO features.
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  disabled={emailLocked}
                  checked={settings.emailReminders && !emailLocked}
                  onChange={(e) => update.mutate({ emailReminders: e.target.checked })}
                />
                Email me when a reminder is due
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  disabled={emailLocked}
                  checked={settings.emailDigest && !emailLocked}
                  onChange={(e) => update.mutate({ emailDigest: e.target.checked })}
                />
                Send a morning summary
              </label>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <label htmlFor="orbit-hour">Send it at</label>
                <select
                  id="orbit-hour"
                  disabled={emailLocked}
                  value={settings.digestHour}
                  onChange={(e) => update.mutate({ digestHour: Number(e.target.value) })}
                  className="h-8 rounded-md border border-border-default bg-bg-surface px-2 text-sm"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
};
