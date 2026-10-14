import React from 'react';
import { Lock } from 'lucide-react';

interface OrbitProNoteProps {
  /** Why it is locked, for example the message the server sent. */
  message: string;
  className?: string;
}

/** Shown when the Free plan runs out of room, or a feature needs PRO. The server enforces the same rules. */
export const OrbitProNote: React.FC<OrbitProNoteProps> = ({ message, className = '' }) => (
  <div
    role="alert"
    className={`flex items-start gap-2 rounded-lg border border-border-accent bg-bg-accent-subtle p-3 text-xs ${className}`}
  >
    <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-accent" aria-hidden="true" />
    <div className="space-y-0.5">
      <p className="font-semibold text-text-primary">{message}</p>
      <p className="text-text-secondary">
        PRO removes these limits. PRO access is switched on by an admin for now.
      </p>
    </div>
  </div>
);

/** True for the two errors the server sends when a plan is the reason. */
export function isPlanError(code: string | undefined): boolean {
  return code === 'PLAN_LIMIT_REACHED' || code === 'PLAN_REQUIRED';
}
