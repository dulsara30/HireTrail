'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../api/services/auth.service';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    // Check if the non-HttpOnly signed-in hint cookie is present
    const hasSignedInCookie = document.cookie
      .split(';')
      .some((item) => item.trim().startsWith('ht_signed_in='));

    if (!hasSignedInCookie) {
      clearAuth();
      setIsBootstrapped(true);
      return;
    }

    // Attempt single-flight refresh on application load
    authService
      .refresh()
      .then((tokens) => {
        setAccessToken(tokens.accessToken);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setIsBootstrapped(true);
      });
  }, [setAccessToken, clearAuth]);

  if (!isBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-canvas text-text-secondary text-sm">
        Loading HireTrail...
      </div>
    );
  }

  return <>{children}</>;
}
