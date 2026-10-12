'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { useDownload } from '../../../../api/hooks/mutations/useDownload';
import { useDeleteAccount } from '../../../../api/hooks/mutations/useDeleteAccount';
import { useAuthStore } from '../../../../store/auth.store';
import { Button } from '../../../../components/atoms/Button';
import { Spinner } from '../../../../components/atoms/Spinner';
import { ROUTES } from '../../../../constants/routes';

const inputClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const download = useDownload();
  const deleteAccount = useDeleteAccount();
  const [password, setPassword] = React.useState('');
  const [confirmText, setConfirmText] = React.useState('');

  const exportError = download.error;
  const exportMessage =
    exportError?.code === 'RATE_LIMITED'
      ? 'You can export your data 3 times a day. Please try again tomorrow.'
      : exportError?.message;

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    deleteAccount.mutate(
      { password: password || undefined, confirmText: 'DELETE' },
      {
        onSuccess: () => {
          clearAuth();
          queryClient.clear();
          router.replace(ROUTES.login);
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your data is yours: download it or delete it.
        </p>
      </div>

      <section
        aria-labelledby="export-title"
        className="space-y-3 rounded-xl border border-border-default border-t-4 border-t-border-accent bg-bg-surface p-5 shadow-sm"
      >
        <h2 id="export-title" className="text-base font-bold text-text-primary">
          Download my data
        </h2>
        <p className="text-sm text-text-secondary">
          A ZIP with everything we store about you as JSON, plus your applications as a CSV you can
          open in a spreadsheet. Available 3 times a day.
        </p>
        <Button
          variant="accent"
          onClick={() => download.mutate('account-zip')}
          disabled={download.isPending}
        >
          {download.isPending ? (
            <Spinner size="sm" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Download ZIP
        </Button>
        {exportMessage && (
          <p role="alert" className="text-xs text-text-danger">
            {exportMessage}
          </p>
        )}
      </section>

      <section
        aria-labelledby="danger-title"
        className="space-y-4 rounded-xl border border-border-danger bg-bg-danger-subtle p-5"
      >
        <h2 id="danger-title" className="text-base font-bold text-text-danger">
          Danger zone: delete my account
        </h2>
        <p className="text-sm text-text-primary">
          This permanently deletes your account and all your applications, notes, comments, options
          and private companies, and signs you out everywhere. It cannot be undone. Please download
          your data first.
        </p>
        <form onSubmit={handleDelete} className="max-w-md space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="delete-password"
              className="text-xs font-semibold uppercase text-text-secondary"
            >
              Password
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty if you only sign in with Google"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="delete-confirm"
              className="text-xs font-semibold uppercase text-text-secondary"
            >
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          {deleteAccount.isError && (
            <p role="alert" className="text-xs text-text-danger">
              {deleteAccount.error.message}
            </p>
          )}
          <Button
            type="submit"
            variant="danger"
            disabled={confirmText !== 'DELETE' || deleteAccount.isPending}
          >
            {deleteAccount.isPending ? (
              <Spinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            Delete my account permanently
          </Button>
        </form>
      </section>
    </div>
  );
}
