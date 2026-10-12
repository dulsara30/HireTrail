export const dashboardKeys = {
  all: ['dashboard'] as const,
  summaries: () => [...dashboardKeys.all, 'summary'] as const,
  summary: (range: string) => [...dashboardKeys.summaries(), range] as const,
  charts: () => [...dashboardKeys.all, 'charts'] as const,
  chart: (range: string) => [...dashboardKeys.charts(), range] as const,
  activities: () => [...dashboardKeys.all, 'activity'] as const,
  activity: () => [...dashboardKeys.activities()] as const,
};
