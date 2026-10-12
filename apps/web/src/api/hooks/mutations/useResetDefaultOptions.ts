import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type OptionDto, type OptionType } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';
import { type ApiError } from '../../client/api-error';

export function useResetDefaultOptions() {
  const queryClient = useQueryClient();
  return useMutation<OptionDto[], ApiError, OptionType>({
    mutationFn: (type) => optionsService.resetDefaults({ type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: optionKeys.all }),
  });
}
