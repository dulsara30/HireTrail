import { useInfiniteQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';

export function useAdminCompaniesInfinite(q: string) {
  return useInfiniteQuery({
    queryKey: adminKeys.companies(q),
    queryFn: ({ pageParam }) =>
      adminService.listCompanies({ q: q || undefined, cursor: (pageParam as string) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor || undefined,
  });
}
