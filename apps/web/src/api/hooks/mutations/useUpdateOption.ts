import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type OptionDto, type UpdateOptionInput } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';
import { type ApiError } from '../../client/api-error';

export function useUpdateOption() {
  const queryClient = useQueryClient();
  return useMutation<OptionDto, ApiError, { id: string; input: UpdateOptionInput }>({
    mutationFn: ({ id, input }) => optionsService.update(id, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: optionKeys.all }),
  });
}
