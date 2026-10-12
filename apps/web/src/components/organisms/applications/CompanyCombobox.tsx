import React from 'react';
import { Building2, Plus, Sparkles } from 'lucide-react';
import { useMe } from '../../../api/hooks/queries/useMe';
import { useCompanySearch } from '../../../api/hooks/queries/useCompanySearch';
import { useCompanyAiLookup } from '../../../api/hooks/mutations/useCompanyAiLookup';
import { useCreateCompany } from '../../../api/hooks/mutations/useCreateCompany';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { Spinner } from '../../atoms/Spinner';

export interface CompanyValue {
  name: string;
  companyId: string | null;
}

interface CompanyComboboxProps {
  id: string;
  value: CompanyValue;
  onChange: (value: CompanyValue) => void;
  /** Called when the user types, so the caller can drop the AI sparkle. */
  onEdited?: () => void;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Picks a company that already exists (directory or the user's own). When nothing matches,
 * offers "Add as new company": PRO users get an AI lookup that fills the profile first.
 */
export const CompanyCombobox: React.FC<CompanyComboboxProps> = ({
  id,
  value,
  onChange,
  onEdited,
}) => {
  const { data: me } = useMe();
  const isPro = me?.plan === 'PRO';
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [creating, setCreating] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const debounced = useDebouncedValue(value.name.trim(), 250);
  const { data: results = [], isFetching } = useCompanySearch(debounced, open);
  const lookup = useCompanyAiLookup();
  const createCompany = useCreateCompany();

  const typed = value.name.trim();
  const exact = results.some((c) => normalize(c.name) === normalize(typed));
  const canAdd = typed.length >= 2 && !exact && debounced === typed;
  const rowCount = results.length + (canAdd ? 1 : 0);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const select = (name: string, companyId: string) => {
    onChange({ name, companyId });
    setOpen(false);
    setMessage(null);
  };

  const addAsNew = async () => {
    setCreating(true);
    setMessage(null);
    try {
      let profile: Parameters<typeof createCompany.mutateAsync>[0] = { name: typed };
      if (isPro) {
        try {
          const result = await lookup.mutateAsync({ name: typed });
          if (result.found && result.profile) {
            const p = result.profile;
            profile = {
              name: p.name || typed,
              websiteUrl: p.website,
              careersUrl: p.careersUrl,
              country: p.country,
              location: p.city,
              industry: p.industry,
              size: p.size,
              description: p.description,
              fromAiLookup: true,
            };
            setMessage('Company details were filled in by AI. Check them on the company page.');
          } else {
            setMessage('No reliable details found online. Added with just the name.');
          }
        } catch {
          setMessage('AI lookup is unavailable right now. Added with just the name.');
        }
      }
      try {
        const company = await createCompany.mutateAsync(profile);
        onChange({ name: company.name, companyId: company.id });
      } catch (err) {
        const e = err as { code?: string; details?: { existingId?: string } };
        if (e.code === 'DUPLICATE' && e.details?.existingId) {
          onChange({ name: typed, companyId: e.details.existingId });
        } else {
          setMessage((err as Error).message || 'Could not add the company.');
        }
      }
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(rowCount - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && open && rowCount > 0) {
      e.preventDefault();
      const company = results[active];
      if (company) select(company.name, company.id);
      else if (canAdd) void addAsNew();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Building2
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          required
          value={value.name}
          onChange={(e) => {
            onChange({ name: e.target.value, companyId: null });
            onEdited?.();
            setOpen(true);
            setActive(0);
            setMessage(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search your companies or type a new one"
          className="w-full rounded-md border border-border-default bg-bg-surface py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
        {(isFetching || creating) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </span>
        )}
      </div>

      {open && rowCount > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border-default bg-bg-surface p-1 shadow-lg"
        >
          {results.map((c, index) => (
            <li
              key={c.id}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(c.name, c.id);
              }}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                index === active ? 'bg-bg-accent-subtle' : ''
              }`}
            >
              <span className="truncate font-medium text-text-primary">{c.name}</span>
              <span className="truncate text-xs text-text-tertiary">
                {c.isGlobal ? 'Directory' : 'Yours'}
                {c.location ? ` · ${c.location}` : ''}
              </span>
            </li>
          ))}
          {canAdd && (
            <li
              role="option"
              aria-selected={active === results.length}
              onMouseEnter={() => setActive(results.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                void addAsNew();
              }}
              className={`mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-accent px-3 py-2 text-sm font-semibold text-text-accent ${
                active === results.length ? 'bg-bg-accent-subtle' : ''
              }`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add “{typed}” as a new company
              {isPro && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> AI fills details
                </span>
              )}
            </li>
          )}
        </ul>
      )}

      {open && rowCount === 0 && !isFetching && typed.length > 0 && (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-border-default bg-bg-surface p-3 text-xs text-text-secondary shadow-lg">
          Keep typing…
        </p>
      )}

      {creating && (
        <p role="status" className="mt-1 text-xs text-text-secondary">
          {isPro ? 'Looking up company details…' : 'Adding company…'}
        </p>
      )}
      {message && !creating && (
        <p role="status" className="mt-1 text-xs text-text-accent">
          {message}
        </p>
      )}
      {value.companyId && (
        <p className="mt-1 text-[11px] font-medium text-text-success">Linked to a saved company</p>
      )}
    </div>
  );
};
