import { httpClient } from '../client/http-client';
import { APPLICATION_ENDPOINTS } from '../endpoints/applications.endpoints';
import {
  ApplicationDto,
  ApplicationListItemDto,
  CreateApplicationInput,
  UpdateApplicationInput,
  MoveApplicationInput,
  CreateApplicationResultDto,
  BoardDto,
  ListApplicationsQuery,
  BoardQuery,
  LaneQuery,
  ApiSuccess,
  PageInfo,
} from '@hiretrail/shared';

/** The API reads id lists as comma-separated values (a,b,c). */
function serializeParams<T extends object>(query?: T): Record<string, unknown> | undefined {
  if (!query) return undefined;
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
      .filter(([, value]) => value !== ''),
  );
}

export const applicationsService = {
  async getList(
    query: Partial<ListApplicationsQuery>,
  ): Promise<{ items: ApplicationListItemDto[]; page: PageInfo }> {
    const res = await httpClient.get<
      ApiSuccess<{ items: ApplicationListItemDto[]; page: PageInfo }>
    >(APPLICATION_ENDPOINTS.list, { params: serializeParams(query) });
    return res.data.data;
  },

  async getBoard(query?: BoardQuery): Promise<BoardDto> {
    const res = await httpClient.get<ApiSuccess<BoardDto>>(APPLICATION_ENDPOINTS.board, {
      params: serializeParams(query),
    });
    return res.data.data;
  },

  async getLaneItems(
    statusId: string,
    query?: LaneQuery,
  ): Promise<{ items: ApplicationListItemDto[]; page: PageInfo }> {
    const res = await httpClient.get<
      ApiSuccess<{ items: ApplicationListItemDto[]; page: PageInfo }>
    >(APPLICATION_ENDPOINTS.lane(statusId), { params: serializeParams(query) });
    return res.data.data;
  },

  async getById(id: string): Promise<ApplicationDto> {
    const res = await httpClient.get<ApiSuccess<ApplicationDto>>(APPLICATION_ENDPOINTS.byId(id));
    return res.data.data;
  },

  async create(input: CreateApplicationInput): Promise<CreateApplicationResultDto> {
    const res = await httpClient.post<ApiSuccess<CreateApplicationResultDto>>(
      APPLICATION_ENDPOINTS.create,
      input,
    );
    return res.data.data;
  },

  async update(id: string, input: UpdateApplicationInput): Promise<ApplicationDto> {
    const res = await httpClient.patch<ApiSuccess<ApplicationDto>>(
      APPLICATION_ENDPOINTS.byId(id),
      input,
    );
    return res.data.data;
  },

  async move(id: string, input: MoveApplicationInput): Promise<ApplicationDto> {
    const res = await httpClient.post<ApiSuccess<ApplicationDto>>(
      APPLICATION_ENDPOINTS.move(id),
      input,
    );
    return res.data.data;
  },

  async archive(id: string): Promise<ApplicationDto> {
    const res = await httpClient.post<ApiSuccess<ApplicationDto>>(
      APPLICATION_ENDPOINTS.archive(id),
    );
    return res.data.data;
  },

  async restore(id: string): Promise<ApplicationDto> {
    const res = await httpClient.post<ApiSuccess<ApplicationDto>>(
      APPLICATION_ENDPOINTS.restore(id),
    );
    return res.data.data;
  },

  async deletePermanently(id: string): Promise<void> {
    await httpClient.delete(APPLICATION_ENDPOINTS.deletePermanently(id));
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(APPLICATION_ENDPOINTS.delete(id));
  },

  async undoDelete(id: string): Promise<ApplicationDto> {
    const res = await httpClient.post<ApiSuccess<ApplicationDto>>(
      APPLICATION_ENDPOINTS.undoDelete(id),
    );
    return res.data.data;
  },
};
