import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AdminChangeStatusInput, type AdminUserDto } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';
import { type ApiError } from '../../client/api-error';

export function useAdminChangeStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AdminUserDto, ApiError, AdminChangeStatusInput>({
    mutationFn: (input) => adminService.changeStatus(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
