'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useMe } from '../../api/hooks/queries/useMe';
import { useLogout } from '../../api/hooks/mutations/useLogout';
import { Spinner } from '../../components/atoms/Spinner';
import { Button } from '../../components/atoms/Button';
import { Badge } from '../../components/atoms/Badge';
import { ROUTES } from '../../constants/routes';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: user, isLoading, isError } = useMe();
  const logoutMutation = useLogout();

  // If not authenticated in store, redirect to login
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-canvas text-text-secondary text-sm gap-2">
        <Spinner size="sm" />
        <span>Authenticating session...</span>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-canvas text-text-secondary p-4 gap-4">
        <p className="text-sm text-text-danger">Failed to verify user profile.</p>
        <Button variant="secondary" size="sm" onClick={() => logoutMutation.mutate()}>
          Sign in again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      <header className="h-14 border-b border-border-default bg-bg-surface px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold tracking-tight text-text-primary">HireTrail</span>
          <span className="text-xs text-text-tertiary">|</span>
          <span className="text-sm font-medium text-text-secondary">Job Pipeline</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge color={user.plan === 'PRO' ? 'accent' : 'neutral'}>{user.plan}</Badge>
          <span className="text-sm text-text-primary font-medium">{user.name}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
