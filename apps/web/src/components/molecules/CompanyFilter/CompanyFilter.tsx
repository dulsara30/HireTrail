import React from 'react';
import { Building2, X } from 'lucide-react';
import { useCompanySearch } from '../../../api/hooks/queries/useCompanySearch';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

export interface CompanyFilterValue {
  id: string;
  name: string;
}

interface CompanyFilterProps {
  value: CompanyFilterValue | null;
  onChange: (value: CompanyFilterValue | null) => void;
}

/** Type to find one of the user's companies (or a directory company) and filter by it. */
export const CompanyFilter: React.FC<CompanyFilterProps> = ({ value, onChange }) => {
  const [text, setText] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const q = useDebouncedValue(text.trim(), 250);
  const { data: results = [] } = useCompanySearch(q, open && !value);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (value) {
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-md border border-border-accent bg-bg-accent-subtle pl-3 pr-1.5 text-sm font-medium text-text-primary">
        <Building2 className="h-4 w-4 text-text-accent" aria-hidden="true" />
        <span className="max-w-[10rem] truncate">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove company filter ${value.name}`}
          className="rounded p-1 text-text-secondary hover:bg-bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Building2
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden="true"
      />
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Company"
        aria-label="Filter by company"
        role="combobox"
        aria-expanded={open}
        className="h-10 w-44 rounded-md border border-border-default bg-bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
      />
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-border-default bg-bg-surface p-1 shadow-lg"
        >
          {results.map((c) => (
            <li
              key={c.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange({ id: c.id, name: c.name });
                setText('');
                setOpen(false);
              }}
              className="cursor-pointer truncate rounded-md px-3 py-2 text-sm hover:bg-bg-accent-subtle"
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
