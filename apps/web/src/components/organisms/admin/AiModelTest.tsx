import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useTestAiModels } from '../../../api/hooks/mutations/useTestAiModels';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

const ROLE_LABEL = {
  extract: 'Main model',
  fallback: 'Fallback',
  search: 'Google Search',
} as const;

/** Calls every configured Gemini model from the server and shows which ones work and why others fail. */
export const AiModelTest: React.FC = () => {
  const test = useTestAiModels();
  const data = test.data;

  return (
    <section
      aria-labelledby="ai-test-title"
      className="space-y-3 rounded-xl border border-border-accent bg-bg-accent-subtle p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="ai-test-title"
            className="flex items-center gap-2 text-sm font-bold text-text-primary"
          >
            <FlaskConical className="h-4 w-4 text-text-accent" aria-hidden="true" />
            Test AI models
          </h2>
          <p className="text-xs text-text-secondary">
            Sends a tiny request from this server to each configured model. Use it when AI works
            locally but not in production.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => test.mutate()} disabled={test.isPending}>
          {test.isPending ? (
            <Spinner size="sm" />
          ) : (
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Run test
        </Button>
      </div>

      {test.isError && (
        <p role="alert" className="text-xs text-text-danger">
          {test.error.message}
        </p>
      )}

      {data && (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge color={data.aiEnabled ? 'success' : 'danger'}>
              AI_ENABLED: {data.aiEnabled ? 'on' : 'off'}
            </Badge>
            <Badge color={data.keyConfigured ? 'success' : 'danger'}>
              API key: {data.keyConfigured ? 'set' : 'missing'}
            </Badge>
            <Badge color={data.search.configured ? 'success' : 'orange'}>
              Web search ({data.search.provider}): {data.search.configured ? 'key set' : 'no key'}
            </Badge>
            {data.search.configured && (
              <Badge color={data.search.creditsUsed >= data.search.budget ? 'danger' : 'info'}>
                Search credits {data.search.month}: {data.search.creditsUsed} / {data.search.budget}
              </Badge>
            )}
          </div>
          {data.cooldowns.length > 0 && (
            <div className="space-y-1 rounded-lg border border-border-default bg-bg-surface p-3">
              <p className="text-xs font-semibold text-text-primary">Skipped for now</p>
              <ul className="space-y-0.5 text-xs text-text-secondary">
                {data.cooldowns.map((c) => (
                  <li key={c.key}>
                    <span className="font-medium text-text-primary">{c.key}</span> ({c.reason}),
                    back at {new Date(c.until).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.probes.length === 0 ? (
            <p className="text-xs text-text-danger">
              No model could be tested. Add a valid GEMINI_API_KEY to the API project and redeploy.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-default bg-bg-surface">
              <table className="w-full min-w-[34rem] text-left text-xs">
                <caption className="sr-only">AI model test results</caption>
                <thead className="border-b border-border-default bg-bg-muted font-semibold text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Used for</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data.probes.map((p) => (
                    <tr key={`${p.model}-${p.role}`}>
                      <td className="px-3 py-2 font-medium text-text-primary">{p.model}</td>
                      <td className="px-3 py-2">{ROLE_LABEL[p.role]}</td>
                      <td className="px-3 py-2">
                        <Badge color={p.ok ? 'success' : 'danger'}>
                          {p.ok ? 'Works' : `Failed${p.status ? ` (${p.status})` : ''}`}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{p.ms} ms</td>
                      <td className="px-3 py-2 text-text-secondary">{p.message ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
};
