import { useQuery } from '@tanstack/react-query';
import { BoardQuery } from '@hiretrail/shared';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';

export function useBoard(query?: BoardQuery) {
  return useQuery({
    queryKey: applicationKeys.board(query),
    queryFn: () => applicationsService.getBoard(query),
    staleTime: 30_000,
  });
}
