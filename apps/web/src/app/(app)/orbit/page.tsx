'use client';

import React from 'react';
import { LayoutGrid, Lock, Orbit as OrbitIcon, Plus, Settings2 } from 'lucide-react';
import {
  useOrbitPlan,
  useOrbitSettings,
  useOrbitSpaces,
} from '../../../api/hooks/queries/useOrbitQueries';
import { useUpdateOrbitSettings } from '../../../api/hooks/mutations/useOrbitSpaceMutations';
import { ApplicationPanel } from '../../../components/organisms/applications/ApplicationPanel';
import { ItemPanel } from '../../../components/organisms/orbit/ItemPanel';
import { OrbitBoard } from '../../../components/organisms/orbit/OrbitBoard';
import { OrbitFilterBar } from '../../../components/organisms/orbit/OrbitFilterBar';
import { OrbitSettingsDialog } from '../../../components/organisms/orbit/OrbitSettingsDialog';
import { QuickAdd } from '../../../components/organisms/orbit/QuickAdd';
import { SpaceTabs } from '../../../components/organisms/orbit/SpaceTabs';
import { WidgetGallery } from '../../../components/organisms/orbit/WidgetGallery';
import { useOrbitLayout } from '../../../components/organisms/orbit/useOrbitLayout';
import { WIDGET_COMPONENTS } from '../../../components/organisms/orbit/widgets/widget-registry';
import { Button } from '../../../components/atoms/Button';
import { Spinner } from '../../../components/atoms/Spinner';
import { EmptyState } from '../../../components/molecules/EmptyState';
import { useOrbitUiStore } from '../../../store/orbit-ui.store';

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function OrbitPage() {
  const { data: spaces, isLoading, isError, refetch } = useOrbitSpaces();
  const { data: plan } = useOrbitPlan();
  const { data: settings } = useOrbitSettings();
  const updateSettings = useUpdateOrbitSettings();

  const activeSpaceId = useOrbitUiStore((s) => s.activeSpaceId);
  const setActiveSpaceId = useOrbitUiStore((s) => s.setActiveSpaceId);
  const editMode = useOrbitUiStore((s) => s.editMode);
  const setEditMode = useOrbitUiStore((s) => s.setEditMode);
  const selected = useOrbitUiStore((s) => s.selected);
  const select = useOrbitUiStore((s) => s.select);
  const galleryOpen = useOrbitUiStore((s) => s.galleryOpen);
  const setGalleryOpen = useOrbitUiStore((s) => s.setGalleryOpen);

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [applicationId, setApplicationId] = React.useState<string | null>(null);

  const active = React.useMemo(
    () => spaces?.find((s) => s.id === activeSpaceId) ?? spaces?.[0],
    [spaces, activeSpaceId],
  );
  const layout = useOrbitLayout(active);

  // Remember the browser's time zone once, so "today" and the morning email match this person's clock
  const zoneSet = React.useRef(false);
  React.useEffect(() => {
    if (!settings || zoneSet.current) return;
    zoneSet.current = true;
    const zone = browserTimeZone();
    if (settings.timezone === 'UTC' && zone !== 'UTC') updateSettings.mutate({ timezone: zone });
  }, [settings]);

  // Leave edit mode and close panels when going to another space
  React.useEffect(() => {
    setEditMode(false);
  }, [active?.id, setEditMode]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !spaces || !active) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <EmptyState
          icon={<OrbitIcon className="h-8 w-8" />}
          title="Orbit could not load"
          description="Check your connection and try again."
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </div>
    );
  }

  const pro = plan?.plan === 'PRO';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <OrbitIcon className="h-6 w-6 text-text-accent" aria-hidden="true" />
            Orbit
          </h1>
          <p className="text-sm text-text-secondary">
            Tasks, reminders, interviews and deadlines in one place. Closer to the middle means
            sooner.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan && !pro && (
            <span
              className="flex items-center gap-1.5 rounded-full border border-border-accent bg-bg-accent-subtle px-3 py-1 text-xs font-medium text-text-primary"
              title="Free plan limits. PRO removes them."
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              {plan.openTasks}/{plan.limits.tasks} tasks · {plan.openReminders}/
              {plan.limits.reminders} reminders
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" aria-hidden="true" /> Settings
          </Button>
          {editMode && (
            <Button variant="secondary" size="sm" onClick={() => setGalleryOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add widget
            </Button>
          )}
          <Button
            variant={editMode ? 'accent' : 'secondary'}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            aria-pressed={editMode}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {editMode ? 'Done' : 'Edit layout'}
          </Button>
        </div>
      </div>

      <QuickAdd />
      <OrbitFilterBar />
      <SpaceTabs
        spaces={spaces}
        activeId={active.id}
        onSelect={(id) => setActiveSpaceId(id)}
        plan={plan}
        editMode={editMode}
      />

      {editMode && (
        <p
          role="status"
          className="rounded-lg bg-bg-accent-subtle px-3 py-2 text-xs text-text-secondary"
        >
          Drag a widget by its handle, resize it from the corner, or use the arrow keys on the
          handle (hold Shift to resize).{' '}
          {layout.saving ? (
            'Saving…'
          ) : layout.saveError ? (
            <span className="text-text-danger">{layout.saveError}</span>
          ) : (
            'Changes save by themselves.'
          )}
        </p>
      )}

      {layout.widgets.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-8 w-8" />}
          title="An empty board"
          description="Add widgets to build your own command center."
          action={
            <Button
              onClick={() => {
                setEditMode(true);
                setGalleryOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add a widget
            </Button>
          }
        />
      ) : (
        <OrbitBoard
          widgets={layout.widgets}
          editMode={editMode}
          onChange={layout.replace}
          onRemove={layout.remove}
          renderWidget={(widget, edit) => {
            const Component = WIDGET_COMPONENTS[widget.type];
            return (
              <Component
                widget={widget}
                frame={{ editMode, gripProps: edit.gripProps, onRemove: edit.onRemove }}
                onConfigChange={(config) => layout.setConfig(widget.id, config)}
              />
            );
          }}
        />
      )}

      {selected && (
        <ItemPanel
          // A fresh form for every item, so one item's edits never leak into the next
          key={
            selected.type === 'task'
              ? selected.id
              : selected.type === 'application'
                ? selected.event.id
                : 'new'
          }
          selection={selected}
          onClose={() => select(null)}
          onSelect={select}
          onOpenApplication={(id) => {
            select(null);
            setApplicationId(id);
          }}
        />
      )}
      {galleryOpen && (
        <WidgetGallery
          widgets={layout.widgets}
          plan={plan}
          onAdd={(type) => {
            layout.add(type);
            setGalleryOpen(false);
          }}
          onClose={() => setGalleryOpen(false)}
        />
      )}
      {settingsOpen && <OrbitSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {applicationId && (
        <ApplicationPanel applicationId={applicationId} onClose={() => setApplicationId(null)} />
      )}
    </div>
  );
}
