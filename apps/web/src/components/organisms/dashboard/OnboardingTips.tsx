import React from 'react';
import Link from 'next/link';
import { Columns3, FileUp, Sparkles, X } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { ROUTES } from '../../../constants/routes';

const KEY = 'ht_onboarding_dismissed';

/** First-run tips for an empty account. Dismissal is a per-browser convenience only. */
export const OnboardingTips: React.FC = () => {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      // storage unavailable: hidden for this visit only
    }
  };

  const tips = [
    {
      icon: Columns3,
      title: 'Add your first application',
      text: 'Open the pipeline and press New Application. Drag cards between stages as things move.',
      href: ROUTES.pipeline,
      cta: 'Open pipeline',
    },
    {
      icon: Sparkles,
      title: 'Let AI fill it in (PRO)',
      text: 'Paste a job link or the whole post in the new application panel and every field is filled for you to check.',
      href: ROUTES.applications,
      cta: 'Go to applications',
    },
    {
      icon: FileUp,
      title: 'Bring your spreadsheet',
      text: 'Already tracking jobs in a sheet? Import the CSV and match the columns in a few clicks.',
      href: ROUTES.applications,
      cta: 'Import a CSV',
    },
  ];

  return (
    <section
      aria-labelledby="tips-title"
      className="space-y-4 rounded-2xl border border-border-accent bg-bg-accent-subtle p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="tips-title" className="text-base font-bold text-text-primary">
            Welcome to HireTrail
          </h2>
          <p className="text-sm text-text-secondary">Three quick ways to get started.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Dismiss tips">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {tips.map((tip) => {
          const Icon = tip.icon;
          return (
            <li
              key={tip.title}
              className="space-y-2 rounded-xl border border-border-default bg-bg-surface p-4"
            >
              <Icon className="h-5 w-5 text-text-accent" aria-hidden="true" />
              <h3 className="text-sm font-bold text-text-primary">{tip.title}</h3>
              <p className="text-xs text-text-secondary">{tip.text}</p>
              <Link
                href={tip.href}
                className="inline-block text-xs font-semibold text-text-accent hover:underline"
              >
                {tip.cta} →
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
