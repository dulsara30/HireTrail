import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { FunnelStageDto } from '@hiretrail/shared';

interface FunnelChartProps {
  data: FunnelStageDto[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
  // Brand aesthetic colors from tokens (Indigo/Blue/Violet progression)
  const colors = [
    'var(--color-bg-accent)',
    'var(--color-tag-info-text)',
    'var(--color-tag-purple-text)',
    'var(--color-tag-teal-text)',
    'var(--color-text-success)',
  ];

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
          >
            <XAxis type="number" stroke="var(--color-text-tertiary)" fontSize={12} />
            <YAxis
              type="category"
              dataKey="stage"
              stroke="var(--color-text-tertiary)"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]?.payload) {
                  const d = payload[0].payload as FunnelStageDto;
                  return (
                    <div className="bg-bg-surface border border-border-default p-2.5 rounded-lg shadow-md text-xs">
                      <p className="font-semibold text-text-primary">{d.stage}</p>
                      <p className="text-text-secondary mt-1">
                        Count: <span className="font-bold text-text-primary">{d.count}</span>
                      </p>
                      <p className="text-text-tertiary">
                        Conversion:{' '}
                        <span className="font-bold text-text-accent">{d.percentageOfApplied}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible Text Alternative */}
      <div className="sr-only">
        <h4>Funnel Conversion Table</h4>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Count</th>
              <th>Conversion (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.stage}>
                <td>{row.stage}</td>
                <td>{row.count}</td>
                <td>{row.percentageOfApplied}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
