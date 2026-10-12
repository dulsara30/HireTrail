'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { authService } from '../../../api/services/auth.service';
import { Spinner } from '../../atoms/Spinner';
import { ROUTES } from '../../../constants/routes';

export function VerifyEmailView({ token }: { token: string }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err?.message || 'Verification link is invalid or has expired.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="text-center py-6 space-y-3">
        <Spinner size="md" />
        <p className="text-sm text-text-secondary">Verifying your email address...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-bg-success-subtle border border-border-success rounded-md text-sm text-text-success font-medium">
          Your email has been verified successfully!
        </div>
        <Link
          href={ROUTES.login}
          className="inline-block px-4 py-2 bg-text-primary text-bg-surface font-medium text-sm rounded-md"
        >
          Sign in to your account
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="p-4 bg-bg-danger-subtle border border-border-danger rounded-md text-sm text-text-danger">
        {errorMessage}
      </div>
      <Link
        href={ROUTES.login}
        className="inline-block text-sm text-text-accent font-medium hover:underline"
      >
        Return to sign in
      </Link>
    </div>
  );
}
