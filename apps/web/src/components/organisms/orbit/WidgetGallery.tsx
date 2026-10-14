import React from 'react';
import { Lock, Plus, X } from 'lucide-react';
import {
  ORBIT_WIDGET_META,
  ORBIT_WIDGET_TYPES,
  type OrbitPlanDto,
  type OrbitWidgetDto,
  type OrbitWidgetType,
} from '@hiretrail/shared';
import { Button } from '../../atoms/Button';
import { WIDGET_ICONS } from './widgets/widget-registry';

interface WidgetGalleryProps {
  widgets: OrbitWidgetDto[];
  plan: OrbitPlanDto | undefined;
  onAdd: (type: OrbitWidgetType) => void;
  onClose: () => void;
}

/** A drawer with every widget. Pro-only ones are marked and locked on the Free plan. */
export const WidgetGallery: React.FC<WidgetGalleryProps> = ({ widgets, plan, onAdd, onClose }) => {
  const limit = plan?.limits.widgetsPerSpace ?? 8;
  const full = widgets.length >= limit;

  React.useEffect(() => {
    const esc = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-bg-inverse/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Add a widget"
        className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-border-default bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-accent bg-bg-accent-subtle px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-text-primary">Add a widget</h2>
            <p className="text-xs text-text-secondary">
              {widgets.length} of {limit} on this space
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {ORBIT_WIDGET_TYPES.map((type) => {
            const meta = ORBIT_WIDGET_META[type];
            const Icon = WIDGET_ICONS[type];
            const locked = meta.pro && plan?.plan === 'FREE';
            const count = widgets.filter((w) => w.type === type).length;
            return (
              <li
                key={type}
                className="flex items-start gap-3 rounded-xl border border-border-default p-3"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-accent-subtle text-text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    {meta.label}
                    {meta.pro && (
                      <span className="rounded-md bg-bg-accent px-1.5 py-0.5 text-[10px] font-bold text-text-primary">
                        PRO
                      </span>
                    )}
                    {count > 0 && (
                      <span className="text-[11px] font-normal text-text-tertiary">on board</span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">{meta.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={locked || full}
                  title={
                    locked
                      ? 'This widget is a PRO feature'
                      : full
                        ? `The limit is ${limit} widgets`
                        : undefined
                  }
                  onClick={() => onAdd(type)}
                  aria-label={`Add ${meta.label}`}
                >
                  {locked ? (
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
        {plan?.plan === 'FREE' && (
          <p className="border-t border-border-default px-5 py-3 text-xs text-text-secondary">
            The Free plan has {plan.limits.widgetsPerSpace} widgets per space and the core widgets.
            PRO adds the rest and up to 24 widgets.
          </p>
        )}
      </aside>
    </div>
  );
};
