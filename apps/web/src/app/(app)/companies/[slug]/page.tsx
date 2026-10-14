'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCompany } from '../../../../api/hooks/queries/useCompany';
import { CompanyNotes } from '../../../../components/organisms/companies/CompanyNotes';
import { LinkedItems } from '../../../../components/organisms/orbit/LinkedItems';
import { VerificationPanel } from '../../../../components/organisms/companies/VerificationPanel';
import { Badge } from '../../../../components/atoms/Badge';
import { Button } from '../../../../components/atoms/Button';
import { Spinner } from '../../../../components/atoms/Spinner';
import { ROUTES } from '../../../../constants/routes';
import { Building2, Globe, MapPin, Mail, ExternalLink, ChevronLeft, Briefcase } from 'lucide-react';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { data: company, isLoading, isError } = useCompany(slug);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="md" />
        <p className="text-sm text-text-secondary">Loading company profile...</p>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="p-8 text-center bg-bg-surface border border-border-default rounded-xl space-y-4">
        <p className="text-sm text-text-danger">Company profile not found.</p>
        <Button variant="secondary" onClick={() => router.push(ROUTES.companies)}>
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.companies)}
          className="gap-1.5 text-text-secondary pl-0 hover:bg-transparent hover:text-text-primary"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Button>
      </div>

      {/* Hero header */}
      <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-bg-surface-raised border border-border-default flex items-center justify-center text-accent-500 shadow-xs shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{company.name}</h1>
              {company.tier && (
                <Badge color={company.tier === 'A' ? 'accent' : 'neutral'}>
                  Tier {company.tier}
                </Badge>
              )}
              {company.isGlobal ? (
                <Badge color="neutral">Global Directory</Badge>
              ) : (
                <Badge color="accent">Private Record</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap pt-1">
              {company.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>{company.location}</span>
                </div>
              )}
              {company.websiteUrl && (
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-text-accent hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {company.careersUrl && (
                <a
                  href={company.careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-text-accent hover:underline"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Careers</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {company.contactEmail && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                  <span>{company.contactEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <VerificationPanel company={company} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Ratings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {company.description && (
            <div className="p-6 bg-bg-surface border border-border-default rounded-xl space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">About</h2>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {company.description}
              </p>
            </div>
          )}

          {/* Report Ratings (Unverified) */}
          {company.reportRatings && (
            <div className="p-6 bg-bg-surface border border-border-default rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    Research Report Ratings
                  </h2>
                  <p className="text-xs text-text-tertiary">
                    Sourced from initial industry analysis reports
                  </p>
                </div>
                <Badge color="orange">Unverified</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(company.reportRatings).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3 bg-bg-surface-raised rounded-lg border border-border-subtle"
                  >
                    <span className="text-[11px] font-medium text-text-tertiary capitalize block">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-lg font-bold text-text-primary mt-0.5 block">
                      {val} <span className="text-xs font-normal text-text-tertiary">/ 10</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack */}
          {company.techStack && company.techStack.length > 0 && (
            <div className="p-6 bg-bg-surface border border-border-default rounded-xl space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">Tech Stack</h2>
              <div className="flex flex-wrap gap-1.5">
                {company.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 text-xs rounded-md bg-bg-surface-raised border border-border-default text-text-secondary font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* My Applications to this company */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-xl space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">
              My Applications ({company.myApplications?.length || 0})
            </h2>

            {company.myApplications && company.myApplications.length > 0 ? (
              <div className="space-y-2">
                {company.myApplications.map((app) => (
                  <Link
                    key={app.id}
                    href={ROUTES.applications}
                    className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-bg-surface-raised hover:border-border-focus transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{app.roleTitle}</p>
                      {app.appliedAt && (
                        <p className="text-xs text-text-tertiary">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">
                You haven&apos;t added any applications for this company yet.
              </p>
            )}
          </div>

          {/* Tasks, reminders and company watches linked to this company */}
          <div className="rounded-xl border border-border-default bg-bg-surface p-6">
            <LinkedItems companyId={company.id} subject={company.name} />
          </div>
        </div>

        {/* Right Column: Private Notes & Personal Rating */}
        <div className="space-y-6">
          <CompanyNotes companyId={company.id} initialRating={company.myNotes?.myRating ?? null} />
        </div>
      </div>
    </div>
  );
}
