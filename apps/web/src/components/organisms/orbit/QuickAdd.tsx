import React from 'react';
import { Calendar, Hash, Lock, Repeat, Sparkles, Wand2 } from 'lucide-react';
import { ORBIT_KINDS, ORBIT_KIND_META, type OrbitKind } from '@hiretrail/shared';
import { useOrbitQuickParse } from '../../../api/hooks/mutations/useOrbitQuickParse';
import { useCreateOrbitTask } from '../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitPlan } from '../../../api/hooks/queries/useOrbitQueries';
import { useCompanySearch } from '../../../api/hooks/queries/useCompanySearch';
import { orbitKindStyle } from '../../../constants/orbit-ui';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useNow } from '../../../hooks/useNow';
import { cn } from '../../../utils/helpers/class-names';
import { formatWhen } from '../../../utils/helpers/orbit/orbit-dates';
import {
  aiToQuickAdd,
  parseQuickAdd,
  type QuickAddRecurrence,
  type QuickAddResult,
} from '../../../utils/helpers/orbit/quick-add';
import { Spinner } from '../../atoms/Spinner';
import { OrbitProNote, isPlanError } from './OrbitProNote';

/** True when the key press happened while the user is typing in a field. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

const FREQ_WORD = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month' } as const;

function repeatLabel(rec: QuickAddRecurrence): string {
  const word = FREQ_WORD[rec.freq];
  return rec.interval === 1 ? `Every ${word}` : `Every ${rec.interval} ${word}s`;
}

/**
 * One line to add anything: "Call Sysco tomorrow 3pm @Sysco #prep !high" or "company watch Altrium
 * every 2 weeks". Words are matched first (free, instant, for everyone). PRO accounts also get a
 * "Refine with AI" button for sentences the words could not read; it only fills the preview below,
 * and nothing is saved until Add is pressed. Press N anywhere to jump here.
 */
export const QuickAdd: React.FC = () => {
  const now = useNow();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const create = useCreateOrbitTask();
  const refine = useOrbitQuickParse();
  const { data: plan } = useOrbitPlan();
  const isPro = plan?.plan === 'PRO';
  const [text, setText] = React.useState('');
  const [kindOverride, setKindOverride] = React.useState<OrbitKind | null>(null);
  const [aiResult, setAiResult] = React.useState<QuickAddResult | null>(null);
  const [added, setAdded] = React.useState<string | null>(null);

  const matched = React.useMemo(() => parseQuickAdd(text, now), [text, now]);
  // What the AI understood replaces the word match until the text changes
  const parsed = aiResult ?? matched;
  const companyQuery = useDebouncedValue(parsed.companyQuery ?? '', 250);
  const { data: companies } = useCompanySearch(companyQuery, Boolean(companyQuery));
  const company = companyQuery ? companies?.[0] : undefined;
  const hasText = text.trim().length > 0;

  // Company watch and repeating items are PRO. On Free the item is kept as a plain reminder.
  const wantedKind = kindOverride ?? parsed.kind;
  const lockedKind = !isPro && plan !== undefined && wantedKind === 'WATCH';
  const kind: OrbitKind = lockedKind ? 'REMINDER' : wantedKind;
  const recurrence = isPro ? parsed.recurrence : null;
  const downgraded = lockedKind || (!isPro && plan !== undefined && parsed.recurrence !== null);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(null), 2500);
    return () => clearTimeout(id);
  }, [added]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasText) return;
    const previous = { text, kindOverride };
    // The line clears at once so the next one can be typed straight away; it comes back if saving fails
    setText('');
    setKindOverride(null);
    setAiResult(null);
    refine.reset();
    create.mutate(
      {
        title: parsed.title,
        kind,
        priority: parsed.priority ?? 'MEDIUM',
        dueAt: parsed.dueAt,
        allDay: parsed.allDay,
        tags: parsed.tags,
        checklist: [],
        companyId: company?.id ?? null,
        recurrence,
        watchUrl: parsed.watchUrl,
      },
      {
        onSuccess: (task) => setAdded(task.title),
        onError: () => {
          setText((current) => current || previous.text);
          setKindOverride(previous.kindOverride);
        },
      },
    );
  };

  const askAi = () => {
    if (!hasText || refine.isPending) return;
    refine.mutate(text, {
      onSuccess: (dto) => {
        setAiResult(aiToQuickAdd(dto));
        setKindOverride(null);
      },
    });
  };

  const kindStyle = orbitKindStyle(kind);

  return (
    <form onSubmit={submit} className="space-y-1.5" aria-label="Quick add">
      <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-border-accent">
        <Sparkles className="h-4 w-4 flex-shrink-0 text-text-accent" aria-hidden="true" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setAiResult(null);
            create.reset();
            refine.reset();
          }}
          aria-label="Add a task, reminder, call, meeting or company watch"
          placeholder='Try "company watch Altrium every 2 weeks" or "Call Sysco tomorrow 3pm @Sysco #prep !high"'
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
        <kbd
          className="hidden rounded border border-border-default px-1.5 py-0.5 text-[10px] text-text-tertiary sm:block"
          aria-hidden="true"
        >
          N
        </kbd>
        {hasText && (
          <button
            type="button"
            onClick={askAi}
            disabled={!isPro || refine.isPending}
            title={
              isPro
                ? 'Let the AI read this sentence. It only fills the preview.'
                : 'Refine with AI is a PRO feature'
            }
            aria-label={isPro ? 'Refine with AI' : 'Refine with AI (PRO)'}
            className={cn(
              'inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold',
              isPro
                ? matched.unsure && !aiResult
                  ? 'border-border-accent bg-bg-accent-subtle text-text-primary hover:bg-bg-accent'
                  : 'border-border-default text-text-secondary hover:bg-bg-muted'
                : 'cursor-not-allowed border-border-default text-text-tertiary',
            )}
          >
            {refine.isPending ? (
              <Spinner size="sm" />
            ) : isPro ? (
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Refine with AI</span>
            {!isPro && (
              <span className="rounded bg-bg-accent px-1 text-[10px] font-bold text-text-primary">
                PRO
              </span>
            )}
          </button>
        )}
        <button
          type="submit"
          disabled={!hasText}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-bg-accent px-3 py-1.5 text-xs font-semibold text-text-primary hover:opacity-90 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div
        className="flex min-h-6 flex-wrap items-center gap-1.5 px-1 text-[11px]"
        aria-live="polite"
      >
        {hasText && (
          <>
            <label
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold',
                kindStyle.bg,
                kindStyle.text,
                kindStyle.border,
              )}
            >
              <span className="sr-only">Kind</span>
              <select
                value={kind}
                onChange={(e) => setKindOverride(e.target.value as OrbitKind)}
                className="cursor-pointer bg-transparent focus:outline-none"
              >
                {ORBIT_KINDS.map((k) => (
                  <option key={k} value={k} disabled={ORBIT_KIND_META[k].pro && !isPro}>
                    {ORBIT_KIND_META[k].label}
                    {ORBIT_KIND_META[k].pro && !isPro ? ' (PRO)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {parsed.dueAt && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-muted px-2 py-0.5 text-text-primary">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {formatWhen(parsed.dueAt, parsed.allDay, now)}
              </span>
            )}
            {recurrence && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-muted px-2 py-0.5 text-text-primary">
                <Repeat className="h-3 w-3" aria-hidden="true" />
                {repeatLabel(recurrence)}
              </span>
            )}
            {parsed.priority && (
              <span className="rounded-full border border-border-default bg-bg-muted px-2 py-0.5 capitalize text-text-primary">
                {parsed.priority.toLowerCase()} priority
              </span>
            )}
            {parsed.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-full border border-border-default bg-bg-muted px-2 py-0.5 text-text-primary"
              >
                <Hash className="h-3 w-3" aria-hidden="true" />
                {tag}
              </span>
            ))}
            {parsed.companyQuery && (
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5',
                  company
                    ? 'border-border-accent bg-bg-accent-subtle text-text-primary'
                    : 'border-border-default text-text-secondary',
                )}
              >
                {company ? `Company: ${company.name}` : `No company named “${parsed.companyQuery}”`}
              </span>
            )}
            {aiResult && (
              <span className="rounded-full bg-bg-accent px-2 py-0.5 font-semibold text-text-primary">
                AI read this
              </span>
            )}
            <span className="truncate text-text-tertiary">“{parsed.title}”</span>
            {downgraded && (
              <span className="flex items-center gap-1 text-text-secondary">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Company watch and repeating are PRO, so this is saved as a one-off reminder.
              </span>
            )}
            {!aiResult && isPro && matched.unsure && !refine.isPending && (
              <span className="text-text-secondary">
                Not sure what this is? Try Refine with AI.
              </span>
            )}
          </>
        )}
        {added && !hasText && (
          <span role="status" className="font-medium text-text-success">
            Added “{added}”
          </span>
        )}
      </div>

      {refine.isError &&
        (isPlanError(refine.error.code) ? (
          <OrbitProNote message={refine.error.message} />
        ) : (
          <p role="alert" className="px-1 text-xs text-text-danger">
            {refine.error.code === 'AI_QUOTA_EXCEEDED'
              ? "You used all of today's AI refines. The word matching still works."
              : refine.error.message}
          </p>
        ))}
      {create.isError &&
        (isPlanError(create.error.code) ? (
          <OrbitProNote message={create.error.message} />
        ) : (
          <p role="alert" className="px-1 text-xs text-text-danger">
            {create.error.message}
          </p>
        ))}
    </form>
  );
};
