'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useAdminUsersInfinite } from '../../../../api/hooks/queries/useAdminUsersInfinite';
import { useMe } from '../../../../api/hooks/queries/useMe';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useInfiniteScroll } from '../../../../hooks/useInfiniteScroll';
import { Badge } from '../../../../components/atoms/Badge';
import { Spinner } from '../../../../components/atoms/Spinner';
import { EmptyState } from '../../../../components/molecules/EmptyState';
import { PlanQuickButton } from '../../../../components/organisms/admin/PlanQuickButton';
import { UserDetailPanel } from '../../../../components/organisms/admin/UserDetailPanel';

const selectClass =
  'rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

export default function AdminUsersPage() {
  const { data: me } = useMe();
  const [search, setSearch] = React.useState('');
  const [plan, setPlan] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const q = useDebouncedValue(search, 300);

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminUsersInfinite({
      q: q || undefined,
      plan: plan || undefined,
      status: status || undefined,
    });
  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    onLoadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });
  const users = React.useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users by email or name"
            placeholder="Search by email or name"
            className="w-full rounded-md border border-border-default bg-bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
          />
        </div>
        <select
          aria-label="Filter by plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className={selectClass}
        >
          <option value="">All plans</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-text-danger">
          Failed to load users.
        </p>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-surface shadow-sm">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-border-default bg-bg-accent-subtle text-xs font-semibold uppercase text-text-accent">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Upgrade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-bg-accent-subtle">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(u.id)}
                      className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent rounded"
                    >
                      <span className="block font-medium text-text-primary">{u.name}</span>
                      <span className="block break-all text-xs text-text-secondary">{u.email}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={u.plan === 'PRO' ? 'accent' : 'neutral'}>{u.plan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={u.role === 'ADMIN' ? 'purple' : 'neutral'}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <PlanQuickButton user={u} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={sentinelRef} className="flex justify-center py-4">
            {isFetchingNextPage && <Spinner size="sm" />}
          </div>
        </div>
      )}

      {selected && (
        <UserDetailPanel
          userId={selected}
          currentAdminId={me?.id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
