import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { ApplicationDto, MoveApplicationInput, BoardDto } from '@hiretrail/shared';

interface MoveApplicationParams {
  id: string;
  input: MoveApplicationInput;
}

export function useMoveApplication() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDto, Error, MoveApplicationParams, { previousBoard?: BoardDto }>({
    mutationFn: ({ id, input }) => applicationsService.move(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.all });
      const previousBoard = queryClient.getQueryData<BoardDto>(applicationKeys.board());

      if (previousBoard) {
        // Optimistic board update
        const newLanes = previousBoard.lanes.map((lane) => {
          const item = lane.items.find((i) => i.id === id);
          if (item && lane.status.id !== input.statusId) {
            // Remove from source lane
            return {
              ...lane,
              total: Math.max(0, lane.total - 1),
              items: lane.items.filter((i) => i.id !== id),
            };
          } else if (lane.status.id === input.statusId) {
            // Add to destination lane
            const movedItem = item || {
              id,
              statusId: input.statusId,
              companyName: '',
              roleTitle: '',
              statusCategory:
                (lane.status.meta?.category as import('@hiretrail/shared').StatusCategory) ||
                'SAVED',
              boardOrder: '',
              labelIds: [],
              lastActivityAt: new Date().toISOString(),
              version: input.version + 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            return {
              ...lane,
              total: lane.total + 1,
              items: [movedItem, ...lane.items],
            };
          }
          return lane;
        });

        queryClient.setQueryData(applicationKeys.board(), { lanes: newLanes });
      }

      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(applicationKeys.board(), context.previousBoard);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.board() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.activities(variables.id) });
    },
  });
}
