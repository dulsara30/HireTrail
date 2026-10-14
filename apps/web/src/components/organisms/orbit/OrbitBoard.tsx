import React from 'react';
import { ORBIT_GRID, type OrbitWidgetDto } from '@hiretrail/shared';
import { useElementSize } from '../../../hooks/useElementSize';
import {
  layoutHeight,
  limitsFor,
  moveBox,
  resizeBox,
  GRID_COLUMNS,
} from '../../../utils/helpers/orbit/grid-layout';

const GAP = 12;
const ROW_HEIGHT = 84;
/** Below this width the board becomes one column. */
const STACK_BELOW = 700;

interface DragState {
  id: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  base: OrbitWidgetDto;
  dx: number;
  dy: number;
}

interface OrbitBoardProps {
  widgets: OrbitWidgetDto[];
  editMode: boolean;
  onChange: (widgets: OrbitWidgetDto[]) => void;
  renderWidget: (
    widget: OrbitWidgetDto,
    edit: {
      gripProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
      onRemove: () => void;
    },
  ) => React.ReactNode;
  onRemove: (id: string) => void;
}

/**
 * A 12-column board. In edit mode widgets can be dragged by their grip and resized from the corner
 * (or with the arrow keys). Widgets in the way are pushed down, so nothing ever overlaps.
 */
export const OrbitBoard: React.FC<OrbitBoardProps> = ({
  widgets,
  editMode,
  onChange,
  renderWidget,
  onRemove,
}) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const stacked = size.width > 0 && size.width < STACK_BELOW;
  const colWidth = size.width > 0 ? (size.width - GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS : 0;
  const cellW = colWidth + GAP;
  const cellH = ROW_HEIGHT + GAP;

  const preview = React.useMemo(() => {
    if (!drag) return widgets;
    const dxCells = Math.round(drag.dx / cellW);
    const dyCells = Math.round(drag.dy / cellH);
    if (drag.mode === 'move') {
      return moveBox(widgets, drag.id, drag.base.x + dxCells, drag.base.y + dyCells);
    }
    return resizeBox(
      widgets,
      drag.id,
      drag.base.w + dxCells,
      drag.base.h + dyCells,
      limitsFor(drag.base),
    );
  }, [drag, widgets, cellW, cellH]);

  // The latest drag and layout, so the window listeners always read current values
  const live = React.useRef({ drag, widgets, cellW, cellH, onChange });
  live.current = { drag, widgets, cellW, cellH, onChange };
  const dragging = drag !== null;

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) =>
      setDrag((current) =>
        current
          ? { ...current, dx: event.clientX - current.startX, dy: event.clientY - current.startY }
          : current,
      );
    const onUp = () => {
      const { drag: current, widgets: items, cellW: w, cellH: h, onChange: change } = live.current;
      setDrag(null);
      if (current) change(previewFor(current, items, w, h));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);

  const startDrag =
    (widget: OrbitWidgetDto, mode: DragState['mode']) => (event: React.PointerEvent) => {
      if (!editMode || stacked) return;
      event.preventDefault();
      setDrag({
        id: widget.id,
        mode,
        startX: event.clientX,
        startY: event.clientY,
        base: widget,
        dx: 0,
        dy: 0,
      });
    };

  /** Arrow keys move the widget one cell; with Shift they resize it. */
  const onKeyDown = (widget: OrbitWidgetDto) => (event: React.KeyboardEvent) => {
    if (!editMode || stacked) return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = step[event.key];
    if (!delta) return;
    event.preventDefault();
    onChange(
      event.shiftKey
        ? resizeBox(widgets, widget.id, widget.w + delta[0], widget.h + delta[1], limitsFor(widget))
        : moveBox(widgets, widget.id, widget.x + delta[0], widget.y + delta[1]),
    );
  };

  if (stacked) {
    const ordered = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
    return (
      <div ref={ref} className="flex flex-col gap-3">
        {ordered.map((widget) => (
          <div key={widget.id} style={{ height: widget.h * ROW_HEIGHT + (widget.h - 1) * GAP }}>
            {renderWidget(widget, { gripProps: {}, onRemove: () => onRemove(widget.id) })}
          </div>
        ))}
      </div>
    );
  }

  const rows = Math.max(layoutHeight(preview), 1);
  const height = rows * cellH - GAP;
  const placeholder = drag ? preview.find((w) => w.id === drag.id) : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height: Math.max(height, ROW_HEIGHT) }}>
      {colWidth > 0 && placeholder && drag && (
        <div
          aria-hidden="true"
          className="absolute rounded-xl border-2 border-dashed border-border-accent bg-bg-accent-subtle"
          style={box(placeholder, cellW, cellH)}
        />
      )}
      {colWidth > 0 &&
        widgets.map((widget) => {
          const shown = preview.find((w) => w.id === widget.id) ?? widget;
          const dragging = drag?.id === widget.id;
          const rect = box(dragging && drag.mode === 'move' ? widget : shown, cellW, cellH);
          const style: React.CSSProperties = dragging
            ? drag.mode === 'move'
              ? { ...rect, transform: `translate(${drag.dx}px, ${drag.dy}px)`, zIndex: 20 }
              : {
                  ...rect,
                  width: Math.max(rect.width + drag.dx, cellW),
                  height: Math.max(rect.height + drag.dy, cellH),
                  zIndex: 20,
                }
            : rect;
          return (
            <div
              key={widget.id}
              className={`absolute ${dragging ? 'opacity-95 shadow-lg' : 'transition-[left,top,width,height] duration-150 motion-reduce:transition-none'}`}
              style={style}
            >
              {renderWidget(widget, {
                gripProps: {
                  onPointerDown: startDrag(widget, 'move'),
                  onKeyDown: onKeyDown(widget),
                },
                onRemove: () => onRemove(widget.id),
              })}
              {editMode && (
                <button
                  type="button"
                  aria-label={`Resize ${widget.type.toLowerCase()} widget`}
                  onPointerDown={startDrag(widget, 'resize')}
                  className="absolute bottom-1 right-1 z-10 h-4 w-4 cursor-nwse-resize touch-none rounded-sm border-b-2 border-r-2 border-border-accent"
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

function box(
  widget: OrbitWidgetDto,
  cellW: number,
  cellH: number,
): React.CSSProperties & { width: number; height: number } {
  return {
    left: widget.x * cellW,
    top: widget.y * cellH,
    width: widget.w * cellW - GAP,
    height: widget.h * cellH - GAP,
  };
}

function previewFor(
  drag: DragState,
  widgets: OrbitWidgetDto[],
  cellW: number,
  cellH: number,
): OrbitWidgetDto[] {
  const dxCells = Math.round(drag.dx / cellW);
  const dyCells = Math.round(drag.dy / cellH);
  return drag.mode === 'move'
    ? moveBox(widgets, drag.id, drag.base.x + dxCells, drag.base.y + dyCells)
    : resizeBox(
        widgets,
        drag.id,
        drag.base.w + dxCells,
        drag.base.h + dyCells,
        limitsFor(drag.base),
      );
}

export const ORBIT_BOARD_MAX_ROWS = ORBIT_GRID.MAX_ROWS;
