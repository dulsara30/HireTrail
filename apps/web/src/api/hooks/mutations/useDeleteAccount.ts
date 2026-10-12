import { useMutation } from '@tanstack/react-query';
import { type DeleteAccountInput } from '@hiretrail/shared';
import { meService } from '../../services/me.service';
import { type ApiError } from '../../client/api-error';

export function useDeleteAccount() {
  return useMutation<void, ApiError, DeleteAccountInput>({
    mutationFn: (input) => meService.deleteAccount(input),
  });
}
