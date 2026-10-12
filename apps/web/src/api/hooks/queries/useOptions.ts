import { useQuery } from '@tanstack/react-query';
import { OptionType } from '@hiretrail/shared';
import { optionsService } from '../../services/options.service';
import { optionKeys } from '../../query-keys/options.keys';

export function useOptions(type?: OptionType, includeArchived = false) {
  return useQuery({
    queryKey: optionKeys.list(type, includeArchived),
    queryFn: () => optionsService.getOptions(type, includeArchived),
    staleTime: 30_000,
  });
}
