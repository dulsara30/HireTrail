import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AdminCompanyDetailDto, type AdminUpdateCompanyInput } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';
import { companyKeys } from '../../query-keys/companies.keys';
import { type ApiError } from '../../client/api-error';

export function useAdminUpdateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AdminCompanyDetailDto, ApiError, AdminUpdateCompanyInput>({
    mutationFn: (input) => adminService.updateCompany(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.company(id), data);
      // The admin and user company lists show the new details
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'companies'] });
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}
