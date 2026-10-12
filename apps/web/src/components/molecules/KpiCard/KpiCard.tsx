import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { type OptionColor } from '@hiretrail/shared';
import { OPTION_COLOR_STYLES } from '../../../constants/option-colors';

interface KpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  changePercentage?: number | null;
  suffix?: string;
  tone?: OptionColor;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subValue,
  changePercentage,
  suffix = '',
  tone = 'neutral',
}) => {
  const isPositive = (changePercentage ?? 0) > 0;
  const isNegative = (changePercentage ?? 0) < 0;
  const isNeutral = changePercentage === 0 || changePercentage === null;
  const styles = OPTION_COLOR_STYLES[tone];

  return (
    <div
      className={`p-5 border rounded-xl shadow-sm space-y-2 transition-shadow hover:shadow-md ${styles.bg} ${styles.border}`}
    >
      <p className={`text-xs font-bold tracking-wide uppercase ${styles.text}`}>{label}</p>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-3xl font-black tracking-tight text-text-primary">
          {value}
          {suffix && (
            <span className="text-sm font-semibold ml-0.5 text-text-secondary">{suffix}</span>
          )}
        </div>

        {changePercentage !== null && changePercentage !== undefined && (
          <div
            className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${
              isPositive
                ? 'bg-bg-success-subtle text-text-success border-tag-success-border'
                : isNegative
                  ? 'bg-bg-danger-subtle text-text-danger border-border-danger'
                  : 'bg-bg-surface text-text-secondary border-border-default'
            }`}
          >
            {isPositive && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
            {isNegative && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {isNeutral && <Minus className="w-3.5 h-3.5 mr-0.5" />}
            <span>{isPositive ? `+${changePercentage}%` : `${changePercentage}%`}</span>
          </div>
        )}
      </div>

      {subValue && <p className="text-[11px] text-text-secondary">{subValue}</p>}
    </div>
  );
};
