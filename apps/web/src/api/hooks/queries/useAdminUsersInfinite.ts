import { useInfiniteQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';

export interface AdminUserFilters {
  q?: string;
  plan?: string;
  role?: string;
  status?: string;
}

export function useAdminUsersInfinite(filters: AdminUserFilters) {
  return useInfiniteQuery({
    queryKey: adminKeys.users(filters),
    queryFn: ({ pageParam }) =>
      adminService.listUsers({ ...filters, cursor: (pageParam as string) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor || undefined,
  });
}
