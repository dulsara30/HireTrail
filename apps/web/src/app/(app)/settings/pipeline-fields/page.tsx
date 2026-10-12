'use client';

import React from 'react';
import { OptionType } from '@hiretrail/shared';
import { OptionManager } from '../../../../components/organisms/settings/OptionManager';

type TabKey = OptionType | 'COVER_LETTER';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: OptionType.STATUS, label: 'Status' },
  { key: OptionType.PRIORITY, label: 'Priority' },
  { key: OptionType.JOB_TYPE, label: 'Job Type' },
  { key: OptionType.LEVEL, label: 'Level' },
  { key: OptionType.WORK_MODE, label: 'Work Mode' },
  { key: OptionType.SOURCE, label: 'Source' },
  { key: OptionType.CV_VERSION, label: 'CV Version' },
  { key: OptionType.LABEL, label: 'Labels' },
  { key: 'COVER_LETTER', label: 'Cover Letter' },
];

export default function ConfigurationPage() {
  const [tab, setTab] = React.useState<TabKey>(OptionType.STATUS);
  const current = TABS.find((t) => t.key === tab) ?? TABS[0]!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Configuration</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Shape the pipeline and the fields to match how you search for jobs.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Configuration sections"
        className="flex flex-wrap gap-1.5 rounded-xl border border-border-default bg-bg-surface p-1.5 shadow-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'bg-bg-accent text-text-primary shadow-sm'
                : 'text-text-secondary hover:bg-bg-accent-subtle hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'COVER_LETTER' ? (
          <div className="rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm">
            <h2 className="text-base font-bold text-text-primary">Cover Letter</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Cover letter is a simple Yes / No field on every application, so there is nothing to
              configure. Set it when you create an application or any time from the side panel, and
              show or hide it as a column in the Applications table.
            </p>
          </div>
        ) : (
          <OptionManager key={tab} type={tab} title={current.label} />
        )}
      </div>
    </div>
  );
}
