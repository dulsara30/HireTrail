import { httpClient } from '../client/http-client';
import { DASHBOARD_ENDPOINTS } from '../endpoints/dashboard.endpoints';
import {
  DashboardSummaryDto,
  DashboardChartsDto,
  ActivityDto,
  ApiSuccess,
} from '@hiretrail/shared';

export const dashboardService = {
  async getSummary(range = '30d'): Promise<DashboardSummaryDto> {
    const res = await httpClient.get<ApiSuccess<DashboardSummaryDto>>(DASHBOARD_ENDPOINTS.summary, {
      params: { range },
    });
    return res.data.data;
  },

  async getCharts(range = '30d'): Promise<DashboardChartsDto> {
    const res = await httpClient.get<ApiSuccess<DashboardChartsDto>>(DASHBOARD_ENDPOINTS.charts, {
      params: { range },
    });
    return res.data.data;
  },

  async getActivity(
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ActivityDto[]; nextCursor?: string }> {
    const res = await httpClient.get<ApiSuccess<{ items: ActivityDto[]; nextCursor?: string }>>(
      DASHBOARD_ENDPOINTS.activity,
      {
        params: { cursor, limit },
      },
    );
    return res.data.data;
  },
};
