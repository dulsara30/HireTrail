import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { StatusDistributionDto } from '@hiretrail/shared';

interface StatusDistributionChartProps {
  data: StatusDistributionDto[];
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  const defaultColors = [
    'var(--color-text-tertiary)',
    'var(--color-tag-info-text)',
    'var(--color-tag-purple-text)',
    'var(--color-text-success)',
    'var(--color-bg-accent)',
    'var(--color-text-danger)',
  ];

  return (
    <div className="space-y-4">
      <div className="h-64 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.statusId}`}
                  fill={defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]?.payload) {
                  const d = payload[0].payload as StatusDistributionDto;
                  return (
                    <div className="bg-bg-surface border border-border-default p-2.5 rounded-lg shadow-md text-xs">
                      <p className="font-semibold text-text-primary">{d.label}</p>
                      <p className="text-text-secondary mt-1">
                        Count: <span className="font-bold text-text-primary">{d.count}</span>
                      </p>
                      <p className="text-text-tertiary">
                        Share: <span className="font-bold text-text-accent">{d.percentage}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
        {data.map((item, idx) => (
          <div key={item.statusId} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: defaultColors[idx % defaultColors.length] }}
            />
            <span className="text-text-secondary">
              {item.label} ({item.count})
            </span>
          </div>
        ))}
      </div>

      {/* Accessible Alternative */}
      <div className="sr-only">
        <h4>Status Distribution</h4>
        <ul>
          {data.map((item) => (
            <li key={item.statusId}>
              {item.label}: {item.count} ({item.percentage}%)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
