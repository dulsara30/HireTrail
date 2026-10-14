import React from 'react';
import { AlarmClock } from 'lucide-react';
import { snoozeOptions } from '../../../utils/helpers/orbit/orbit-dates';

interface SnoozeMenuProps {
  now: Date;
  onSnooze: (until: Date) => void;
  label?: string;
}

/** A small menu of quick snooze times ("tomorrow", "next Monday"). */
export const SnoozeMenu: React.FC<SnoozeMenuProps> = ({ now, onSnooze, label = 'Snooze' }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="rounded-md p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-primary"
      >
        <AlarmClock className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-border-default bg-bg-surface py-1 text-xs shadow-md"
        >
          {snoozeOptions(now).map((option) => (
            <li key={option.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSnooze(option.at);
                }}
                className="block w-full px-3 py-1.5 text-left text-text-primary hover:bg-bg-muted"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
