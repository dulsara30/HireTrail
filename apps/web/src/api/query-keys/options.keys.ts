import { OptionType } from '@hiretrail/shared';

export const optionKeys = {
  all: ['options'] as const,
  lists: () => [...optionKeys.all, 'list'] as const,
  list: (type?: OptionType, includeArchived?: boolean) =>
    [...optionKeys.lists(), { type, includeArchived }] as const,
  details: () => [...optionKeys.all, 'detail'] as const,
  detail: (id: string) => [...optionKeys.details(), id] as const,
};
