'use client';

import { useEffect } from 'react';
import { Button } from '../components/atoms/Button';
import { EmptyState } from '../components/molecules/EmptyState';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side render error
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-page">
      <EmptyState
        title="Something went wrong"
        description={error.message || 'An unexpected client error occurred.'}
        action={
          <Button variant="accent" onClick={() => reset()}>
            Try Again
          </Button>
        }
      />
    </div>
  );
}
