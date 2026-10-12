import { useInfiniteQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';

export function useAuditLogsInfinite(action?: string) {
  return useInfiniteQuery({
    queryKey: adminKeys.audit({ action }),
    queryFn: ({ pageParam }) =>
      adminService.listAuditLogs({ action, cursor: (pageParam as string) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor || undefined,
  });
}
