import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { SourceBreakdownDto } from '@hiretrail/shared';

interface SourceBreakdownChartProps {
  data: SourceBreakdownDto[];
}

export const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
          >
            <XAxis
              type="number"
              stroke="var(--color-text-tertiary)"
              fontSize={11}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="var(--color-text-tertiary)"
              fontSize={11}
              tickLine={false}
              width={80}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]?.payload) {
                  const d = payload[0].payload as SourceBreakdownDto;
                  return (
                    <div className="bg-bg-surface border border-border-default p-2.5 rounded-lg shadow-md text-xs">
                      <p className="font-semibold text-text-primary">{d.label}</p>
                      <p className="text-text-secondary mt-1">
                        Applications: <span className="font-bold text-text-primary">{d.count}</span>
                      </p>
                      <p className="text-text-tertiary">
                        Response Rate:{' '}
                        <span className="font-bold text-text-success">{d.responseRate}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" fill="var(--color-tag-purple-text)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible Alternative */}
      <div className="sr-only">
        <h4>Sources Breakdown</h4>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Applications</th>
              <th>Response Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td>{item.count}</td>
                <td>{item.responseRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
