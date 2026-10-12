import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type OptionDto } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';
import { type ApiError } from '../../client/api-error';

export function useRestoreOption() {
  const queryClient = useQueryClient();
  return useMutation<OptionDto, ApiError, string>({
    mutationFn: (id) => optionsService.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: optionKeys.all }),
  });
}
