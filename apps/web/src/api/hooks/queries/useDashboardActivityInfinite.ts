import { useInfiniteQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { dashboardKeys } from '../../query-keys/dashboard.keys';

export function useDashboardActivityInfinite() {
  return useInfiniteQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: ({ pageParam }) => dashboardService.getActivity(pageParam || undefined, 10),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
}
