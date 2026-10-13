import { useMutation } from '@tanstack/react-query';
import { type CompanyLookupDto, type CompanyLookupRequestInput } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { type ApiError } from '../../client/api-error';

/** Public-web lookup of a company profile, for admins adding a company to the directory. */
export function useAdminCompanyLookup() {
  return useMutation<CompanyLookupDto, ApiError, CompanyLookupRequestInput>({
    mutationFn: (input) => adminService.lookupCompany(input),
  });
}
