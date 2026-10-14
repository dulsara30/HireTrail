import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import {
  type CreateOrbitTaskInput,
  type OrbitTaskDto,
  type OrbitTimelineDto,
  type UpdateOrbitTaskInput,
} from '@hiretrail/shared';
import { orbitService } from '../../services/orbit.service';
import { orbitKeys } from '../../query-keys/orbit.keys';
import { type ApiError } from '../../client/api-error';
import {
  patchTaskPages,
  patchTimeline,
  type TaskPages,
  type TaskPatch,
} from '../../../utils/helpers/orbit/orbit-cache';

/** Everything that depends on the items is refreshed from the server after a change. */
export function invalidateOrbit(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: orbitKeys.all });
}

type Snapshot = Array<[QueryKey, unknown]>;

/** Applies a change to every cached list and timeline at once, and returns what was there before. */
async function applyToCaches(
  queryClient: QueryClient,
  id: string,
  patch: TaskPatch,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: orbitKeys.all });
  const snapshot: Snapshot = [
    ...queryClient.getQueriesData({ queryKey: orbitKeys.timelines() }),
    ...queryClient.getQueriesData({ queryKey: [...orbitKeys.tasks(), 'list'] }),
  ];
  queryClient.setQueriesData<OrbitTimelineDto>({ queryKey: orbitKeys.timelines() }, (data) =>
    data ? patchTimeline(data, id, patch) : data,
  );
  queryClient.setQueriesData<InfiniteData<unknown>>(
    { queryKey: [...orbitKeys.tasks(), 'list'] },
    (data) =>
      data ? (patchTaskPages(data as TaskPages, id, patch) as InfiniteData<unknown>) : data,
  );
  return snapshot;
}

function restore(queryClient: QueryClient, snapshot: Snapshot | undefined): void {
  for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
}

export function useCreateOrbitTask() {
  const queryClient = useQueryClient();
  return useMutation<OrbitTaskDto, ApiError, CreateOrbitTaskInput>({
    mutationFn: (input) => orbitService.createTask(input),
    onSettled: () => void invalidateOrbit(queryClient),
  });
}

export function useUpdateOrbitTask() {
  const queryClient = useQueryClient();
  return useMutation<OrbitTaskDto, ApiError, { id: string; input: UpdateOrbitTaskInput }>({
    mutationFn: ({ id, input }) => orbitService.updateTask(id, input),
    onSuccess: (task) => queryClient.setQueryData(orbitKeys.task(task.id), task),
    onSettled: () => void invalidateOrbit(queryClient),
  });
}

/** Done at once on screen, and put back if the server says no. */
export function useCompleteOrbitTask() {
  const queryClient = useQueryClient();
  return useMutation<
    { task: OrbitTaskDto; next: OrbitTaskDto | null },
    ApiError,
    { id: string; version: number },
    { snapshot: Snapshot }
  >({
    mutationFn: ({ id, version }) => orbitService.completeTask(id, version),
    onMutate: async ({ id }) => ({
      snapshot: await applyToCaches(queryClient, id, {
        status: 'DONE',
        completedAt: new Date().toISOString(),
      }),
    }),
    onError: (_e, _v, context) => restore(queryClient, context?.snapshot),
    onSettled: () => void invalidateOrbit(queryClient),
  });
}

export function useReopenOrbitTask() {
  const queryClient = useQueryClient();
  return useMutation<
    OrbitTaskDto,
    ApiError,
    { id: string; version: number },
    { snapshot: Snapshot }
  >({
    mutationFn: ({ id, version }) => orbitService.reopenTask(id, version),
    onMutate: async ({ id }) => ({
      snapshot: await applyToCaches(queryClient, id, { status: 'OPEN', completedAt: null }),
    }),
    onError: (_e, _v, context) => restore(queryClient, context?.snapshot),
    onSettled: () => void invalidateOrbit(queryClient),
  });
}

export function useSnoozeOrbitTask() {
  const queryClient = useQueryClient();
  return useMutation<OrbitTaskDto, ApiError, { id: string; until: Date; version: number }>({
    mutationFn: ({ id, until, version }) =>
      orbitService.snoozeTask(id, until.toISOString(), version),
    onSettled: () => void invalidateOrbit(queryClient),
  });
}

/** Removed at once on screen, and put back if the server says no. */
export function useDeleteOrbitTask() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string, { snapshot: Snapshot }>({
    mutationFn: (id) => orbitService.deleteTask(id),
    onMutate: async (id) => ({ snapshot: await applyToCaches(queryClient, id, null) }),
    onError: (_e, _v, context) => restore(queryClient, context?.snapshot),
    onSettled: () => void invalidateOrbit(queryClient),
  });
}
