import { type InfiniteData } from '@tanstack/react-query';
import { type OrbitTaskDto, type OrbitTimelineDto, type PageInfo } from '@hiretrail/shared';

export type TaskPatch = Partial<OrbitTaskDto> | null;
export type TaskPages = InfiniteData<{ items: OrbitTaskDto[]; page: PageInfo }>;

/** Changes one item in a timeline, or removes it when the patch is null. Other items are untouched. */
export function patchTimeline(
  timeline: OrbitTimelineDto,
  id: string,
  patch: TaskPatch,
): OrbitTimelineDto {
  if (!timeline.tasks.some((t) => t.id === id)) return timeline;
  return {
    ...timeline,
    tasks:
      patch === null
        ? timeline.tasks.filter((t) => t.id !== id)
        : timeline.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  };
}

/** Changes one item in loaded list pages, or removes it when the patch is null. */
export function patchTaskPages(data: TaskPages, id: string, patch: TaskPatch): TaskPages {
  if (!data.pages.some((p) => p.items.some((t) => t.id === id))) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items:
        patch === null
          ? page.items.filter((t) => t.id !== id)
          : page.items.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  };
}
