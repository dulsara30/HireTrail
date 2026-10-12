import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AdminChangePlanInput, type AdminUserDto } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';
import { type ApiError } from '../../client/api-error';

export function useAdminChangePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AdminUserDto, ApiError, AdminChangePlanInput>({
    mutationFn: (input) => adminService.changePlan(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
