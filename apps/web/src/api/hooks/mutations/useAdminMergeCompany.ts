import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AdminCompanyDto, type AdminMergeCompanyInput } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';
import { type ApiError } from '../../client/api-error';

export function useAdminMergeCompany() {
  const queryClient = useQueryClient();
  return useMutation<AdminCompanyDto, ApiError, { fromId: string; input: AdminMergeCompanyInput }>({
    mutationFn: ({ fromId, input }) => adminService.mergeCompany(fromId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
