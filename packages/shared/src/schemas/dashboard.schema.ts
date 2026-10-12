import * as yup from 'yup';

export const dashboardSummaryQuerySchema = yup.object({
  range: yup.string().oneOf(['7d', '30d', '90d', 'ytd', 'all']).default('30d'),
});

export const dashboardChartsQuerySchema = yup.object({
  range: yup.string().oneOf(['7d', '30d', '90d', 'ytd', 'all']).default('30d'),
});

export type DashboardSummaryQuery = yup.InferType<typeof dashboardSummaryQuerySchema>;
export type DashboardChartsQuery = yup.InferType<typeof dashboardChartsQuerySchema>;
