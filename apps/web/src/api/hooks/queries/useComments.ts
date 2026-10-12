import { useQuery } from '@tanstack/react-query';
import { commentsService } from '../../services/comments.service';
import { applicationKeys } from '../../query-keys/applications.keys';

export function useComments(applicationId: string | null) {
  return useQuery({
    queryKey: applicationId ? applicationKeys.comments(applicationId) : ['comments', 'null'],
    queryFn: () => (applicationId ? commentsService.listForApplication(applicationId) : []),
    enabled: Boolean(applicationId),
    staleTime: 30_000,
  });
}
