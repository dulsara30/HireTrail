import { httpClient } from '../client/http-client';
import { AUTH_ENDPOINTS } from '../endpoints/auth.endpoints';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  AuthTokensDto,
  ApiSuccess,
} from '@hiretrail/shared';

export const authService = {
  async register(input: RegisterInput): Promise<AuthTokensDto> {
    const res = await httpClient.post<ApiSuccess<AuthTokensDto>>(AUTH_ENDPOINTS.register, input);
    return res.data.data;
  },

  async login(input: LoginInput): Promise<AuthTokensDto> {
    const res = await httpClient.post<ApiSuccess<AuthTokensDto>>(AUTH_ENDPOINTS.login, input);
    return res.data.data;
  },

  async refresh(): Promise<AuthTokensDto> {
    const res = await httpClient.post<ApiSuccess<AuthTokensDto>>(
      AUTH_ENDPOINTS.refresh,
      {},
      {
        headers: {
          'X-Requested-With': 'hiretrail',
        },
      },
    );
    return res.data.data;
  },

  async logout(): Promise<void> {
    await httpClient.post(
      AUTH_ENDPOINTS.logout,
      {},
      {
        headers: {
          'X-Requested-With': 'hiretrail',
        },
      },
    );
  },

  async logoutAll(): Promise<void> {
    await httpClient.post(AUTH_ENDPOINTS.logoutAll);
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await httpClient.post(AUTH_ENDPOINTS.forgotPassword, input);
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await httpClient.post(AUTH_ENDPOINTS.resetPassword, input);
  },

  async verifyEmail(token: string): Promise<void> {
    await httpClient.post(AUTH_ENDPOINTS.emailVerify, { token });
  },

  async resendVerification(): Promise<void> {
    await httpClient.post(AUTH_ENDPOINTS.emailResend);
  },

  async getGoogleLinkUrl(): Promise<{ url: string }> {
    const res = await httpClient.post<ApiSuccess<{ url: string }>>(AUTH_ENDPOINTS.googleLink);
    return res.data.data;
  },
};
