import React from 'react';
import {
  ORBIT_WIDGET_META,
  type OrbitSpaceDto,
  type OrbitWidgetDto,
  type OrbitWidgetType,
} from '@hiretrail/shared';
import { useUpdateOrbitSpace } from '../../../api/hooks/mutations/useOrbitSpaceMutations';
import {
  compact,
  findFreeSpot,
  limitsFor,
  moveBox,
  resizeBox,
} from '../../../utils/helpers/orbit/grid-layout';

const SAVE_DELAY_MS = 700;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The widgets of one space as the screen shows them. Every change shows at once and is saved a
 * moment later; the saved copy (with its new version) comes back through the query cache.
 */
export function useOrbitLayout(space: OrbitSpaceDto | undefined) {
  const save = useUpdateOrbitSpace();
  const [widgets, setWidgets] = React.useState<OrbitWidgetDto[]>(space?.widgets ?? []);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const spaceRef = React.useRef(space);
  const dirty = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = React.useRef(false);
  const latest = React.useRef(widgets);
  spaceRef.current = space;

  // Show what the server has, unless there are changes that are not saved yet
  React.useEffect(() => {
    if (!space || dirty.current) return;
    setWidgets(space.widgets);
    latest.current = space.widgets;
  }, [space?.id, space?.version, space?.widgets]);

  const flush = React.useCallback(async () => {
    const current = spaceRef.current;
    if (!current || inFlight.current || !dirty.current) return;
    inFlight.current = true;
    setSaving(true);
    const sending = latest.current;
    try {
      await save.mutateAsync({
        id: current.id,
        input: { widgets: sending, version: current.version },
      });
      setSaveError(null);
      // Changes made while saving are sent next
      if (latest.current === sending) dirty.current = false;
    } catch (error) {
      dirty.current = false;
      setSaveError((error as Error).message);
    } finally {
      inFlight.current = false;
      setSaving(false);
      if (dirty.current) void flush();
    }
  }, [save]);

  const commit = React.useCallback(
    (next: OrbitWidgetDto[]) => {
      latest.current = next;
      dirty.current = true;
      setWidgets(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const moveTo = (id: string, x: number, y: number) => commit(moveBox(latest.current, id, x, y));

  const resizeTo = (id: string, w: number, h: number) => {
    const widget = latest.current.find((b) => b.id === id);
    if (!widget) return;
    commit(resizeBox(latest.current, id, w, h, limitsFor(widget)));
  };

  const remove = (id: string) => commit(compact(latest.current.filter((w) => w.id !== id)));

  const add = (type: OrbitWidgetType) => {
    const meta = ORBIT_WIDGET_META[type];
    const spot = findFreeSpot(latest.current, meta.w, meta.h);
    commit([
      ...latest.current,
      { id: newId(), type, x: spot.x, y: spot.y, w: Math.min(meta.w, 12), h: meta.h, config: {} },
    ]);
  };

  const setConfig = (id: string, config: Record<string, unknown>) =>
    commit(latest.current.map((w) => (w.id === id ? { ...w, config } : w)));

  /** Replaces the whole layout, for example when a drag ends. */
  const replace = (next: OrbitWidgetDto[]) => commit(next);

  return { widgets, saving, saveError, moveTo, resizeTo, remove, add, setConfig, replace };
}
