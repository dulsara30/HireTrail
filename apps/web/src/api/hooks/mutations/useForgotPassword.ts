import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { ForgotPasswordInput } from '@hiretrail/shared';

export function useForgotPassword() {
  return useMutation<void, Error, ForgotPasswordInput>({
    mutationFn: (input) => authService.forgotPassword(input),
  });
}
