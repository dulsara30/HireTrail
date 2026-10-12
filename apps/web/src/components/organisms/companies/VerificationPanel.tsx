import React from 'react';
import { ExternalLink, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { type CompanyDto, type VerifiableField } from '@hiretrail/shared';
import { useMe } from '../../../api/hooks/queries/useMe';
import { useCompanyVerifications } from '../../../api/hooks/queries/useCompanyVerifications';
import { useVerifyCompany } from '../../../api/hooks/mutations/useVerifyCompany';
import { useApplySuggestions } from '../../../api/hooks/mutations/useApplySuggestions';
import { VerificationBadge } from '../../molecules/VerificationBadge/VerificationBadge';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ProLockBanner } from '../../molecules/ProLockBanner/ProLockBanner';
import { FIELD_LABELS, daysAgo } from '../../../utils/helpers/verification';

interface VerificationPanelProps {
  company: CompanyDto;
}

const VERDICT_TONE = {
  MATCH: 'success',
  DIFFERENT: 'danger',
  NOT_FOUND: 'neutral',
  NOT_CHECKED: 'neutral',
} as const;
const VERDICT_TEXT = {
  MATCH: 'Match',
  DIFFERENT: 'Different',
  NOT_FOUND: 'Not found',
  NOT_CHECKED: 'Not checked',
} as const;

function errorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string; details?: { resetsAt?: string } };
  if (e.code === 'RATE_LIMITED') {
    const when = e.details?.resetsAt ? new Date(e.details.resetsAt).toLocaleString() : 'later';
    return `You already re-checked this company recently. Try again after ${when}.`;
  }
  if (e.code === 'AI_QUOTA_EXCEEDED') return 'Daily check limit reached. It resets tomorrow.';
  if (e.code === 'AI_UNAVAILABLE')
    return e.message || 'AI is busy right now, try again in a minute.';
  if (e.code === 'EMAIL_NOT_VERIFIED') return 'Verify your email to use AI checks.';
  return e.message || 'Something went wrong. Please try again.';
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ company }) => {
  const { data: me } = useMe();
  const { data: history = [], isLoading } = useCompanyVerifications(company.id);
  const verifyMutation = useVerifyCompany(company.id);
  const applyMutation = useApplySuggestions(company.id);

  const isPro = me?.plan === 'PRO';
  const latest = history[0];
  const age = daysAgo(latest?.createdAt);
  const isStale = !latest || (age !== null && age >= 30);
  const canApply = company.isGlobal ? me?.role === 'ADMIN' : company.ownerId === me?.id;

  const handleVerify = (force: boolean) => verifyMutation.mutate({ force });
  const handleApply = (field: VerifiableField) => {
    if (!latest) return;
    applyMutation.mutate({ verificationId: latest.id, fields: [field] });
  };

  return (
    <section
      aria-labelledby="verification-heading"
      className="bg-bg-surface border border-border-default border-t-4 border-t-border-accent rounded-xl p-5 space-y-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-text-accent" aria-hidden="true" />
          <h2 id="verification-heading" className="text-sm font-bold text-text-primary">
            Data accuracy
          </h2>
          {latest && <VerificationBadge score={latest.score} checkedAt={latest.createdAt} />}
        </div>

        {isPro ? (
          <Button
            size="sm"
            variant={isStale ? 'accent' : 'secondary'}
            onClick={() => handleVerify(Boolean(latest))}
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {latest ? 'Re-check' : 'Check data accuracy'}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled title="PRO feature">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Check data accuracy <Badge color="accent">PRO</Badge>
          </Button>
        )}
      </div>

      {!isPro && (
        <ProLockBanner
          feature="Company data accuracy check"
          description="Compare a company's details with public sources and get an accuracy score."
        />
      )}

      {verifyMutation.isPending && (
        <p className="text-xs text-text-secondary" role="status">
          Checking public sources… this can take up to a minute.
        </p>
      )}
      {verifyMutation.isError && (
        <p className="text-xs text-text-danger" role="alert">
          {errorMessage(verifyMutation.error)}
        </p>
      )}
      {applyMutation.isError && (
        <p className="text-xs text-text-danger" role="alert">
          {errorMessage(applyMutation.error)}
        </p>
      )}

      {isLoading && <Spinner size="sm" />}

      {!isLoading && !latest && (
        <p className="text-xs text-text-secondary">
          No accuracy check yet.{' '}
          {isPro ? 'Run one to compare these details with public sources.' : ''}
        </p>
      )}

      {latest && isPro && (
        <>
          {!latest.searchCheckAvailable && (
            <p className="text-xs text-text-accent bg-bg-accent-subtle border border-border-accent rounded-md px-3 py-2">
              Search check unavailable right now, so only the website and careers page were checked.
              The other details are shown as "Not checked" and do not affect the score.
            </p>
          )}
          {latest.companyExists === 'NO' && (
            <p className="text-xs text-text-danger bg-bg-danger-subtle border border-border-danger rounded-md px-3 py-2">
              We could not find evidence that this company exists.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">Per-field accuracy check</caption>
              <thead>
                <tr className="text-left text-text-secondary border-b border-border-default">
                  <th className="py-2 pr-3 font-semibold">Field</th>
                  <th className="py-2 pr-3 font-semibold">Stored</th>
                  <th className="py-2 pr-3 font-semibold">Result</th>
                  <th className="py-2 font-semibold">Sources</th>
                </tr>
              </thead>
              <tbody>
                {latest.fields.map((f) => {
                  const suggestion = latest.suggestions.find((s) => s.field === f.field);
                  return (
                    <tr
                      key={f.field}
                      className="border-b border-border-default last:border-0 align-top"
                    >
                      <td className="py-2 pr-3 font-medium text-text-primary">
                        {FIELD_LABELS[f.field] ?? f.field}
                      </td>
                      <td className="py-2 pr-3 text-text-secondary break-all">{f.storedValue}</td>
                      <td className="py-2 pr-3 space-y-1">
                        <Badge color={VERDICT_TONE[f.verdict]}>{VERDICT_TEXT[f.verdict]}</Badge>
                        {f.verdict === 'DIFFERENT' && f.foundValue && (
                          <p className="text-text-primary break-all">Found: {f.foundValue}</p>
                        )}
                        {suggestion && canApply && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApply(f.field)}
                            disabled={applyMutation.isPending}
                          >
                            Apply
                          </Button>
                        )}
                      </td>
                      <td className="py-2">
                        {f.sources.length === 0 ? (
                          <span className="text-text-tertiary">None</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {f.sources.slice(0, 2).map((s) => (
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {latest && !isPro && (
        <p className="text-xs text-text-secondary">
          Upgrade to PRO to see the per-field details and run new checks.
        </p>
      )}
    </section>
  );
};
