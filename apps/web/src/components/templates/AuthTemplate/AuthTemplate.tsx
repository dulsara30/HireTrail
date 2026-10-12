import React from 'react';
import Link from 'next/link';
import { Columns3, ShieldCheck, Sparkles } from 'lucide-react';
import { HireTrailLogo } from '../../atoms/HireTrailLogo';

interface AuthTemplateProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const HIGHLIGHTS = [
  {
    icon: Columns3,
    title: 'One board for every application',
    text: 'Drag jobs through your own pipeline stages.',
  },
  {
    icon: Sparkles,
    title: 'Paste a job link, get it filled in',
    text: 'AI reads the post and fills every field for you to check.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data stays yours',
    text: 'Export everything or delete your account any time.',
  },
];

export function AuthTemplate({ title, subtitle, children }: AuthTemplateProps) {
  return (
    <div className="min-h-screen bg-bg-canvas lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel (desktop) */}
      <aside
        aria-label="About HireTrail"
        className="relative hidden flex-col justify-between overflow-hidden border-t-4 border-t-border-accent bg-bg-inverse p-12 text-text-inverse lg:flex"
      >
        <Link href="/" aria-label="HireTrail home" className="w-fit">
          <HireTrailLogo size="lg" inverted />
        </Link>

        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl font-black leading-tight tracking-tight">
              Track every job.
              <br />
              <span className="text-[var(--color-bg-accent)]">Land the right one.</span>
            </h2>
            <p className="max-w-md text-base text-text-tertiary">
              A calm, fast tracker for your whole job search, from the first save to the signed
              offer.
            </p>
          </div>

          <ul className="space-y-5">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.title} className="flex items-start gap-4">
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-accent text-text-primary"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{h.title}</p>
                    <p className="text-sm text-text-tertiary">{h.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-text-tertiary">© {new Date().getFullYear()} HireTrail</p>
      </aside>

      {/* Form */}
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Link href="/" aria-label="HireTrail home">
            <HireTrailLogo size="lg" />
          </Link>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border-default border-t-4 border-t-border-accent bg-bg-surface p-6 shadow-md sm:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
