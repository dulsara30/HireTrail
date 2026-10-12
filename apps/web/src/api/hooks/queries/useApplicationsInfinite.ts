import { useInfiniteQuery } from '@tanstack/react-query';
import { ListApplicationsQuery } from '@hiretrail/shared';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';

export function useApplicationsInfinite(params: Partial<ListApplicationsQuery> = {}) {
  return useInfiniteQuery({
    queryKey: applicationKeys.list(params),
    queryFn: ({ pageParam }) =>
      applicationsService.getList({
        ...params,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.page.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
