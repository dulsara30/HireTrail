# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (Phase 8 and 9)

- **Admin** (`/api/v1/admin`, ADMIN only, enforced by the API): user list with search and filters, user detail (metadata and counts only), plan change and suspend/reactivate with a required reason (suspension revokes all sessions in the same transaction), global company list and merge, apply verification suggestions to global companies, audit-log viewer and AI usage totals. Every admin action writes an append-only audit log entry. Web: `/admin/users`, `/admin/companies`, `/admin/audit`, `/admin/ai-usage` with infinite-scroll lists and a sidebar Admin section.
- **CSV export** (`GET /applications/export`): streamed, formula-safe, human headers, same filters as the list. **CSV import wizard** (`POST /applications/import/preview` then `/import/commit`): raw text/csv up to 1 MB and 1,000 rows, staged in `imports` with a 1 hour TTL, column mapping, unknown options created on the fly, row-level errors.
- **Weekly AI insights** (`GET /dashboard/insights`, `POST /dashboard/insights/refresh`, PRO, once a day, aggregated numbers only) shown on the dashboard.
- **Account**: `GET /me/export` (ZIP with JSON and CSV, 3 per day) and `DELETE /me` rebuilt on a registry of collections (one transaction, refuses to run if a collection with user data is not registered). Web: `/settings/account` with data download and delete flow.
- Empty states and first-run onboarding tips; mobile layout pass (wrapping headers, scrollable tables, responsive dialogs).
- Dependency: `archiver` (streams the export ZIP).

### Changed

- **Navigation**: the top bar is replaced by a collapsible sidebar (icons, Workspace and Settings sections, profile with plan badge and sign out at the bottom, off-canvas on mobile). Pages now use the full width.
- **Configuration** page (`/settings/pipeline-fields`): one tab per option type (Status, Priority, Job Type, Level, Work Mode, Source, CV Version, Labels) with add, rename, recolour, drag-reorder, status category and closed reason, remove with "move applications to…" when in use, restore and restore-defaults.
- **Default options** now match the owner's spreadsheet (Interview 1/2, Technical Test, Withdrawn, Job Board, University/Career Fair, Customized, etc.). Status categories now follow the docs: SAVED, APPLIED, IN_PROGRESS, INTERVIEW, OFFER, ACCEPTED, CLOSED with a closed reason; older stored categories are mapped automatically. `POST /options/reset-defaults` matches defaults by name (case-insensitive) and never duplicates.
- **New application panel** is one form for manual and AI use: paste a link or the full job post into the AI box to fill every field; company picker searches existing companies and offers "Add as new company" (PRO: AI looks up the details first). Job description is a large editable area.
- Job description in the view panel is a large, readable, plain-text rendering (no injected HTML) with an edit mode.
- Dashboard shows only the 10 most recent pipeline activities; delta pills use readable success/danger tokens.

### Added

- **Cover Letter** (Yes/No) on applications: model, shared schemas, DTOs, history diff, side panel toggle, create form, and a "Cover Letter" column in the Applications table column picker. (No CSV export exists yet; it is part of Phase 9.)

### Fixed

- Moving a card between lanes no longer blanks its details: the optimistic update now keeps the full card (it used to insert an empty placeholder until the refetch finished).

- Queries with operators (`$gt`, `$gte`, `$lt`, `$in`, `$ne`, `$nin`) failed with `INVALID_ID` because `sanitizeFilter` wrapped them; server-built operators now use `mongoose.trusted()`. This fixed application creation, companies infinite scroll and the dashboard.
- Drag and drop between lanes: new documents have `version` 0 and the shared schemas required `>= 1`; the version minimum is now 0 for application move/update, comments and options.
- Application panel widened again (`max-w-5xl`); colourful token-only UI (warm canvas, tinted KPI cards, status-coloured cards, token-based chart colours, stray indigo accent alias removed).

### Added

- **Phase 6 (AI autofill, PRO)**:
  - `AiProvider` port and `GeminiAiProvider` (two-call grounded strategy, models from env, one retry, `AI_UNAVAILABLE` mapping); only the adapter imports `@google/genai`.
  - `SafeWebPageFetcher` with SSRF guard (public-IP check, DNS pinning, manual redirects, 8 s, 2 MB, ports 80/443) and Readability/jsdom content extraction.
  - `POST /api/v1/ai/autofill` (PRO + verified email): extraction schema, evidence checks, salary/date normalisation, option and company matching, quotas and `aiUsage` rows. Nothing is saved. `GET /api/v1/ai/usage`.
  - Web: `AutofillDialog`, `ApplicationPanel` AI preview mode (sparkles with evidence tooltips, warnings, "Create option?" chips, Save/Discard). The job description is saved exactly as pasted. Application create accepts `ai.aiFilledFields` and `ai.aiUsageId`.
- **Phase 7 (Company verification and AI lookup, PRO)**:
  - `POST /api/v1/companies/:id/verify`, `GET /api/v1/companies/:id/verifications`, `POST /api/v1/companies/:id/verifications/:vid/apply`: direct website/careers check, grounded call, source checks, `VerificationScorer`, 30-day sharing, 24-hour re-check rule, search-unavailable fallback.
  - `POST /api/v1/companies/ai-lookup` with a 7-day shared cache (requests without a hint only) and the `isAiResult` warning banner. `POST /companies` accepts `fromAiLookup` and extra profile fields.
  - Web: `VerificationPanel`, `VerificationBadge` (company page and application panel), `CompanyLookupCard` in the directory empty state.

- **Phase 1 (Authentication)**:
  - Full auth flows: register, login, refresh with token rotation and reuse detection, logout, logout-all, `/me`, active sessions.
  - Email verification and forgot/reset password with secure one-time tokens.
  - Google OAuth 2.0 with PKCE and ID token verification.
  - In-transaction seeding of default options on registration.
  - Web auth pages (Formik + Yup), AuthBootstrap, and proxy/middleware UX guards.
- **Phase 2 & 3 (Pipeline & Applications)**:
  - Options module: CRUD, move (fractional indexing), archive with reassignment guard (`OPTION_IN_USE`), restore, reset defaults.
  - Settings -> Pipeline & fields page (`/settings/pipeline-fields`).
  - Companies module (minimal): create private company, search visible companies (owned + global).
  - Applications module:
    - Repository on `BaseRepository` with `userId` scoping.
    - Command service: optimistic locking with `version`, duplicate warning detection within 90 days, milestone transitions (`appliedAt`, `firstResponseAt`, `firstInterviewAt`, `offerAt`, `closedAt`), HTML sanitization, in-transaction activity history diff logging.
    - Query service: cursor pagination table listing with filters and sorting, Kanban board view with lane totals and per-lane load more.
  - Comments module (notes, follow-ups with due/done toggling, interview notes) and Activity feed.
  - Frontend components:
    - `InlineEditField` molecule with debounced/queue save and conflict detection banner.
    - `ApplicationsTable` with column sorting and infinite scroll.
    - `PipelineBoard` with `@dnd-kit`: mouse/touch/keyboard sensors, optimistic drag-and-drop with rollback, mobile support.
    - `ApplicationPanel` organism: Create and View/edit modes with two-column layout, TipTap rich text support, and bottom Activity/Comments timeline.
  - Web pages: `/applications` and `/pipeline`.
- **Phase 4 (Companies Directory & Seed)**:
  - Idempotent seed script (`pnpm seed:companies`) populating 173 companies from `seed/companies.seed.json` with preservation of admin-edited records.
  - `UserCompanyNotes` model and repository for user-isolated private notes and ratings (1 to 5).
  - Companies directory listing with multi-field search and filters (region, tier, hasApplications) with cursor pagination.
  - Company slug lookup checking owned private companies before global companies.
  - Frontend Companies directory page (`/companies`) with interactive filtering and infinite scrolling.
  - Company profile page (`/companies/[slug]`) displaying research report ratings labeled "Unverified", tech stack, linked application summaries, and private notes & impression rating editor.
- **Phase 5 (Dashboard Analytics & Visualizations)**:
  - Aggregation endpoints for summary KPIs, funnel/weekly/status/source breakdown charts, and real-time activity feed.
  - Gen Z minimalist `HireTrailLogo` with geometric ascending trail icon.
  - KPI cards with previous-period comparison deltas.
  - Recharts visualizations with text alternatives for accessibility.
  - Upcoming tasks and live recent activity feeds.
- **UI & Pipeline Polish**:
  - Companies directory navigation and route strictly guarded for `ADMIN` role users.
  - Widened `ApplicationPanel` to `max-w-4xl` extending into the page with backdrop overlay and outside-click-to-close behavior.
  - Expanded `ApplicationPanel` detail fields including Work Mode, Job Type, and Compensation.
  - Full-width layout for Pipeline page removing max-width container constraints.
  - Seed script updated with `import.meta.dirname` for ES module compatibility and log credential masking.
  - Validated dashboard analytics aggregator (`DashboardAggregationService`) calculating KPIs and previous-period changes (Active applications, Applied this period, Response rate %, Interview rate %, Offers, Avg. time to first reply, Follow-ups due, Stale applications).
  - Pipeline charts aggregation for Funnel conversion stages, 12-week velocity by work mode, current status distribution, and application sources with response yield.
  - Dashboard API endpoints: `/api/v1/dashboard/summary`, `/api/v1/dashboard/charts`, `/api/v1/dashboard/activity`.
  - Minimalist Gen Z aesthetic `HireTrailLogo` atom with ascending path icon and modern typography integrated in navigation.
  - Recharts visualizations with accessible text alternatives: `FunnelChart`, `WeeklyChart`, `StatusDistributionChart`, `SourceBreakdownChart`.
  - Frontend Dashboard page (`/dashboard`) with range filter (`7d`, `30d`, `90d`, `ytd`, `all`), KPI metric cards, actionable upcoming tasks, and infinite-scrolling activity feed.
