import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';
import { moveCardInBoard } from '../../../utils/helpers/board-move';
import { type ApplicationDto, type BoardDto, type MoveApplicationInput } from '@hiretrail/shared';

interface MoveApplicationParams {
  id: string;
  input: MoveApplicationInput;
}

type BoardSnapshot = Array<[QueryKey, BoardDto | undefined]>;

/** Every cached board, whatever filters it was loaded with (search, priority, work mode, source). */
const BOARDS_FILTER = { queryKey: applicationKeys.boards() };

export function useMoveApplication() {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDto, Error, MoveApplicationParams, { snapshot: BoardSnapshot }>({
    mutationFn: ({ id, input }) => applicationsService.move(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries(BOARDS_FILTER);
      const snapshot = queryClient.getQueriesData<BoardDto>(BOARDS_FILTER);

      // The card moves on every cached board at once, so it lands in the new lane on drop
      queryClient.setQueriesData<BoardDto>(BOARDS_FILTER, (board) =>
        board ? moveCardInBoard(board, id, input.statusId) : board,
      );

      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: (_data, _error, variables) => {
      // The server copy (order, version, history) replaces the optimistic one
      queryClient.invalidateQueries(BOARDS_FILTER);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(variables.id) });
    },
  });
}
