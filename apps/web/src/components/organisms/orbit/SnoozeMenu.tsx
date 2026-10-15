import React from 'react';
import { createPortal } from 'react-dom';
import { AlarmClock } from 'lucide-react';
import { snoozeOptions } from '../../../utils/helpers/orbit/orbit-dates';
import { placeMenu, type MenuPlacement } from '../../../utils/helpers/orbit/menu-placement';

interface SnoozeMenuProps {
  now: Date;
  onSnooze: (until: Date) => void;
  label?: string;
}

const MENU_WIDTH = 160;
const ROW_HEIGHT = 32;

/**
 * A small menu of quick snooze times ("tomorrow", "next Monday"). The list is drawn on top of the page
 * (not inside the widget or the side panel), so it is never clipped, and it opens upward when the
 * button is near the bottom of the window.
 */
export const SnoozeMenu: React.FC<SnoozeMenuProps> = ({ now, onSnooze, label = 'Snooze' }) => {
  const [open, setOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState<MenuPlacement | null>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  const menu = React.useRef<HTMLUListElement>(null);
  const options = snoozeOptions(now);

  const reposition = React.useCallback(() => {
    if (!button.current) return;
    const rect = button.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight ?? options.length * ROW_HEIGHT + 8;
    setPlacement(
      placeMenu(
        rect,
        { width: MENU_WIDTH, height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [options.length]);

  // Place the menu before it is first drawn, then again once its real height is known
  React.useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const closeOnScroll = (event: Event) => {
      // Scrolling inside the menu itself should not close it
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [open, reposition]);

  React.useEffect(() => {
    if (open) menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open, placement]);

  const move = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  return (
    <>
      <button
        ref={button}
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
      {open &&
        createPortal(
          <ul
            ref={menu}
            role="menu"
            onKeyDown={move}
            style={{
              position: 'fixed',
              top: placement?.top ?? 0,
              left: placement?.left ?? 0,
              width: MENU_WIDTH,
              visibility: placement ? 'visible' : 'hidden',
            }}
            className="z-[90] rounded-lg border border-border-default bg-bg-surface py-1 text-xs shadow-md"
          >
            {options.map((option) => (
              <li key={option.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSnooze(option.at);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-text-primary hover:bg-bg-muted focus:bg-bg-muted focus:outline-none"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
};
