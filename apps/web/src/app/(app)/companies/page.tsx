'use client';

import React from 'react';
import Link from 'next/link';
import { useCompaniesInfinite } from '../../../api/hooks/queries/useCompaniesInfinite';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { Input } from '../../../components/atoms/Input';
import { Badge } from '../../../components/atoms/Badge';
import { Spinner } from '../../../components/atoms/Spinner';
import { EmptyState } from '../../../components/molecules/EmptyState';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { ROUTES } from '../../../constants/routes';
import { CompanySummaryDto } from '@hiretrail/shared';
import { Search, Building2, MapPin } from 'lucide-react';

import { useMe } from '../../../api/hooks/queries/useMe';
import { useRouter } from 'next/navigation';
import { CompanyLookupCard } from '../../../components/organisms/companies/CompanyLookupCard';

export default function CompaniesPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useMe();

  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  React.useEffect(() => {
    if (!isUserLoading && user && user.role !== 'ADMIN') {
      router.replace(ROUTES.dashboard);
    }
  }, [user, isUserLoading, router]);

  const [regionFilter, setRegionFilter] = React.useState<'LOCAL' | 'FOREIGN' | undefined>(
    undefined,
  );
  const [tierFilter, setTierFilter] = React.useState<'A' | 'B' | undefined>(undefined);
  const [hasAppsFilter, setHasAppsFilter] = React.useState<'true' | 'false' | undefined>(undefined);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCompaniesInfinite({
      q: debouncedSearch || undefined,
      region: regionFilter,
      tier: tierFilter,
      hasApplications: hasAppsFilter,
    });

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    onLoadMore: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const allCompanies: CompanySummaryDto[] = React.useMemo(() => {
    return data?.pages.flatMap((p: { items: CompanySummaryDto[] }) => p.items) || [];
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Companies Directory
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Explore verified employers, job research profiles, and personal company records.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-bg-surface border border-border-default rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            placeholder="Search by company name, aliases, or tech stack..."
            className="pl-9 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Region filter */}
          <div className="flex items-center rounded-lg border border-border-default bg-bg-canvas p-1">
            <button
              onClick={() => setRegionFilter(undefined)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                regionFilter === undefined
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All Regions
            </button>
            <button
              onClick={() => setRegionFilter('LOCAL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                regionFilter === 'LOCAL'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Local
            </button>
            <button
              onClick={() => setRegionFilter('FOREIGN')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                regionFilter === 'FOREIGN'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Foreign
            </button>
          </div>

          {/* Tier filter */}
          <div className="flex items-center rounded-lg border border-border-default bg-bg-canvas p-1">
            <button
              onClick={() => setTierFilter(undefined)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                tierFilter === undefined
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setTierFilter('A')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                tierFilter === 'A'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Tier A
            </button>
            <button
              onClick={() => setTierFilter('B')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                tierFilter === 'B'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Tier B
            </button>
          </div>

          {/* Has Applications filter */}
          <div className="flex items-center rounded-lg border border-border-default bg-bg-canvas p-1">
            <button
              onClick={() => setHasAppsFilter(undefined)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                hasAppsFilter === undefined
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHasAppsFilter('true')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                hasAppsFilter === 'true'
                  ? 'bg-bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Applied Only
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading && allCompanies.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="md" />
          <p className="text-sm text-text-secondary">Loading companies directory...</p>
        </div>
      ) : isError && allCompanies.length === 0 ? (
        <div className="p-8 text-center bg-bg-surface border border-border-default rounded-xl">
          <p className="text-sm text-text-danger">Failed to load companies.</p>
        </div>
      ) : allCompanies.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No companies found"
            description={
              debouncedSearch
                ? `No companies matched "${debouncedSearch}". Try adjusting your filters.`
                : 'No companies match the current filter criteria.'
            }
          />
          {debouncedSearch.length >= 2 && <CompanyLookupCard name={debouncedSearch} />}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCompanies.map((c: CompanySummaryDto) => (
            <Link
              key={c.id}
              href={ROUTES.company(c.slug || c.id)}
              className="group block p-5 bg-bg-surface border border-border-default rounded-xl hover:border-border-focus hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-bg-surface-raised border border-border-default flex items-center justify-center text-text-secondary group-hover:text-text-accent group-hover:border-accent-500/30 transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base text-text-primary truncate group-hover:text-text-accent transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-text-tertiary truncate">
                      {c.domain || 'Direct profile'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {c.tier && (
                    <Badge color={c.tier === 'A' ? 'accent' : 'neutral'}>Tier {c.tier}</Badge>
                  )}
                  {c.isGlobal ? (
                    <span className="text-[10px] text-text-tertiary font-medium">Directory</span>
                  ) : (
                    <span className="text-[10px] text-text-accent font-medium">Private</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-text-tertiary" />
                  <span className="truncate">{c.location || c.region || 'Worldwide'}</span>
                </div>

                {c.hasApplications && <Badge color="success">Applied</Badge>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel and Load More fallback */}
      <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-2">
        {isFetchingNextPage && <Spinner size="sm" />}
        {hasNextPage && !isFetchingNextPage && (
          <button
            onClick={() => fetchNextPage()}
            className="text-xs font-medium text-text-secondary hover:text-text-primary px-4 py-2 border border-border-default rounded-lg hover:bg-bg-surface transition-colors cursor-pointer"
          >
            Load more companies
          </button>
        )}
      </div>
    </div>
  );
}
