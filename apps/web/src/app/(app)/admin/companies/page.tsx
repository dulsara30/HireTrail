'use client';

import React from 'react';
import { type AdminCompanyDto } from '@hiretrail/shared';
import { GitMerge, Search } from 'lucide-react';
import { useAdminCompaniesInfinite } from '../../../../api/hooks/queries/useAdminCompaniesInfinite';
import { useAdminMergeCompany } from '../../../../api/hooks/mutations/useAdminMergeCompany';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import { Badge } from '../../../../components/atoms/Badge';
import { Button } from '../../../../components/atoms/Button';
import { Spinner } from '../../../../components/atoms/Spinner';
import { EmptyState } from '../../../../components/molecules/EmptyState';

export default function AdminCompaniesPage() {
  const [search, setSearch] = React.useState('');
  const q = useDebouncedValue(search, 300);
  const [from, setFrom] = React.useState<AdminCompanyDto | null>(null);
  const [into, setInto] = React.useState<AdminCompanyDto | null>(null);
  const [reason, setReason] = React.useState('');
  const [result, setResult] = React.useState<string | null>(null);

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminCompaniesInfinite(q);
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    onLoadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });
  const companies = React.useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const merge = useAdminMergeCompany();

  const pick = (c: AdminCompanyDto) => {
    setResult(null);
    if (!from) setFrom(c);
    else if (!into && c.id !== from.id) setInto(c);
  };

  const canMerge = Boolean(from && into && reason.trim().length >= 5);

  const handleMerge = () => {
    if (!from || !into) return;
    merge.mutate(
      { fromId: from.id, input: { intoId: into.id, reason: reason.trim() } },
      {
        onSuccess: () => {
          setResult(`“${from.name}” was merged into “${into.name}”.`);
          setFrom(null);
          setInto(null);
          setReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <section
        aria-label="Merge duplicates"
        className="space-y-3 rounded-xl border border-border-accent bg-bg-accent-subtle p-4"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <GitMerge className="h-4 w-4 text-text-accent" aria-hidden="true" />
          Merge duplicate companies
        </h2>
        <p className="text-xs text-text-secondary">
          Pick the duplicate first, then the company to keep. Applications and personal notes move
          to the company you keep, and the duplicate&apos;s name becomes an alias.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-bg-surface p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase text-text-secondary">
              Duplicate (removed)
            </p>
            <p className="font-medium text-text-primary">
              {from?.name ?? 'Choose from the list below'}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-bg-surface p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase text-text-secondary">Keep</p>
            <p className="font-medium text-text-primary">
              {into?.name ?? 'Choose from the list below'}
            </p>
          </div>
        </div>
        <label htmlFor="merge-reason" className="sr-only">
          Reason for the merge
        </label>
        <input
          id="merge-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          placeholder="Reason (required, goes to the audit log)"
          className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
        {merge.isError && (
          <p role="alert" className="text-xs text-text-danger">
            {merge.error.message}
          </p>
        )}
        {result && (
          <p role="status" className="text-xs font-medium text-text-success">
            {result}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={!canMerge || merge.isPending}
            onClick={handleMerge}
          >
            {merge.isPending ? <Spinner size="sm" /> : 'Merge'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFrom(null);
              setInto(null);
            }}
          >
            Clear
          </Button>
        </div>
      </section>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search global companies"
          placeholder="Search global companies"
          className="w-full rounded-md border border-border-default bg-bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-text-danger">
          Failed to load companies.
        </p>
      ) : companies.length === 0 ? (
        <EmptyState title="No companies found" description="Try a different search." />
      ) : (
        <ul className="divide-y divide-border-default overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-sm">
          {companies.map((c) => {
            const selected = c.id === from?.id || c.id === into?.id;
            return (
              <li
                key={c.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${selected ? 'bg-bg-accent-subtle' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{c.name}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {c.website ?? c.country ?? ''}
                  </p>
                </div>
                {c.hasConflicts && <Badge color="orange">Conflicts</Badge>}
                {c.verificationScore !== null && (
                  <Badge color="info">Score {c.verificationScore}</Badge>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={selected || Boolean(from && into)}
                  onClick={() => pick(c)}
                >
                  {!from ? 'Set as duplicate' : 'Set as keep'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div ref={sentinelRef} className="flex justify-center py-2">
        {isFetchingNextPage && <Spinner size="sm" />}
      </div>
    </div>
  );
}
