import { type AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { type ApiErrorResponse } from '@hiretrail/shared';
import { ApiError } from './api-error';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../services/auth.service';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export function setupAuthInterceptor(client: AxiosInstance): void {
  // Request interceptor: attach in-memory Bearer token
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  // Response interceptor: handle 401 TOKEN_EXPIRED with single-flight refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      const apiError = ApiError.fromAxiosError(error);

      // Only attempt refresh on 401 with TOKEN_EXPIRED or AUTHENTICATION_REQUIRED
      // and skip auth endpoints themselves to avoid infinite loop
      const isAuthEndpoint = originalRequest.url?.includes('/auth/');
      const isUnauthorized = apiError.status === 401;

      if (isUnauthorized && !originalRequest._retry && !isAuthEndpoint) {
        if (isRefreshing) {
          return new Promise<unknown>((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(client(originalRequest));
              },
              reject: (err: unknown) => {
                reject(err);
              },
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newTokens = await authService.refresh();
          useAuthStore.getState().setAccessToken(newTokens.accessToken);
          processQueue(null, newTokens.accessToken);

          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return client(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          useAuthStore.getState().clearAuth();

          if (typeof window !== 'undefined') {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}`;
          }

          if (refreshErr instanceof AxiosError) {
            throw ApiError.fromAxiosError(refreshErr as AxiosError<ApiErrorResponse>);
          }
          throw refreshErr;
        } finally {
          isRefreshing = false;
        }
      }

      throw apiError;
    },
  );
}
