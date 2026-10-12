import { useQuery } from '@tanstack/react-query';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';

export function useCompanyVerifications(companyId: string | null | undefined) {
  return useQuery({
    queryKey: companyKeys.verifications(companyId ?? ''),
    queryFn: () => companiesService.listVerifications(companyId as string),
    enabled: Boolean(companyId),
  });
}
