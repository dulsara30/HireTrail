import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { dashboardKeys } from '../../query-keys/dashboard.keys';

export function useDashboardSummary(range = '30d') {
  return useQuery({
    queryKey: dashboardKeys.summary(range),
    queryFn: () => dashboardService.getSummary(range),
  });
}
