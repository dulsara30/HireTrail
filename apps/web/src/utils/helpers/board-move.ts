import { type ApplicationListItemDto, type BoardDto, type StatusCategory } from '@hiretrail/shared';

/**
 * Returns a copy of the board with one card moved to the top of another lane.
 * The board is returned unchanged when the card is not on it or is already in that lane,
 * so a filtered board that does not contain the card is left alone.
 */
export function moveCardInBoard(board: BoardDto, id: string, targetStatusId: string): BoardDto {
  const moving = board.lanes.flatMap((lane) => lane.items).find((item) => item.id === id);
  const target = board.lanes.find((lane) => lane.status.id === targetStatusId);
  if (!moving || !target || moving.statusId === targetStatusId) return board;

  const category = (target.status.meta?.category as StatusCategory) || moving.statusCategory;
  const movedItem: ApplicationListItemDto = {
    ...moving,
    statusId: targetStatusId,
    statusCategory: category,
    resolvedStatus: target.status,
    version: moving.version + 1,
  };

  return {
    ...board,
    lanes: board.lanes.map((lane) => {
      if (lane.status.id === targetStatusId) {
        return { ...lane, total: lane.total + 1, items: [movedItem, ...lane.items] };
      }
      if (lane.items.some((item) => item.id === id)) {
        return {
          ...lane,
          total: Math.max(0, lane.total - 1),
          items: lane.items.filter((item) => item.id !== id),
        };
      }
      return lane;
    }),
  };
}
