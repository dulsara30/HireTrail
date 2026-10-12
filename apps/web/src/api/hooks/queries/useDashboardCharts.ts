import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { dashboardKeys } from '../../query-keys/dashboard.keys';

export function useDashboardCharts(range = '30d') {
  return useQuery({
    queryKey: dashboardKeys.chart(range),
    queryFn: () => dashboardService.getCharts(range),
  });
}
