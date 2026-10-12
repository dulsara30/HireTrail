import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import {
  ApplicationDto,
  ApplicationListItemDto,
  MoveApplicationInput,
  BoardDto,
  StatusCategory,
} from '@hiretrail/shared';

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
        // Optimistic board update: take the real card from wherever it is, keep every field
        const moving = previousBoard.lanes.flatMap((l) => l.items).find((i) => i.id === id);
        const newLanes = previousBoard.lanes.map((lane) => {
          const isSource = lane.items.some((i) => i.id === id);
          const isTarget = lane.status.id === input.statusId;
          if (isSource && isTarget) return lane;
          if (isSource) {
            return {
              ...lane,
              total: Math.max(0, lane.total - 1),
              items: lane.items.filter((i) => i.id !== id),
            };
          }
          if (isTarget && moving) {
            const category =
              (lane.status.meta?.category as StatusCategory) || moving.statusCategory;
            const movedItem: ApplicationListItemDto = {
              ...moving,
              statusId: input.statusId,
              statusCategory: category,
              resolvedStatus: lane.status,
              version: moving.version + 1,
            };
            return { ...lane, total: lane.total + 1, items: [movedItem, ...lane.items] };
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
