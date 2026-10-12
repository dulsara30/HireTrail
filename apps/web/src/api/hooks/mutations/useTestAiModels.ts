import { useMutation } from '@tanstack/react-query';
import { type AiHealthDto } from '@hiretrail/shared';
import { adminService } from '../../services/admin.service';
import { type ApiError } from '../../client/api-error';

export function useTestAiModels() {
  return useMutation<AiHealthDto, ApiError, void>({
    mutationFn: () => adminService.testAiModels(),
  });
}
