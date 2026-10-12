'use client';

import React from 'react';
import Link from 'next/link';
import { useMe } from '../../../api/hooks/queries/useMe';
import { EmptyState } from '../../../components/molecules/EmptyState';
import { Button } from '../../../components/atoms/Button';
import { ROUTES } from '../../../constants/routes';

export default function DashboardPage() {
  const { data: user } = useMe();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          Welcome back, {user?.name || 'Trailblazer'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here is an overview of your job search pipeline.
        </p>
      </div>

      <div className="p-8 bg-bg-surface border border-border-default rounded-lg">
        <EmptyState
          title="Pipeline Ready (Phase 1 Auth Complete)"
          description="Your account is authenticated with JWT access tokens, refresh token rotation, and active session tracking."
          action={
            <div className="flex gap-3">
              <Link href={ROUTES.settings.security}>
                <Button variant="secondary" size="sm">
                  View Active Sessions
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );
}
