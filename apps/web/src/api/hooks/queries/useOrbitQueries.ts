import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { type ListOrbitTasksQuery } from '@hiretrail/shared';
import { orbitService } from '../../services/orbit.service';
import { orbitKeys } from '../../query-keys/orbit.keys';

export function useOrbitTasksInfinite(query: Partial<ListOrbitTasksQuery>) {
  return useInfiniteQuery({
    queryKey: orbitKeys.list(query),
    queryFn: ({ pageParam }) =>
      orbitService.listTasks({ ...query, cursor: pageParam as string | undefined, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.page.nextCursor ?? undefined,
    staleTime: 15_000,
  });
}

export function useOrbitTask(id: string | null) {
  return useQuery({
    queryKey: orbitKeys.task(id ?? ''),
    queryFn: () => orbitService.getTask(id as string),
    enabled: Boolean(id),
  });
}

/** Items and application dates between two moments. Pass day-aligned dates so the cache key stays stable. */
export function useOrbitTimeline(from: Date, to: Date) {
  const f = from.toISOString();
  const t = to.toISOString();
  return useQuery({
    queryKey: orbitKeys.timeline(f, t),
    queryFn: () => orbitService.getTimeline(f, t),
    staleTime: 20_000,
    placeholderData: (previous) => previous,
  });
}

export function useOrbitPulse() {
  const tzOffset = -new Date().getTimezoneOffset();
  return useQuery({
    queryKey: orbitKeys.pulse(tzOffset),
    queryFn: () => orbitService.getPulse(tzOffset),
    staleTime: 30_000,
  });
}

/** Polled every minute so the bell and the toast stay current. */
export function useOrbitDue() {
  return useQuery({
    queryKey: orbitKeys.due(),
    queryFn: () => orbitService.getDue(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useOrbitPlan() {
  return useQuery({
    queryKey: orbitKeys.plan(),
    queryFn: () => orbitService.getPlan(),
    staleTime: 30_000,
  });
}

export function useOrbitSpaces() {
  return useQuery({
    queryKey: orbitKeys.spaces(),
    queryFn: () => orbitService.listSpaces(),
    staleTime: 60_000,
  });
}

export function useOrbitSettings() {
  return useQuery({
    queryKey: orbitKeys.settings(),
    queryFn: () => orbitService.getSettings(),
    staleTime: 60_000,
  });
}
