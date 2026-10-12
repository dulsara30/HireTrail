import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CompanyVerificationDto } from '@hiretrail/shared';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { type ApiError } from '../../client/api-error';

export function useVerifyCompany(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation<CompanyVerificationDto, ApiError, { force: boolean }>({
    mutationFn: ({ force }) => companiesService.verify(companyId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.verifications(companyId) });
      queryClient.invalidateQueries({ queryKey: companyKeys.details() });
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
