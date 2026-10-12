import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CreateOptionInput, type OptionDto } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';
import { type ApiError } from '../../client/api-error';

export function useCreateOption() {
  const queryClient = useQueryClient();
  return useMutation<OptionDto, ApiError, CreateOptionInput>({
    mutationFn: (input) => optionsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionKeys.all });
    },
  });
}
