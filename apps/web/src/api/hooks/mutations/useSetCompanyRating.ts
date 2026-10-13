import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type SetCompanyRatingInput, type UserCompanyNotesDto } from '@hiretrail/shared';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { adminKeys } from '../../query-keys/admin.keys';
import { type ApiError } from '../../client/api-error';

export function useSetCompanyRating(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation<UserCompanyNotesDto, ApiError, SetCompanyRatingInput>({
    mutationFn: (input) => companiesService.setRating(companyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.details() });
      queryClient.invalidateQueries({ queryKey: adminKeys.company(companyId) });
    },
  });
}
