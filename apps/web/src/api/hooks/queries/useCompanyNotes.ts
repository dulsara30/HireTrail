import { useQuery } from '@tanstack/react-query';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';

/** The signed-in user's own notes about one company. */
export function useCompanyNotes(companyId: string) {
  return useQuery({
    queryKey: companyKeys.notes(companyId),
    queryFn: () => companiesService.listNotes(companyId),
    enabled: Boolean(companyId),
  });
}
