import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: adminKeys.user(id ?? ''),
    queryFn: () => adminService.getUser(id as string),
    enabled: Boolean(id),
  });
}
