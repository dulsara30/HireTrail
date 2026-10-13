import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CompanyNoteDto,
  type CreateCompanyNoteInput,
  type UpdateCompanyNoteInput,
} from '@hiretrail/shared';
import { companiesService } from '../../services/companies.service';
import { companyKeys } from '../../query-keys/companies.keys';
import { type ApiError } from '../../client/api-error';

export function useCreateCompanyNote(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation<CompanyNoteDto, ApiError, CreateCompanyNoteInput>({
    mutationFn: (input) => companiesService.createNote(companyId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.notes(companyId) }),
  });
}

export function useUpdateCompanyNote(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation<CompanyNoteDto, ApiError, { noteId: string; input: UpdateCompanyNoteInput }>({
    mutationFn: ({ noteId, input }) => companiesService.updateNote(companyId, noteId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.notes(companyId) }),
  });
}

export function useDeleteCompanyNote(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string, { previous?: CompanyNoteDto[] }>({
    mutationFn: (noteId) => companiesService.deleteNote(companyId, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.notes(companyId) });
      const previous = queryClient.getQueryData<CompanyNoteDto[]>(companyKeys.notes(companyId));
      // The note disappears at once and comes back if the request fails
      queryClient.setQueryData<CompanyNoteDto[]>(companyKeys.notes(companyId), (notes) =>
        notes?.filter((n) => n.id !== noteId),
      );
      return { previous };
    },
    onError: (_err, _noteId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(companyKeys.notes(companyId), context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: companyKeys.notes(companyId) }),
  });
}
