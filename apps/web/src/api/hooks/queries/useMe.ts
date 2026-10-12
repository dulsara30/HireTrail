import { useQuery } from '@tanstack/react-query';
import { meService } from '../../services/me.service';
import { ME_KEYS } from '../../query-keys/me.keys';
import { useAuthStore } from '../../../store/auth.store';
import { MeDto } from '@hiretrail/shared';

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<MeDto>({
    queryKey: ME_KEYS.profile(),
    queryFn: () => meService.getMe(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}
