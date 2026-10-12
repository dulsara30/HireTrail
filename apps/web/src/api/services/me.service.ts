import { httpClient } from '../client/http-client';
import { ME_ENDPOINTS } from '../endpoints/me.endpoints';
import {
  MeDto,
  SessionDto,
  UpdateProfileInput,
  ChangePasswordInput,
  DeleteAccountInput,
  ApiSuccess,
} from '@hiretrail/shared';

export const meService = {
  async getMe(): Promise<MeDto> {
    const res = await httpClient.get<ApiSuccess<MeDto>>(ME_ENDPOINTS.me);
    return res.data.data;
  },

  async updateMe(input: UpdateProfileInput): Promise<MeDto> {
    const res = await httpClient.patch<ApiSuccess<MeDto>>(ME_ENDPOINTS.me, input);
    return res.data.data;
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await httpClient.patch(ME_ENDPOINTS.password, input);
  },

  async getSessions(): Promise<SessionDto[]> {
    const res = await httpClient.get<ApiSuccess<SessionDto[]>>(ME_ENDPOINTS.sessions);
    return res.data.data;
  },

  async revokeSession(id: string): Promise<void> {
    await httpClient.delete(ME_ENDPOINTS.sessionById(id));
  },

  async deleteAccount(input: DeleteAccountInput): Promise<void> {
    await httpClient.delete(ME_ENDPOINTS.me, { data: input });
  },
};
