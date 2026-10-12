import { useInfiniteQuery } from '@tanstack/react-query';
import { commentsService } from '../../services/comments.service';
import { applicationKeys } from '../../query-keys/applications.keys';

export function useActivitiesInfinite(
  applicationId: string | null,
  filter: 'history' | 'all' = 'all',
) {
  return useInfiniteQuery({
    queryKey: applicationId
      ? applicationKeys.activities(applicationId, filter)
      : ['activities', 'null'],
    queryFn: ({ pageParam }) =>
      applicationId
        ? commentsService.listActivities(applicationId, filter, pageParam as string | undefined, 20)
        : Promise.resolve({ items: [], page: { hasMore: false, limit: 20 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.page.nextCursor ?? undefined,
    enabled: Boolean(applicationId),
    staleTime: 30_000,
  });
}
