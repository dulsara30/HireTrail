import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { moveCardInBoard } from '../../../utils/helpers/board-move';
import { type ApplicationDto, type BoardDto, type UpdateApplicationInput } from '@hiretrail/shared';

interface UpdateApplicationFieldParams {
  id: string;
  input: UpdateApplicationInput;
}

type BoardSnapshot = Array<[QueryKey, BoardDto | undefined]>;

export function useUpdateApplicationField() {
  const queryClient = useQueryClient();
  const boardsFilter = { queryKey: applicationKeys.boards() };

  return useMutation<
    ApplicationDto,
    Error,
    UpdateApplicationFieldParams,
    { snapshot: BoardSnapshot }
  >({
    mutationFn: ({ id, input }) => applicationsService.update(id, input),
    onMutate: async ({ id, input }) => {
      // A status change from the side panel moves the card on the board right away
      if (!input.statusId) return { snapshot: [] };
      await queryClient.cancelQueries(boardsFilter);
      const snapshot = queryClient.getQueriesData<BoardDto>(boardsFilter);
      const statusId = input.statusId;
      queryClient.setQueriesData<BoardDto>(boardsFilter, (board) =>
        board ? moveCardInBoard(board, id, statusId) : board,
      );
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(applicationKeys.detail(variables.id), data);
    },
    onSettled: (_data, _error, variables) => {
      // Every cached board and list is refreshed, whatever filters it uses
      queryClient.invalidateQueries(boardsFilter);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.activities(variables.id) });
    },
  });
}
