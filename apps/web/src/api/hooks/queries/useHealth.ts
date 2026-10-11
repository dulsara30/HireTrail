import { useQuery } from '@tanstack/react-query';
import { type HealthDto } from '@hiretrail/shared';
import { healthKeys } from '../../query-keys/health.keys';
import { healthService } from '../../services/health.service';

export function useHealth() {
  return useQuery<HealthDto>({
    queryKey: healthKeys.status(),
    queryFn: healthService.getHealth,
    staleTime: 30000,
    retry: 1,
  });
}
