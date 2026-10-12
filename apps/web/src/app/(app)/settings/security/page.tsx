'use client';

import React from 'react';
import { useSessions } from '../../../../api/hooks/queries/useSessions';
import { useRevokeSession } from '../../../../api/hooks/mutations/useRevokeSession';
import { useLogout } from '../../../../api/hooks/mutations/useLogout';
import { useMe } from '../../../../api/hooks/queries/useMe';
import { authService } from '../../../../api/services/auth.service';
import { Button } from '../../../../components/atoms/Button';
import { Badge } from '../../../../components/atoms/Badge';
import { Spinner } from '../../../../components/atoms/Spinner';

import { SessionDto } from '@hiretrail/shared';

export default function SecurityPage() {
  const { data: user } = useMe();
  const { data: sessions, isLoading, refetch } = useSessions();
  const revokeSessionMutation = useRevokeSession();
  const logoutMutation = useLogout();
  const [linking, setLinking] = React.useState(false);

  const handleLinkGoogle = async () => {
    setLinking(true);
    try {
      const { url } = await authService.getGoogleLinkUrl();
      window.location.href = url;
    } catch {
      setLinking(false);
    }
  };

  const handleLogoutAll = async () => {
    await authService.logoutAll();
    logoutMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Security Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your active sessions, authentication methods, and credentials.
        </p>
      </div>

      {/* Google Account Linking */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-text-primary">Connected Accounts</h2>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium text-text-primary">Google</div>
            <div className="text-xs text-text-secondary">
              {user?.email ? `Linked to ${user.email}` : 'Sign in using your Google account'}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={handleLinkGoogle} disabled={linking}>
            {linking ? 'Redirecting...' : 'Link Google Account'}
          </Button>
        </div>
      </section>

      {/* Active Sessions */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Active Sessions</h2>
            <p className="text-xs text-text-secondary mt-1">
              Devices currently signed in with your refresh token.
            </p>
          </div>
          <Button size="sm" variant="danger" onClick={handleLogoutAll}>
            Sign out everywhere
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {sessions?.map((session: SessionDto) => (
              <div key={session.id} className="py-3 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {session.userAgent || 'Unknown Browser / Device'}
                    </span>
                    {session.isCurrent && <Badge color="success">Current session</Badge>}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Last active: {new Date(session.lastUsedAt).toLocaleString()}
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await revokeSessionMutation.mutateAsync(session.id);
                      refetch();
                    }}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
