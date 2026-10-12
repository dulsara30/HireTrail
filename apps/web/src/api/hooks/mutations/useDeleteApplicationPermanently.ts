import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { dashboardKeys } from '../../query-keys/dashboard.keys';
import { type ApiError } from '../../client/api-error';

/** Permanently deletes an application with its comments and history. It cannot be undone. */
export function useDeleteApplicationPermanently() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => applicationsService.deletePermanently(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
