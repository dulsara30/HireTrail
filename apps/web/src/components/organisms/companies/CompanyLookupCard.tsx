import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ExternalLink, Lock, Sparkles } from 'lucide-react';
import { useMe } from '../../../api/hooks/queries/useMe';
import { useCompanyAiLookup } from '../../../api/hooks/mutations/useCompanyAiLookup';
import { useCreateCompany } from '../../../api/hooks/mutations/useCreateCompany';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

interface CompanyLookupCardProps {
  name: string;
}

function lookupError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e.code === 'AI_QUOTA_EXCEEDED') return 'Daily lookup limit reached. It resets tomorrow.';
  if (e.code === 'EMAIL_NOT_VERIFIED') return 'Verify your email to use AI lookup.';
  if (e.code === 'AI_UNAVAILABLE')
    return e.message || 'AI is busy right now, try again in a minute.';
  return e.message || 'Lookup failed. Please try again.';
}

export const CompanyLookupCard: React.FC<CompanyLookupCardProps> = ({ name }) => {
  const router = useRouter();
  const { data: me } = useMe();
  const [hint, setHint] = React.useState('');
  const lookup = useCompanyAiLookup();
  const createCompany = useCreateCompany();
  const isPro = me?.plan === 'PRO';
  const result = lookup.data;

  const handleSave = () => {
    if (!result?.profile) return;
    const p = result.profile;
    createCompany.mutate(
      {
        name: p.name,
        websiteUrl: p.website,
        careersUrl: p.careersUrl,
        country: p.country,
        location: p.city,
        industry: p.industry,
        size: p.size,
        description: p.description,
        fromAiLookup: true,
      },
      { onSuccess: (company) => router.push(`/companies/${company.slug}`) },
    );
  };

  return (
    <div className="bg-bg-surface border border-border-default border-t-4 border-t-border-accent rounded-xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-text-accent" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-primary">
          Not in the directory? Look up “{name}” with AI
        </h3>
      </div>

      {!result && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={200}
            placeholder="Optional hint, e.g. city or website"
            aria-label="Optional hint for the lookup"
            className="flex-1 h-10 px-3 text-sm bg-bg-surface border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-border-accent"
          />
          {isPro ? (
            <Button
              variant="accent"
              onClick={() => lookup.mutate({ name, hint: hint.trim() || undefined })}
              disabled={lookup.isPending}
            >
              {lookup.isPending ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
              Look up
            </Button>
          ) : (
            <Button variant="secondary" disabled title="PRO feature">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Look up <Badge color="accent">PRO</Badge>
            </Button>
          )}
        </div>
      )}

      {lookup.isPending && (
        <p className="text-xs text-text-secondary" role="status">
          Searching public sources… this can take up to a minute.
        </p>
      )}
      {lookup.isError && (
        <p className="text-xs text-text-danger" role="alert">
          {lookupError(lookup.error)}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div
            role="note"
            className="flex items-start gap-2 text-xs text-text-accent bg-bg-accent-subtle border border-border-accent rounded-md px-3 py-2"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              AI result. This company isn&apos;t in our database. Details may be wrong; check the
              sources.
            </span>
          </div>

          {!result.found || !result.profile ? (
            <p className="text-sm text-text-secondary">No reliable information found.</p>
          ) : (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {(
                  [
                    ['Name', result.profile.name],
                    ['Website', result.profile.website],
                    ['Careers', result.profile.careersUrl],
                    ['Country', result.profile.country],
                    ['City', result.profile.city],
                    ['Industry', result.profile.industry],
                    ['Size', result.profile.size],
                  ] as Array<[string, string | null]>
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-semibold uppercase text-text-secondary">{k}</dt>
                      <dd className="text-text-primary break-all">{v}</dd>
                    </div>
                  ))}
              </dl>
              {result.profile.description && (
                <p className="text-sm text-text-secondary">{result.profile.description}</p>
              )}
              {result.sources.length > 0 && (
                <ul className="flex flex-wrap gap-3 text-xs">
                  {result.sources.slice(0, 5).map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-tag-info-text hover:underline"
                      >
                        Source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={createCompany.isPending}>
                  {createCompany.isPending ? <Spinner size="sm" /> : 'Save as my company'}
                </Button>
                <Button variant="ghost" onClick={() => lookup.reset()}>
                  Discard
                </Button>
              </div>
              {createCompany.isError && (
                <p className="text-xs text-text-danger" role="alert">
                  {(createCompany.error as { message?: string }).message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
