import { describe, expect, it } from 'vitest';
import { type ApplicationListItemDto, type BoardDto } from '@hiretrail/shared';
import { moveCardInBoard } from './board-move';

const status = (id: string, category?: string) =>
  ({ id, label: id, meta: category ? { category } : undefined }) as never;

const card = (id: string, statusId: string): ApplicationListItemDto =>
  ({
    id,
    statusId,
    statusCategory: 'ACTIVE',
    resolvedStatus: status(statusId),
    version: 2,
  }) as unknown as ApplicationListItemDto;

const board = (): BoardDto =>
  ({
    lanes: [
      { status: status('a'), total: 2, items: [card('1', 'a'), card('2', 'a')] },
      { status: status('b', 'CLOSED'), total: 1, items: [card('3', 'b')] },
    ],
  }) as unknown as BoardDto;

describe('moveCardInBoard', () => {
  it('moves the card to the top of the target lane and updates both totals', () => {
    const next = moveCardInBoard(board(), '1', 'b');
    expect(next.lanes[0]!.items.map((i) => i.id)).toEqual(['2']);
    expect(next.lanes[0]!.total).toBe(1);
    expect(next.lanes[1]!.items.map((i) => i.id)).toEqual(['1', '3']);
    expect(next.lanes[1]!.total).toBe(2);
  });

  it('updates status fields and bumps the version of the moved card', () => {
    const moved = moveCardInBoard(board(), '1', 'b').lanes[1]!.items[0]!;
    expect(moved.statusId).toBe('b');
    expect(moved.statusCategory).toBe('CLOSED');
    expect(moved.version).toBe(3);
  });

  it('does not change the original board', () => {
    const original = board();
    moveCardInBoard(original, '1', 'b');
    expect(original.lanes[0]!.items).toHaveLength(2);
  });

  it('returns the same board when the card is missing, already in the lane, or the lane is unknown', () => {
    const original = board();
    expect(moveCardInBoard(original, 'nope', 'b')).toBe(original);
    expect(moveCardInBoard(original, '1', 'a')).toBe(original);
    expect(moveCardInBoard(original, '1', 'zzz')).toBe(original);
  });
});
