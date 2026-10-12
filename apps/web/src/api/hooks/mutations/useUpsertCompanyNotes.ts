import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { UpsertCompanyNotesInput } from '@hiretrail/shared';

export function useUpsertCompanyNotes(companyId: string, slug?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertCompanyNotesInput) => companiesService.upsertNotes(companyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
      if (slug) {
        queryClient.invalidateQueries({ queryKey: companyKeys.detail(slug) });
      }
    },
  });
}
