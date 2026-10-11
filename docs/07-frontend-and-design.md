# 07: Frontend and Design

## 1. Design tokens (exact values from the Seatly Figma file)

Source: Figma file "Event-RSVP", node 13:98 (Seatly Foundations), read with the Figma MCP on 11 Oct 2026. Components never use raw hex values; they only use these variables through Tailwind theme names.

`apps/web/src/app/globals.css` (Tailwind v4):

```css
@import 'tailwindcss';

:root {
  /* Background */
  --color-bg-page: #ffffff;
  --color-bg-surface: #ffffff;
  --color-bg-subtle: #fafafa;
  --color-bg-muted: #f4f4f5;
  --color-bg-inverse: #0d0d0d;
  --color-bg-accent: #f5c518;
  --color-bg-accent-subtle: #fef9e7;
  --color-bg-success-subtle: #ecfdf5;
  --color-bg-danger: #dc2626;
  --color-bg-danger-subtle: #fef2f2;
  --color-bg-disabled: #e4e4e7;
  /* Text */
  --color-text-primary: #0d0d0d;
  --color-text-secondary: #71717a;
  --color-text-tertiary: #a1a1aa;
  --color-text-inverse: #ffffff;
  --color-text-accent: #8a6d08;
  --color-text-success: #047857;
  --color-text-danger: #dc2626;
  --color-text-disabled: #a1a1aa;
  /* Border */
  --color-border-default: #e4e4e7;
  --color-border-strong: #d4d4d8;
  --color-border-inverse: #0d0d0d;
  --color-border-accent: #f5c518;
  --color-border-danger: #fca5a5;
  /* Radius (from the foundations page) */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  /* Elevation (exact Figma effects) */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* #0000000D */
  --shadow-md: 0 4px 12px -2px rgb(0 0 0 / 0.06); /* #0000000F */
  --shadow-lg: 0 12px 32px -6px rgb(0 0 0 / 0.1); /* #0000001A */
}

@theme inline {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --spacing: 4px; /* 4-point grid: p-1 = 4px, p-4 = 16px */
  --color-bg-page: var(--color-bg-page);
  /* …map every variable above the same way so classes like bg-bg-muted, text-text-secondary exist… */
}
```

### Type scale (exact from Figma; letter-spacing values are percentages)

| Token      | Weight       | Size / line height | Letter spacing | Use                                          |
| ---------- | ------------ | ------------------ | -------------- | -------------------------------------------- |
| Display    | Bold 700     | 48 / 52            | −2%            | landing hero only                            |
| Heading/XL | Bold 700     | 34 / 40            | −1.5%          | page titles                                  |
| Heading/L  | Bold 700     | 24 / 30            | −1%            | panel title (application role), company name |
| Heading/M  | SemiBold 600 | 20 / 26            | −0.5%          | section titles                               |
| Heading/S  | SemiBold 600 | 17 / 24            | −0.3%          | lane titles, card group titles               |
| Body/L     | Regular 400  | 16 / 24            | 0              | rich text content                            |
| Body/M     | Regular 400  | 15 / 22            | 0              | default UI text                              |
| Body/S     | Regular 400  | 13 / 20            | 0              | card secondary lines                         |
| Label/M    | Medium 500   | 14 / 20            | 0              | form labels, buttons                         |
| Label/S    | SemiBold 600 | 13 / 18            | 0              | chips, counts                                |
| Caption    | Regular 400  | 12 / 16            | 0              | timestamps, helper text                      |
| Overline   | SemiBold 600 | 11 / 14            | +8%, uppercase | section overlines                            |

Rule from the design system: at most two weights on any single screen region.

Spacing: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Card padding 12–16, panel padding 24, page gutters 16 (mobile) / 32 (desktop), lane gap 16.

### Tag palette (addition for option colours)

Seatly's palette has neutral, accent, success and danger. Statuses and labels need a few more, so these pairs are added in the same soft style. Option `color` values may only be these names. Check AA contrast (4.5:1) before finalising.

| Name    | Background                  | Text                     | Default use            |
| ------- | --------------------------- | ------------------------ | ---------------------- |
| neutral | `--color-bg-muted`          | `--color-text-secondary` | Saved, Ghosted         |
| accent  | `--color-bg-accent-subtle`  | `--color-text-accent`    | Applied, High priority |
| info    | `#eff6ff`                   | `#1d4ed8`                | Screening, Assessment  |
| purple  | `#f5f3ff`                   | `#6d28d9`                | Interview              |
| success | `--color-bg-success-subtle` | `--color-text-success`   | Offer, Accepted        |
| danger  | `--color-bg-danger-subtle`  | `--color-text-danger`    | Rejected               |
| orange  | `#fff7ed`                   | `#c2410c`                | Dream priority         |
| teal    | `#f0fdfa`                   | `#0f766e`                | labels                 |

Dark mode: not in v1; everything is a variable, so it's a token swap later.

## 2. UI building blocks

- Primitives built on Radix UI (shadcn/ui-style components restyled with the tokens) in `components/atoms` and `components/molecules`.
- Buttons: primary = inverse (black), accent = yellow (one main action per screen), secondary (border), ghost, danger.
- Icons: `lucide-react`. Charts: Recharts with the tag palette plus a text table alternative. Rich text: TipTap (StarterKit limited, Link, Placeholder); HTML is sanitised again by the API.

## 3. Pages

| Route                                                                         | Content                                                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth forms (Formik + shared Yup)                                             |
| `/dashboard`                                                                  | KPI cards, charts, upcoming, recent activity (infinite scroll), PRO insights |
| `/pipeline`                                                                   | Board + filters + the application side panel                                 |
| `/applications`                                                               | Table view with infinite scroll, column picker, export                       |
| `/companies`, `/companies/[slug]`                                             | Directory (infinite scroll) and company page with verification panel         |
| `/settings/*`                                                                 | Profile, security (sessions), pipeline fields (options), plan + AI usage     |
| `/admin/*`                                                                    | Users, companies, audit log, AI usage (all infinite scroll)                  |

App shell: left sidebar (Dashboard, Pipeline, Applications, Companies, Settings, Admin if admin); top bar with global search, **New application** (accent button) and **Autofill with AI** (PRO). Mobile: bottom tab bar (Dashboard, Pipeline, Companies, More) and a floating "+" button.

## 4. Pipeline board

- `@dnd-kit/core` + `@dnd-kit/sortable`: one `DndContext`, one `SortableContext` per lane; pointer, touch (press-and-hold 200 ms) and keyboard sensors; `DragOverlay` for the dragged card.
- On drop: compute `beforeId`/`afterId` → optimistic cache update (mutation hook `onMutate`) → `POST /applications/:id/move` → rollback + toast on error.
- Lane header: colour dot, name, real total count, "+" (opens the panel in create mode with that status), collapse toggle (closed lanes collapsed by default).
- Card: company initial + name + accuracy dot; role title (2 lines max); priority chip + up to 3 labels + "+N"; footer with work-mode icon, "Applied 5d ago", follow-up badge (amber due, red overdue, with text).
- Each lane loads 25 cards and loads more as you scroll inside the lane (`useInfiniteQuery` per lane + sentinel).
- Mobile (< 768 px): lanes become scroll-snap columns at 85% width with lane tabs and counts on top; press-and-hold drag works, and every card has a "⋯ Move to" menu as the reliable method.

## 5. The application side panel (one panel for create, AI preview, view and edit)

The same organism, `ApplicationPanel`, is used in every situation. It opens from the right on desktop and full screen on mobile, and its state is in the URL so the back button closes it.

### 5.1 Modes

| Mode            | Opened by                                                     | URL                                                                 | Behaviour                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Create**      | "New application" or a lane's "+"                             | `?new=1` (`&status=<id>`)                                           | Empty form. Nothing is saved until **Save**. Formik holds all values; Yup validates on submit. Activity section hidden                                                                                                                                                                                                                                             |
| **AI preview**  | "Autofill with AI" → paste text or link → API returns a draft | `?draft=<clientKey>` (draft kept in the panel store, not in the DB) | Same form as Create, pre-filled. Banner: "Filled by AI from the job post. Check before saving." Every AI field shows a sparkle icon; hovering shows the quote it came from. Fields the API flagged show an amber warning. Suggested new options appear as "Create option 'Hybrid'?" chips. Buttons: **Save application**, **Discard**. Nothing is saved until Save |
| **View / edit** | clicking a card or a table row                                | `?app=<id>`                                                         | Everything is editable in place. Each field saves on its own (see 5.3) with a "Saved" tick. Activity section visible                                                                                                                                                                                                                                               |

After Save in Create or AI preview, the panel switches to View/edit for the new application (URL becomes `?app=<newId>`), and the board/table caches are updated.

### 5.2 Layout

Desktop (≥ 1024 px): panel width 960 px (resizable 720–1200, remembered), two columns.

```
┌───────────────────────────────────────────────────────────────┬──────────────────────────┐
│ [Company ▸]                                    [⋯] [↗] [✕]    │ STATUS        [Interview ▾]
│ Associate Software Engineer           ← Heading/L, inline edit │ PRIORITY      [High ▾]   │
│                                                                │ LABELS        [Java][+]  │
│ JOB DESCRIPTION                                                │ WORK MODE     [Hybrid ▾] │
│ ┌──────────────────────────────────────────────────────────┐   │ JOB TYPE      [Full-time]│
│ │ TipTap rich text (collapsed to 12 lines, "Show all")     │   │ LEVEL         [Associate]│
│ └──────────────────────────────────────────────────────────┘   │ SOURCE        [ITPro ▾]  │
│ NOTES                                                          │ CV VERSION    [Full-Stack]
│ ┌──────────────────────────────────────────────────────────┐   │ LOCATION      Colombo    │
│ │ TipTap rich text                                          │   │ JOB LINK      itpro.lk ↗ │
│ └──────────────────────────────────────────────────────────┘   │ SALARY        LKR 60k–70k│
│                                                                │ DATES  applied, deadline,│
│ ACTIVITY   [All] [Comments] [History]                          │        follow-up, interview
│ ┌ Add a comment… (Note ▾ / Follow-up + due date / Interview) ┐ │ CONTACTS      + add      │
│ • You moved this from Applied to Interview · 2h ago            │ ─────────────────────────│
│ • Follow-up: email HR on Monday ☐ · due 14 Oct                 │ COMPANY CARD             │
│ • You changed Priority from Medium to High · yesterday         │ Graffon · Local · ● 82   │
│   (infinite scroll)                                             │ checked 3 days ago       │
└───────────────────────────────────────────────────────────────┴──────────────────────────┘
```

- Left (main) column: company link, title, job description, notes, then **Activity at the bottom** with tabs All / Comments / History. Comments include follow-ups (with due date and a done checkbox) and interview notes. History is the read-only change log.
- Right (sidebar) column: every structured field (status, priority, labels and the other options, location, link, salary, dates, contacts) and the company card with the accuracy badge.
- Mobile/tablet (< 1024 px): one column. Title, then a collapsible "Details" section with the sidebar fields, then job description, notes and activity.

### 5.3 Editing rules (View/edit mode)

- Inline edit pattern (`InlineEditField` molecule): shows the value; click or Enter turns it into the right input; saves on blur/selection (text inputs debounced 600 ms; rich text on blur or Cmd/Ctrl+Enter).
- Each field validates with its own schema from `packages/shared` (`applicationFieldSchemas[field]`) using a mini Formik form.
- States: idle → saving → saved ✓ → error (message under the field, value kept for retry).
- Saves for one application go through a per-application queue, one request at a time, each using the `version` returned by the previous save, so quick edits never conflict with themselves.
- `CONFLICT` (changed in another tab): banner "This application changed elsewhere" with **Reload**; the unsaved value stays visible to copy.
- Editing an AI-filled field removes its sparkle.
- Esc closes the panel; arrow buttons go to previous/next card in the same lane.

## 6. Forms

- Formik + Yup everywhere. Schemas come from `packages/shared`.
- Field molecules wrap Formik (`<FormField name="roleTitle" label="Role title" />`), show errors with `aria-describedby`.
- `VALIDATION_FAILED` details from the API are mapped onto Formik fields with `utils/validation/mapServerErrors`.
- Submit buttons show loading and disable while submitting; unsaved-changes warning on close in Create and AI preview modes.

## 7. Data fetching and state

The full API-layer structure (endpoints, query keys, services, hooks) is in `10-folder-structure.md` §4. Rules:

- Hooks fetch and return. No mapping, sorting or formatting inside hooks. Components use `utils/mappers` and `utils/formatters` when they need a different shape.
- Mutation hooks may only touch the cache (optimistic update, rollback, invalidate) using the key factories.
- Lists use cursor pagination with `useInfiniteQuery` and the `useInfiniteScroll` sentinel hook.
- Query defaults: `staleTime` 30 s, retry only network/5xx errors, never 4xx.
- Zustand for UI state only: auth (access token + user, in memory), board UI (collapsed lanes, drag state), panel (mode, width, AI draft). Server data never goes into Zustand, except the unsaved AI draft, which isn't server data yet.
- Errors: `ApiError { code, message, details, requestId }`. Toasts show the friendly message and a "Copy error ID" action.

## 8. AI UX

- **Autofill with AI** dialog: tabs "Paste job post" and "Job link". Note on the link tab: "Some sites like LinkedIn block reading. If it fails, paste the text."
- While the API works (synchronous call, usually a few seconds): skeleton panel with "Reading the post…". On success the panel opens in AI preview mode. On `SOURCE_UNREACHABLE` the dialog switches to the paste tab with a message. On `AI_UNAVAILABLE` (Gemini free limit or timeout): "AI is busy right now. Try again in a minute, or fill it in manually" with a button that opens Create mode.
- Company verification: "Check data accuracy" button on the company card/page → spinner "Checking public sources… (up to a minute)" → badge and per-field table. FREE users see the button locked with "PRO".
- AI lookup result (unknown company): yellow warning banner (`bg-accent-subtle`, `border-accent`): "AI result. This company isn't in our database. Details may be wrong; check the sources."

## 9. Responsive and accessibility checklist

- Test at 360, 768, 1024 and 1440 px. Touch targets ≥ 44 px. No hover-only actions.
- Visible focus rings (2 px `--color-border-inverse`, offset 2 px).
- Every input labelled; icon-only buttons have `aria-label`.
- Colour is never the only signal (overdue badges say "Overdue").
- `prefers-reduced-motion` disables drag animations.
- Lighthouse accessibility ≥ 95 on dashboard, pipeline and the panel.
