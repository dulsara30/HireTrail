import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { CreateApplicationInput, CreateApplicationResultDto } from '@hiretrail/shared';

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation<CreateApplicationResultDto, Error, CreateApplicationInput>({
    mutationFn: (input) => applicationsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.board() });
    },
  });
}
