import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';

export function useAdminCompany(id: string | null) {
  return useQuery({
    queryKey: adminKeys.company(id ?? ''),
    queryFn: () => adminService.getCompany(id as string),
    enabled: Boolean(id),
  });
}
