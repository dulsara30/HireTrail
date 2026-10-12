import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ImportCommitInput, type ImportResultDto } from '@hiretrail/shared';
import { dataTransferService } from '../../services/data-transfer.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { optionKeys } from '../../query-keys/options.keys';
import { type ApiError } from '../../client/api-error';

export function useImportCommit() {
  const queryClient = useQueryClient();
  return useMutation<ImportResultDto, ApiError, ImportCommitInput>({
    mutationFn: (input) => dataTransferService.commitImport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: optionKeys.all });
    },
  });
}
