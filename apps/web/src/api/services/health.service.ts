import { type ApiSuccess, type HealthDto } from '@hiretrail/shared';
import { httpClient } from '../client/http-client';
import { HEALTH_ENDPOINTS } from '../endpoints/health.endpoints';

export const healthService = {
  getHealth: async (): Promise<HealthDto> => {
    const res = await httpClient.get<ApiSuccess<HealthDto>>(HEALTH_ENDPOINTS.health);
    return res.data.data;
  },
};
