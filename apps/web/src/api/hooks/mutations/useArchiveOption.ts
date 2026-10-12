import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ArchiveOptionInput, type OptionDto } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';
import { applicationKeys } from '../../query-keys/applications.keys';
import { type ApiError } from '../../client/api-error';

export function useArchiveOption() {
  const queryClient = useQueryClient();
  return useMutation<OptionDto, ApiError, { id: string; input: ArchiveOptionInput }>({
    mutationFn: ({ id, input }) => optionsService.archive(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionKeys.all });
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
