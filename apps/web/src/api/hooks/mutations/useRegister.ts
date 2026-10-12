import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../../store/auth.store';
import { RegisterInput, AuthTokensDto } from '@hiretrail/shared';
import { ME_KEYS } from '../../query-keys/me.keys';

export function useRegister() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const queryClient = useQueryClient();

  return useMutation<AuthTokensDto, Error, RegisterInput>({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      queryClient.invalidateQueries({ queryKey: ME_KEYS.profile() });
    },
  });
}
