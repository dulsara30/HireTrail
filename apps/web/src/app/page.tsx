'use client';

import { AppShellTemplate } from '../components/templates/AppShellTemplate';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Chip } from '../components/atoms/Chip';
import { Spinner } from '../components/atoms/Spinner';
import { Skeleton } from '../components/atoms/Skeleton';
import { FormField } from '../components/molecules/FormField';
import { Input } from '../components/atoms/Input';
import { EmptyState } from '../components/molecules/EmptyState';
import { useHealth } from '../api/hooks/queries/useHealth';

export default function HomePage() {
  const { data: health, isLoading, isError, error, refetch } = useHealth();

  return (
    <AppShellTemplate>
      <div className="space-y-8">
        {/* System Health Status Banner */}
        <section className="p-6 rounded-lg border border-border-default bg-bg-surface shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">API Connectivity Check</h2>
              <p className="text-sm text-text-secondary mt-1">
                Testing communication with backend through the Next.js rewrite proxy (
                <code className="text-xs bg-bg-muted px-1.5 py-0.5 rounded">/api/v1/health</code>)
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Spinner size="sm" />
                  <span>Connecting to API...</span>
                </div>
              )}

              {isError && (
                <div className="flex items-center gap-2">
                  <Badge color="danger" dot>
                    API: disconnected
                  </Badge>
                  <Button size="sm" variant="secondary" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              )}

              {health && (
                <div className="flex items-center gap-2">
                  <Badge color="success" dot>
                    API: up (DB: {health.db})
                  </Badge>
                  <span className="text-xs text-text-tertiary">v{health.version}</span>
                </div>
              )}
            </div>
          </div>

          {isError && (
            <div className="mt-4 p-3 bg-bg-danger-subtle border border-border-danger rounded-md text-xs text-text-danger">
              Connection error: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}
        </section>

        {/* Phase 0 Design System Showcase */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-text-primary">
            Design System Foundations (Phase 0)
          </h2>

          {/* Atoms Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buttons */}
            <div className="p-5 border border-border-default rounded-lg bg-bg-surface space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Button Variants
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary (Inverse)</Button>
                <Button variant="accent">Accent Action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Badges & Chips */}
            <div className="p-5 border border-border-default rounded-lg bg-bg-surface space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Tag Palette Tokens
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge color="neutral">Saved</Badge>
                <Badge color="accent" dot>
                  Applied
                </Badge>
                <Badge color="info">Screening</Badge>
                <Badge color="purple">Interview</Badge>
                <Badge color="success">Offer</Badge>
                <Badge color="danger">Rejected</Badge>
                <Badge color="orange">Dream</Badge>
                <Badge color="teal">Full-time</Badge>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Chip color="neutral">Remote</Chip>
                <Chip color="purple" active>
                  Hybrid
                </Chip>
                <Chip color="accent" onRemove={() => {}}>
                  On-site
                </Chip>
              </div>
            </div>

            {/* Form Molecules */}
            <div className="p-5 border border-border-default rounded-lg bg-bg-surface space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Form Field Molecule
              </h3>
              <FormField
                id="demo-role"
                label="Target Role"
                required
                helperText="e.g. Senior Frontend Engineer"
              >
                <Input id="demo-role" placeholder="Role title..." />
              </FormField>
            </div>

            {/* Feedback & Loaders */}
            <div className="p-5 border border-border-default rounded-lg bg-bg-surface space-y-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Loading & Skeletons
              </h3>
              <div className="flex items-center gap-4">
                <Spinner size="sm" />
                <Spinner size="md" color="accent" />
                <Spinner size="lg" color="inverse" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton height="16px" width="80%" />
                <Skeleton height="16px" width="50%" />
              </div>
            </div>
          </div>

          {/* Empty State Molecule */}
          <div className="pt-4">
            <EmptyState
              title="Pipeline Ready"
              description="Phase 0 foundation complete. Authentication and pipeline tracking will be enabled in Phase 1."
              action={<Button variant="accent">Get Started</Button>}
            />
          </div>
        </section>
      </div>
    </AppShellTemplate>
  );
}
