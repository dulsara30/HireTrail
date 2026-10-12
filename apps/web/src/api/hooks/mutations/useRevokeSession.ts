import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meService } from '../../services/me.service';
import { ME_KEYS } from '../../query-keys/me.keys';

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => meService.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEYS.sessions() });
    },
  });
}
