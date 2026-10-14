import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateOrbitSpaceInput,
  type OrbitSettingsDto,
  type OrbitSpaceDto,
  type UpdateOrbitSettingsInput,
  type UpdateOrbitSpaceInput,
} from '@hiretrail/shared';
import { orbitService } from '../../services/orbit.service';
import { orbitKeys } from '../../query-keys/orbit.keys';
import { type ApiError } from '../../client/api-error';

export function useCreateOrbitSpace() {
  const queryClient = useQueryClient();
  return useMutation<OrbitSpaceDto, ApiError, CreateOrbitSpaceInput>({
    mutationFn: (input) => orbitService.createSpace(input),
    onSuccess: (space) =>
      queryClient.setQueryData<OrbitSpaceDto[]>(orbitKeys.spaces(), (spaces) => [
        ...(spaces ?? []),
        space,
      ]),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: orbitKeys.plan() }),
  });
}

/**
 * Saves a layout or a name. The screen already shows the new layout; the saved copy (with its new
 * version) replaces the cached one, so the next save sends the right version.
 */
export function useUpdateOrbitSpace() {
  const queryClient = useQueryClient();
  return useMutation<OrbitSpaceDto, ApiError, { id: string; input: UpdateOrbitSpaceInput }>({
    mutationFn: ({ id, input }) => orbitService.updateSpace(id, input),
    onSuccess: (space) =>
      queryClient.setQueryData<OrbitSpaceDto[]>(orbitKeys.spaces(), (spaces) =>
        (spaces ?? []).map((s) => (s.id === space.id ? space : s)),
      ),
    onError: (error) => {
      // A newer copy exists somewhere else: reload it
      if (error.code === 'CONFLICT')
        void queryClient.invalidateQueries({ queryKey: orbitKeys.spaces() });
    },
  });
}

export function useDeleteOrbitSpace() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => orbitService.deleteSpace(id),
    onSuccess: (_data, id) =>
      queryClient.setQueryData<OrbitSpaceDto[]>(orbitKeys.spaces(), (spaces) =>
        (spaces ?? []).filter((s) => s.id !== id),
      ),
  });
}

export function useUpdateOrbitSettings() {
  const queryClient = useQueryClient();
  return useMutation<OrbitSettingsDto, ApiError, UpdateOrbitSettingsInput>({
    mutationFn: (input) => orbitService.updateSettings(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(orbitKeys.settings(), settings);
      void queryClient.invalidateQueries({ queryKey: [...orbitKeys.all, 'pulse'] });
    },
  });
}
