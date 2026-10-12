import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CompanyDto, type VerifiableField } from '@hiretrail/shared';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { type ApiError } from '../../client/api-error';

export function useApplySuggestions(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation<CompanyDto, ApiError, { verificationId: string; fields: VerifiableField[] }>({
    mutationFn: ({ verificationId, fields }) =>
      companiesService.applySuggestions(companyId, verificationId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.details() });
      queryClient.invalidateQueries({ queryKey: companyKeys.verifications(companyId) });
    },
  });
}
