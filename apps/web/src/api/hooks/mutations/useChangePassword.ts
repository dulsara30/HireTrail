import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meService } from '../../services/me.service';
import { ChangePasswordInput } from '@hiretrail/shared';
import { ME_KEYS } from '../../query-keys/me.keys';

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ChangePasswordInput>({
    mutationFn: (input) => meService.changePassword(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEYS.sessions() });
    },
  });
}
