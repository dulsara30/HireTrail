import {
  useCompleteOrbitTask,
  useReopenOrbitTask,
} from '../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitUiStore, type OrbitSelection } from '../../../store/orbit-ui.store';
import { type OrbitListItem } from '../../../utils/helpers/orbit/orbit-events';

/** What every widget does with an item: open it, tick it off, or start a new one. */
export function useOrbitActions() {
  const select = useOrbitUiStore((s) => s.select);
  const complete = useCompleteOrbitTask();
  const reopen = useReopenOrbitTask();

  const open = (item: OrbitListItem) =>
    select(
      item.source === 'task' && item.task
        ? { type: 'task', id: item.task.id }
        : item.application
          ? { type: 'application', event: item.application }
          : null,
    );

  const toggleDone = (item: OrbitListItem) => {
    if (!item.task) return;
    const input = { id: item.task.id, version: item.task.version };
    if (item.done) reopen.mutate(input);
    else complete.mutate(input);
  };

  const openNew = (draft?: Extract<OrbitSelection, { type: 'new' }>['draft']) =>
    select({ type: 'new', draft });

  return { open, toggleDone, openNew, error: complete.error ?? reopen.error };
}
