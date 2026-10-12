import { useQuery } from '@tanstack/react-query';
import { dataTransferService } from '../../services/data-transfer.service';
import { insightsKeys } from '../../query-keys/admin.keys';

export function useInsights(enabled: boolean) {
  return useQuery({
    queryKey: insightsKeys.all,
    queryFn: () => dataTransferService.getInsights(),
    enabled,
  });
}
