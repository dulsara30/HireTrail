'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useMe } from '../../api/hooks/queries/useMe';
import { useLogout } from '../../api/hooks/mutations/useLogout';
import { Spinner } from '../../components/atoms/Spinner';
import { Button } from '../../components/atoms/Button';
import { HireTrailLogo } from '../../components/atoms/HireTrailLogo';
import { AppSidebar } from '../../components/organisms/navigation/AppSidebar';
import { ROUTES } from '../../constants/routes';

const COLLAPSE_KEY = 'ht_sidebar_collapsed';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: user, isLoading, isError } = useMe();
  const logoutMutation = useLogout();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      // storage unavailable: expanded by default
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // storage unavailable: keep in memory only
      }
      return next;
    });
  };

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
    <div className="min-h-screen bg-bg-canvas md:flex md:h-screen md:overflow-hidden">
      <AppSidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={() => logoutMutation.mutate()}
        isSigningOut={logoutMutation.isPending}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border-default border-t-4 border-t-border-accent bg-bg-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-text-primary hover:bg-bg-muted"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <HireTrailLogo size="sm" />
        </header>

        <main className="w-full min-w-0 flex-1 p-4 md:min-h-0 md:overflow-y-auto md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
