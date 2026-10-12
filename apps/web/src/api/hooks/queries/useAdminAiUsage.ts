import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';

export function useAdminAiUsage(days: number) {
  return useQuery({
    queryKey: adminKeys.aiUsage(days),
    queryFn: () => adminService.getAiUsage(days),
  });
}
