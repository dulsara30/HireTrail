import { httpClient } from '../client/http-client';
import { OPTION_ENDPOINTS } from '../endpoints/options.endpoints';
import {
  OptionDto,
  OptionType,
  CreateOptionInput,
  UpdateOptionInput,
  MoveOptionInput,
  ArchiveOptionInput,
  ResetDefaultOptionsInput,
  ApiSuccess,
} from '@hiretrail/shared';

export const optionsService = {
  async getOptions(
    type?: OptionType,
    includeArchived?: boolean,
  ): Promise<OptionDto[] | Record<string, OptionDto[]>> {
    const res = await httpClient.get<ApiSuccess<OptionDto[] | Record<string, OptionDto[]>>>(
      OPTION_ENDPOINTS.list,
      { params: { type, includeArchived } },
    );
    return res.data.data;
  },

  async create(input: CreateOptionInput): Promise<OptionDto> {
    const res = await httpClient.post<ApiSuccess<OptionDto>>(OPTION_ENDPOINTS.create, input);
    return res.data.data;
  },

  async update(id: string, input: UpdateOptionInput): Promise<OptionDto> {
    const res = await httpClient.patch<ApiSuccess<OptionDto>>(OPTION_ENDPOINTS.byId(id), input);
    return res.data.data;
  },

  async move(id: string, input: MoveOptionInput): Promise<OptionDto> {
    const res = await httpClient.post<ApiSuccess<OptionDto>>(OPTION_ENDPOINTS.move(id), input);
    return res.data.data;
  },

  async archive(id: string, input: ArchiveOptionInput): Promise<OptionDto> {
    const res = await httpClient.post<ApiSuccess<OptionDto>>(OPTION_ENDPOINTS.archive(id), input);
    return res.data.data;
  },

  async restore(id: string): Promise<OptionDto> {
    const res = await httpClient.post<ApiSuccess<OptionDto>>(OPTION_ENDPOINTS.restore(id));
    return res.data.data;
  },

  async resetDefaults(input: ResetDefaultOptionsInput): Promise<OptionDto[]> {
    const res = await httpClient.post<ApiSuccess<OptionDto[]>>(
      OPTION_ENDPOINTS.resetDefaults,
      input,
    );
    return res.data.data;
  },
};
