import React from 'react';
import { Columns3 } from 'lucide-react';
import { useBoard } from '../../../../api/hooks/queries/useBoard';
import { OPTION_COLOR_STYLES } from '../../../../constants/option-colors';
import { Spinner } from '../../../atoms/Spinner';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

/** How many applications sit in each stage of the pipeline. */
export const PipelineWidget: React.FC<WidgetProps> = ({ frame }) => {
  const { data, isLoading, isError } = useBoard({ archived: false });
  const lanes = data?.lanes ?? [];
  const max = Math.max(1, ...lanes.map((l) => l.total));

  return (
    <WidgetFrame title="Pipeline" icon={Columns3} {...frame}>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load the pipeline.
        </p>
      ) : lanes.length === 0 ? (
        <p className="py-3 text-center text-xs text-text-secondary">No stages yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {lanes.map((lane) => (
            <li key={lane.status.id} className="flex items-center gap-2 text-xs">
              <span className="w-24 flex-shrink-0 truncate font-medium text-text-primary">
                {lane.status.label}
              </span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-bg-muted">
                <span
                  className={`block h-full rounded-full ${OPTION_COLOR_STYLES[lane.status.color]?.swatch ?? 'bg-bg-accent'}`}
                  style={{ width: `${(lane.total / max) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums text-text-secondary">{lane.total}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
};
