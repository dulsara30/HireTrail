import React from 'react';
import { X } from 'lucide-react';
import { Spinner } from '../../atoms/Spinner';

export interface LinkOption {
  id: string;
  label: string;
  sub?: string;
}

interface LinkPickerProps {
  id: string;
  label: string;
  value: { id: string; label: string } | null;
  onChange: (value: { id: string; label: string } | null) => void;
  query: string;
  onQueryChange: (query: string) => void;
  options: LinkOption[];
  isLoading: boolean;
  placeholder: string;
  disabled?: boolean;
}

/** A small search box that links an item to an application or a company. */
export const LinkPicker: React.FC<LinkPickerProps> = ({
  id,
  label,
  value,
  onChange,
  query,
  onQueryChange,
  options,
  isLoading,
  placeholder,
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="space-y-1">
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase text-text-secondary">
        {label}
      </label>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border-default bg-bg-muted px-2.5 py-1.5 text-sm">
          <span className="truncate text-text-primary">{value.label || 'Linked'}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove the ${label.toLowerCase()} link`}
            className="rounded p-0.5 text-text-tertiary hover:text-text-danger"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id={id}
            value={query}
            disabled={disabled}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
          />
          {open && (
            <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border-default bg-bg-surface py-1 text-sm shadow-md">
              {isLoading && (
                <li className="flex justify-center py-2">
                  <Spinner size="sm" />
                </li>
              )}
              {!isLoading && options.length === 0 && (
                <li className="px-3 py-2 text-xs text-text-secondary">No match.</li>
              )}
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ id: option.id, label: option.label });
                      onQueryChange('');
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left hover:bg-bg-muted"
                  >
                    <span className="block truncate text-text-primary">{option.label}</span>
                    {option.sub && (
                      <span className="block truncate text-[11px] text-text-secondary">
                        {option.sub}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

interface PickerValue {
  id: string;
  label: string;
}

export interface LinkFieldProps {
  value: PickerValue | null;
  onChange: (value: PickerValue | null) => void;
}
