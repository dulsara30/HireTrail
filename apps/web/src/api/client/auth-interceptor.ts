import { type AxiosInstance } from 'axios';
import { ApiError } from './api-error';

export function setupAuthInterceptor(client: AxiosInstance): void {
  // Response interceptor: converts Axios errors into ApiError
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      throw ApiError.fromAxiosError(error);
    },
  );
}
