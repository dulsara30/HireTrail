import { useQuery } from '@tanstack/react-query';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';

/** Companies the user can see (global directory + own private ones) matching the search text. */
export function useCompanySearch(q: string, enabled = true) {
  return useQuery({
    queryKey: companyKeys.search(q),
    queryFn: () => companiesService.search(q || undefined, 8),
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}
