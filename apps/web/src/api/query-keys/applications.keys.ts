import { ListApplicationsQuery, BoardQuery } from '@hiretrail/shared';

export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: Partial<ListApplicationsQuery>) => [...applicationKeys.lists(), params] as const,
  /** Prefix of every cached board, whatever filters it was loaded with. */
  boards: () => [...applicationKeys.all, 'board'] as const,
  board: (query?: BoardQuery) => [...applicationKeys.all, 'board', query] as const,
  lane: (statusId: string, query?: Record<string, unknown>) =>
    [...applicationKeys.all, 'lane', statusId, query] as const,

  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
  comments: (id: string) => [...applicationKeys.detail(id), 'comments'] as const,
  activities: (id: string, filter?: string) =>
    [...applicationKeys.detail(id), 'activities', filter] as const,
};
