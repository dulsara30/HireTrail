'use client';

import React from 'react';
import { useAdminAiUsage } from '../../../../api/hooks/queries/useAdminAiUsage';
import { Spinner } from '../../../../components/atoms/Spinner';
import { AiModelTest } from '../../../../components/organisms/admin/AiModelTest';
import { EmptyState } from '../../../../components/molecules/EmptyState';

export default function AdminAiUsagePage() {
  const [days, setDays] = React.useState(14);
  const { data, isLoading, isError } = useAdminAiUsage(days);

  return (
    <div className="space-y-4">
      <AiModelTest />
      <div className="flex items-center gap-3">
        <label htmlFor="ai-days" className="text-xs font-semibold uppercase text-text-secondary">
          Period
        </label>
        <select
          id="ai-days"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        >
          {[7, 14, 30, 90].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner size="lg" />
        </div>
      ) : isError || !data ? (
        <p role="alert" className="text-sm text-text-danger">
          Failed to load AI usage.
        </p>
      ) : data.days.length === 0 ? (
        <EmptyState
          title="No AI calls yet"
          description="Daily totals appear after the first AI call."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-surface shadow-sm">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">AI calls per day</caption>
              <thead className="border-b border-border-default bg-bg-accent-subtle text-xs font-semibold uppercase text-text-accent">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Calls</th>
                  <th className="px-4 py-3">Failures</th>
                  <th className="px-4 py-3">Input tokens</th>
                  <th className="px-4 py-3">Output tokens</th>
                  <th className="px-4 py-3">By feature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {data.days.map((d) => (
                  <tr key={d.day}>
                    <td className="px-4 py-3 font-medium text-text-primary">{d.day}</td>
                    <td className="px-4 py-3">{d.calls}</td>
                    <td
                      className={`px-4 py-3 ${d.failures > 0 ? 'font-semibold text-text-danger' : ''}`}
                    >
                      {d.failures}
                    </td>
                    <td className="px-4 py-3">{d.inputTokens.toLocaleString()}</td>
                    <td className="px-4 py-3">{d.outputTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {Object.entries(d.byFeature)
                        .map(([f, n]) => `${f.toLowerCase().replace('_', ' ')}: ${n}`)
                        .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-text-primary">Top users</h2>
            <ul className="divide-y divide-border-default rounded-xl border border-border-default bg-bg-surface shadow-sm">
              {data.topUsers.map((u) => (
                <li
                  key={u.userId}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 break-all">{u.email ?? u.userId}</span>
                  <span className="shrink-0 text-text-secondary">
                    {u.calls} calls · {u.failures} failed
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
