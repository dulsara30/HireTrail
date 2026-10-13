import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type AdminCompanyDetailDto, type AdminCreateCompanyInput } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { adminKeys } from '../../query-keys/admin.keys';
import { companyKeys } from '../../query-keys/companies.keys';
import { type ApiError } from '../../client/api-error';

export function useAdminCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation<AdminCompanyDetailDto, ApiError, AdminCreateCompanyInput>({
    mutationFn: (input) => adminService.createCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'companies'] });
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}
