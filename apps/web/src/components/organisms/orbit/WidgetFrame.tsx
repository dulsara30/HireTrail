import React from 'react';
import { GripVertical, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/helpers/class-names';

interface WidgetFrameProps {
  title: string;
  icon: LucideIcon;
  /** Controls shown in the header (filters, date pickers, small buttons). */
  actions?: React.ReactNode;
  editMode?: boolean;
  /** Props for the grip, supplied by the board while editing. */
  gripProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}

/** The card every widget lives in. In edit mode it gets a grip to drag by and a remove button. */
export const WidgetFrame: React.FC<WidgetFrameProps> = ({
  title,
  icon: Icon,
  actions,
  editMode = false,
  gripProps,
  onRemove,
  children,
  className,
}) => (
  <section
    aria-label={title}
    className={cn(
      'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-bg-surface shadow-sm',
      editMode ? 'border-dashed border-border-accent' : 'border-border-default',
      className,
    )}
  >
    <header className="flex min-h-10 flex-shrink-0 items-center gap-2 border-b border-border-default px-3 py-1.5">
      {editMode && (
        <button
          type="button"
          {...gripProps}
          aria-label={`Move ${title}. Use the arrow keys, or hold Shift to resize.`}
          className="-ml-1 cursor-grab touch-none rounded p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-primary active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <Icon className="h-4 w-4 flex-shrink-0 text-text-accent" aria-hidden="true" />
      <h2 className="truncate text-sm font-semibold text-text-primary">{title}</h2>
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        {actions}
      </div>
      {editMode && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="rounded p-1 text-text-tertiary hover:bg-bg-muted hover:text-text-danger"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </header>
    <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
  </section>
);
