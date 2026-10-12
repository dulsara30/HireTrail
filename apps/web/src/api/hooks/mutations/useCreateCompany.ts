import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CompanyDto, type CreateCompanyInput } from '@hiretrail/shared';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { type ApiError } from '../../client/api-error';

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation<CompanyDto, ApiError, CreateCompanyInput>({
    mutationFn: (input) => companiesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}
