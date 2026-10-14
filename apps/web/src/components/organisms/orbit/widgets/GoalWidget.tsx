import React from 'react';
import { Target } from 'lucide-react';
import { useUpdateOrbitSettings } from '../../../../api/hooks/mutations/useOrbitSpaceMutations';
import { useOrbitPulse } from '../../../../api/hooks/queries/useOrbitQueries';
import { Spinner } from '../../../atoms/Spinner';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

const R = 38;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** A ring that fills as you send applications this week. The goal is yours to set. */
export const GoalWidget: React.FC<WidgetProps> = ({ frame }) => {
  const { data, isLoading } = useOrbitPulse();
  const update = useUpdateOrbitSettings();
  const goal = data?.weeklyGoal ?? 5;
  const applied = data?.appliedThisWeek ?? 0;
  const progress = Math.min(applied / goal, 1);

  return (
    <WidgetFrame title="Weekly goal" icon={Target} {...frame}>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <svg
            width="104"
            height="104"
            viewBox="0 0 104 104"
            role="img"
            aria-label={`${applied} of ${goal} applications this week`}
          >
            <circle cx="52" cy="52" r={R} fill="none" strokeWidth="9" className="stroke-bg-muted" />
            <circle
              cx="52"
              cy="52"
              r={R}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              transform="rotate(-90 52 52)"
              className={progress >= 1 ? 'stroke-text-success' : 'stroke-bg-accent'}
              style={{ transition: 'stroke-dashoffset 400ms ease' }}
            />
            <text x="52" y="52" textAnchor="middle" className="fill-text-primary text-xl font-bold">
              {applied}/{goal}
            </text>
            <text x="52" y="68" textAnchor="middle" className="fill-text-secondary text-[10px]">
              this week
            </text>
          </svg>
          <label className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            Goal
            <input
              type="number"
              min={1}
              max={100}
              defaultValue={goal}
              key={goal}
              aria-label="Applications per week"
              onBlur={(e) => {
                const next = Math.min(Math.max(Number(e.target.value) || goal, 1), 100);
                if (next !== goal) update.mutate({ weeklyGoal: next });
              }}
              className="w-12 rounded-md border border-border-default bg-bg-surface px-1.5 py-0.5 text-center text-xs"
            />
            a week
          </label>
        </div>
      )}
    </WidgetFrame>
  );
};
