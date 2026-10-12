import { useMutation } from '@tanstack/react-query';
import { type CompanyLookupDto, type CompanyLookupRequestInput } from '@hiretrail/shared';
import { companiesService } from '../../services/companies.service';
import { type ApiError } from '../../client/api-error';

export function useCompanyAiLookup() {
  return useMutation<CompanyLookupDto, ApiError, CompanyLookupRequestInput>({
    mutationFn: (input) => companiesService.aiLookup(input),
  });
}
