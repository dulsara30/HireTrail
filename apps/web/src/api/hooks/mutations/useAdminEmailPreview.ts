import { useMutation } from '@tanstack/react-query';
import { type AdminEmailPreviewDto, type AdminEmailPreviewInput } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { type ApiError } from '../../client/api-error';

export function useAdminEmailPreview() {
  return useMutation<AdminEmailPreviewDto, ApiError, AdminEmailPreviewInput>({
    mutationFn: (input) => adminService.previewEmail(input),
  });
}
