import { type ListOrbitTasksQuery } from '@hiretrail/shared';

export const orbitKeys = {
  all: ['orbit'] as const,
  tasks: () => [...orbitKeys.all, 'tasks'] as const,
  list: (query: Partial<ListOrbitTasksQuery>) => [...orbitKeys.tasks(), 'list', query] as const,
  task: (id: string) => [...orbitKeys.tasks(), 'one', id] as const,
  timelines: () => [...orbitKeys.all, 'timeline'] as const,
  timeline: (from: string, to: string) => [...orbitKeys.timelines(), from, to] as const,
  pulse: (tzOffset: number) => [...orbitKeys.all, 'pulse', tzOffset] as const,
  due: () => [...orbitKeys.all, 'due'] as const,
  plan: () => [...orbitKeys.all, 'plan'] as const,
  spaces: () => [...orbitKeys.all, 'spaces'] as const,
  settings: () => [...orbitKeys.all, 'settings'] as const,
};
