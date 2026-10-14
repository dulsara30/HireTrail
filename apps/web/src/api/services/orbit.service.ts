import { httpClient } from '../client/http-client';
import { ORBIT_ENDPOINTS } from '../endpoints/orbit.endpoints';
import {
  type ApiList,
  type ApiSuccess,
  type CreateOrbitSpaceInput,
  type CreateOrbitTaskInput,
  type ListOrbitTasksQuery,
  type OrbitDueDto,
  type OrbitPlanDto,
  type OrbitPulseDto,
  type OrbitQuickParseDto,
  type OrbitSettingsDto,
  type OrbitSpaceDto,
  type OrbitTaskDto,
  type OrbitTimelineDto,
  type PageInfo,
  type UpdateOrbitSettingsInput,
  type UpdateOrbitSpaceInput,
  type UpdateOrbitTaskInput,
} from '@hiretrail/shared';

/** The API reads lists as comma-separated values (a,b,c). */
function serialize<T extends object>(query: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
      .filter(([, value]) => value !== ''),
  );
}

export const orbitService = {
  async listTasks(
    query: Partial<ListOrbitTasksQuery>,
  ): Promise<{ items: OrbitTaskDto[]; page: PageInfo }> {
    const res = await httpClient.get<ApiList<OrbitTaskDto>>(ORBIT_ENDPOINTS.tasks, {
      params: serialize(query),
    });
    return { items: res.data.data, page: res.data.page };
  },

  async getTask(id: string): Promise<OrbitTaskDto> {
    const res = await httpClient.get<ApiSuccess<OrbitTaskDto>>(ORBIT_ENDPOINTS.task(id));
    return res.data.data;
  },

  async createTask(input: CreateOrbitTaskInput): Promise<OrbitTaskDto> {
    const res = await httpClient.post<ApiSuccess<OrbitTaskDto>>(ORBIT_ENDPOINTS.tasks, input);
    return res.data.data;
  },

  async updateTask(id: string, input: UpdateOrbitTaskInput): Promise<OrbitTaskDto> {
    const res = await httpClient.patch<ApiSuccess<OrbitTaskDto>>(ORBIT_ENDPOINTS.task(id), input);
    return res.data.data;
  },

  async completeTask(
    id: string,
    version: number,
  ): Promise<{ task: OrbitTaskDto; next: OrbitTaskDto | null }> {
    const res = await httpClient.post<
      ApiSuccess<{ task: OrbitTaskDto; next: OrbitTaskDto | null }>
    >(ORBIT_ENDPOINTS.complete(id), { version });
    return res.data.data;
  },

  async reopenTask(id: string, version: number): Promise<OrbitTaskDto> {
    const res = await httpClient.post<ApiSuccess<OrbitTaskDto>>(ORBIT_ENDPOINTS.reopen(id), {
      version,
    });
    return res.data.data;
  },

  async snoozeTask(id: string, until: string, version: number): Promise<OrbitTaskDto> {
    const res = await httpClient.post<ApiSuccess<OrbitTaskDto>>(ORBIT_ENDPOINTS.snooze(id), {
      until,
      version,
    });
    return res.data.data;
  },

  async deleteTask(id: string): Promise<void> {
    await httpClient.delete(ORBIT_ENDPOINTS.task(id));
  },

  /** The AI refine button (PRO). Sends only the typed sentence and the time zone. */
  async parseText(text: string, tzOffset: number): Promise<OrbitQuickParseDto> {
    const res = await httpClient.post<ApiSuccess<OrbitQuickParseDto>>(
      ORBIT_ENDPOINTS.quickParse,
      { text, tzOffset },
      { timeout: 30_000 },
    );
    return res.data.data;
  },

  async getTimeline(from: string, to: string): Promise<OrbitTimelineDto> {
    const res = await httpClient.get<ApiSuccess<OrbitTimelineDto>>(ORBIT_ENDPOINTS.timeline, {
      params: { from, to },
    });
    return res.data.data;
  },

  async getPulse(tzOffset: number): Promise<OrbitPulseDto> {
    const res = await httpClient.get<ApiSuccess<OrbitPulseDto>>(ORBIT_ENDPOINTS.pulse, {
      params: { tzOffset },
    });
    return res.data.data;
  },

  async getDue(): Promise<OrbitDueDto> {
    const res = await httpClient.get<ApiSuccess<OrbitDueDto>>(ORBIT_ENDPOINTS.due);
    return res.data.data;
  },

  async getPlan(): Promise<OrbitPlanDto> {
    const res = await httpClient.get<ApiSuccess<OrbitPlanDto>>(ORBIT_ENDPOINTS.plan);
    return res.data.data;
  },

  async listSpaces(): Promise<OrbitSpaceDto[]> {
    const res = await httpClient.get<ApiSuccess<OrbitSpaceDto[]>>(ORBIT_ENDPOINTS.spaces);
    return res.data.data;
  },

  async createSpace(input: CreateOrbitSpaceInput): Promise<OrbitSpaceDto> {
    const res = await httpClient.post<ApiSuccess<OrbitSpaceDto>>(ORBIT_ENDPOINTS.spaces, input);
    return res.data.data;
  },

  async updateSpace(id: string, input: UpdateOrbitSpaceInput): Promise<OrbitSpaceDto> {
    const res = await httpClient.patch<ApiSuccess<OrbitSpaceDto>>(ORBIT_ENDPOINTS.space(id), input);
    return res.data.data;
  },

  async deleteSpace(id: string): Promise<void> {
    await httpClient.delete(ORBIT_ENDPOINTS.space(id));
  },

  async getSettings(): Promise<OrbitSettingsDto> {
    const res = await httpClient.get<ApiSuccess<OrbitSettingsDto>>(ORBIT_ENDPOINTS.settings);
    return res.data.data;
  },

  async updateSettings(input: UpdateOrbitSettingsInput): Promise<OrbitSettingsDto> {
    const res = await httpClient.put<ApiSuccess<OrbitSettingsDto>>(ORBIT_ENDPOINTS.settings, input);
    return res.data.data;
  },
};
