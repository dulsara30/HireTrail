import { useQuery } from '@tanstack/react-query';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';

export function useCompany(idOrSlug: string) {
  return useQuery({
    queryKey: companyKeys.detail(idOrSlug),
    queryFn: () => companiesService.getByIdOrSlug(idOrSlug),
    enabled: Boolean(idOrSlug),
  });
}
