import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type InsightsDto } from '@hiretrail/shared';
import { dataTransferService } from '../../services/data-transfer.service';
import { insightsKeys } from '../../query-keys/admin.keys';
import { type ApiError } from '../../client/api-error';

export function useRefreshInsights() {
  const queryClient = useQueryClient();
  return useMutation<InsightsDto, ApiError, void>({
    mutationFn: () => dataTransferService.refreshInsights(),
    onSuccess: (data) => queryClient.setQueryData(insightsKeys.all, data),
  });
}
