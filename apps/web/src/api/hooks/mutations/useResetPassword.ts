import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { ResetPasswordInput } from '@hiretrail/shared';

export function useResetPassword() {
  return useMutation<void, Error, ResetPasswordInput>({
    mutationFn: (input) => authService.resetPassword(input),
  });
}
