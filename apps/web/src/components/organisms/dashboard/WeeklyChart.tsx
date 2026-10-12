import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { WeeklyApplicationsDto } from '@hiretrail/shared';

interface WeeklyChartProps {
  data: WeeklyApplicationsDto[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-default)"
              vertical={false}
            />
            <XAxis
              dataKey="weekLabel"
              stroke="var(--color-text-tertiary)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="var(--color-text-tertiary)"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]?.payload) {
                  const d = payload[0].payload as WeeklyApplicationsDto;
                  return (
                    <div className="bg-bg-surface border border-border-default p-2.5 rounded-lg shadow-md text-xs">
                      <p className="font-semibold text-text-primary">Week of {d.weekLabel}</p>
                      <p className="text-text-secondary mt-1">
                        Applications: <span className="font-bold text-accent-500">{d.count}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" fill="var(--color-bg-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible Text Alternative */}
      <div className="sr-only">
        <h4>Weekly Applications Table</h4>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.weekLabel}>
                <td>{row.weekLabel}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
