import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { ApplicationDto, UpdateApplicationInput } from '@hiretrail/shared';

interface UpdateApplicationFieldParams {
  id: string;
  input: UpdateApplicationInput;
}

export function useUpdateApplicationField() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDto, Error, UpdateApplicationFieldParams>({
    mutationFn: ({ id, input }) => applicationsService.update(id, input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(applicationKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.board() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.activities(variables.id) });
    },
  });
}
