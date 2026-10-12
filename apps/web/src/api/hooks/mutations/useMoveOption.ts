import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type MoveOptionInput, type OptionDto } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';
import { type ApiError } from '../../client/api-error';

export function useMoveOption() {
  const queryClient = useQueryClient();
  return useMutation<OptionDto, ApiError, { id: string; input: MoveOptionInput }>({
    mutationFn: ({ id, input }) => optionsService.move(id, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: optionKeys.all }),
  });
}
