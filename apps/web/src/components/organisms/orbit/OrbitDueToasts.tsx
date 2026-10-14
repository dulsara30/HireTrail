import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { type OrbitTaskDto } from '@hiretrail/shared';
import { useOrbitDue } from '../../../api/hooks/queries/useOrbitQueries';
import { ROUTES } from '../../../constants/routes';
import { useOrbitUiStore } from '../../../store/orbit-ui.store';
import { showDesktopAlert } from '../../../utils/helpers/orbit/desktop-alerts';
import { KindBadge } from '../../molecules/KindBadge';

const SEEN_KEY = 'ht_orbit_seen';
const MAX_SEEN = 200;
const SHOW_MS = 12_000;

const keyOf = (task: OrbitTaskDto): string => `${task.id}:${task.remindAt ?? task.dueAt ?? ''}`;

function loadSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function saveSeen(keys: string[]): void {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(keys.slice(-MAX_SEEN)));
  } catch {
    // storage is not available: the toast may show again next time
  }
}

/** A small toast when something becomes due while the app is open. Each reminder shows once. */
export const OrbitDueToasts: React.FC = () => {
  const router = useRouter();
  const select = useOrbitUiStore((s) => s.select);
  const { data } = useOrbitDue();
  const [visible, setVisible] = React.useState<OrbitTaskDto[]>([]);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!data) return;
    const seen = loadSeen();
    const fresh = data.due.filter((t) => !seen.includes(keyOf(t)));
    if (fresh.length === 0) return;
    saveSeen([...seen, ...fresh.map(keyOf)]);
    // A native alert too, when the person turned desktop alerts on
    for (const task of fresh.slice(0, 3)) showDesktopAlert('Due now', task.title);
    // The very first load only marks what is already due, so old items do not pop up all at once
    if (!started.current) {
      started.current = true;
      setVisible(fresh.slice(0, 2));
    } else {
      setVisible((current) => [...current, ...fresh].slice(-3));
    }
  }, [data]);

  React.useEffect(() => {
    if (visible.length === 0) return;
    const id = setTimeout(() => setVisible((v) => v.slice(1)), SHOW_MS);
    return () => clearTimeout(id);
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
    >
      {visible.map((task) => (
        <div
          key={keyOf(task)}
          role="status"
          className="pointer-events-auto flex items-start gap-2 rounded-xl border border-border-accent bg-bg-surface p-3 shadow-lg"
        >
          <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-accent" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold text-text-secondary">Due now</p>
            <p className="truncate text-sm font-semibold text-text-primary">{task.title}</p>
            <KindBadge kind={task.kind} />
            <button
              type="button"
              onClick={() => {
                select({ type: 'task', id: task.id });
                router.push(ROUTES.orbit);
                setVisible((v) => v.filter((t) => t.id !== task.id));
              }}
              className="block text-xs font-semibold text-text-accent hover:underline"
            >
              Open
            </button>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setVisible((v) => v.filter((t) => t.id !== task.id))}
            className="rounded p-0.5 text-text-tertiary hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
};
