import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AdminEmailResultDto, type AdminSendEmailInput } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';
import { type ApiError } from '../../client/api-error';

export function useAdminSendEmail() {
  const queryClient = useQueryClient();
  return useMutation<AdminEmailResultDto, ApiError, AdminSendEmailInput>({
    mutationFn: (input) => adminService.sendEmail(input),
    // The send is written to the audit log
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'audit'] }),
  });
}
