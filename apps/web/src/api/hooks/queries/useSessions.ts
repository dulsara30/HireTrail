import { useQuery } from '@tanstack/react-query';
import { meService } from '../../services/me.service';
import { ME_KEYS } from '../../query-keys/me.keys';
import { useAuthStore } from '../../../store/auth.store';
import { SessionDto } from '@hiretrail/shared';

export function useSessions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<SessionDto[]>({
    queryKey: ME_KEYS.sessions(),
    queryFn: () => meService.getSessions(),
    enabled: isAuthenticated,
  });
}
