'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';
import { useMe } from '../api/hooks/queries/useMe';
import { Spinner } from '../components/atoms/Spinner';
import { ROUTES } from '../constants/routes';

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: user } = useMe();

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.login);
    } else if (user) {
      router.replace(ROUTES.dashboard);
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-page gap-3 text-sm text-text-secondary">
      <Spinner size="md" />
      <span>Loading HireTrail...</span>
    </div>
  );
}
