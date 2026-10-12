import { useInfiniteQuery } from '@tanstack/react-query';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { ListCompaniesQuery } from '@hiretrail/shared';

export function useCompaniesInfinite(filters: Partial<ListCompaniesQuery> = {}) {
  const queryPayload: ListCompaniesQuery = {
    q: filters.q,
    region: filters.region,
    tier: filters.tier,
    verification: filters.verification,
    hasApplications: filters.hasApplications,
    limit: filters.limit ?? 20,
  };

  return useInfiniteQuery({
    queryKey: companyKeys.list(queryPayload),
    queryFn: ({ pageParam }) =>
      companiesService.list({
        ...queryPayload,
        cursor: (pageParam as string) || undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
}
