'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMe } from '../../../api/hooks/queries/useMe';
import { Spinner } from '../../../components/atoms/Spinner';
import { ROUTES } from '../../../constants/routes';

const TABS = [
  { label: 'Users', href: ROUTES.admin.users },
  { label: 'Companies', href: ROUTES.admin.companies },
  { label: 'Audit log', href: ROUTES.admin.audit },
  { label: 'AI usage', href: ROUTES.admin.aiUsage },
];

/** ADMIN only in the UI; the API enforces the same rule on every /admin route. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isLoading } = useMe();

  React.useEffect(() => {
    if (!isLoading && me && me.role !== 'ADMIN') router.replace(ROUTES.dashboard);
  }, [me, isLoading, router]);

  if (isLoading || !me || me.role !== 'ADMIN') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Admin</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Account metadata and shared data only. Applications, notes and comments are never shown
          here.
        </p>
      </div>

      <nav
        aria-label="Admin sections"
        className="flex flex-wrap gap-1.5 rounded-xl border border-border-default bg-bg-surface p-1.5 shadow-sm"
      >
        {TABS.map((t) => {
          const active = pathname?.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-bg-accent text-text-primary shadow-sm'
                  : 'text-text-secondary hover:bg-bg-accent-subtle hover:text-text-primary'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
