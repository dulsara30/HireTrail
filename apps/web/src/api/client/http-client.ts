import axios from 'axios';
import { setupAuthInterceptor } from './auth-interceptor';

export const httpClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

setupAuthInterceptor(httpClient);
