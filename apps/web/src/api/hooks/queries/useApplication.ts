import { useQuery } from '@tanstack/react-query';
import { applicationsService } from '../../services/applications.service';
import { applicationKeys } from '../../query-keys/applications.keys';

export function useApplication(id: string | null) {
  return useQuery({
    queryKey: id ? applicationKeys.detail(id) : ['applications', 'detail', 'null'],
    queryFn: () => (id ? applicationsService.getById(id) : null),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
