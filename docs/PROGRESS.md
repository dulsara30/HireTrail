# Implementation Progress

## Done

### Phase 1: Authentication & Core Architecture

- Auth module: register, login, refresh with token rotation and reuse detection, logout, logout-all, `/me`, active sessions listing.
- Password reset and email verification flows with one-time tokens.
- Google OAuth 2.0 with PKCE and ID token validation.
- Default options seeded upon user registration inside database transactions.
- Express rate limiting and login throttling.

### Phase 2 & 3: Pipeline, Applications & Options

- Shared schemas, DTOs, and validation for options, applications, comments, and board.
- Options module: CRUD, fractional indexing reordering, archive with reassign check (`OPTION_IN_USE`), restore, reset-defaults.
- Applications module: optimistic concurrency with version checks (`version`), duplicate warning detection (90 days), milestones calculation, HTML sanitization, history diff logged to `activities` in transactions, soft delete, undo delete, board and table cursor pagination.
- Comments module: notes, interview notes, and follow-ups with due/done toggling.
- Frontend Pipeline board (`@dnd-kit` drag-and-drop), applications table, application slide-over panel with unified `Create` / `View/edit` modes, and pipeline field management.

### Phase 4: Companies Directory & Seed

- **Seed Script (`pnpm seed:companies`)**:
  - Reads `seed/companies.seed.json` (173 companies). Idempotent upsert on `normalizedName` with `ownerId: null`. Preserves admin modifications (`source.type === 'ADMIN'`).
- **Data Model & Scoping**:
  - `UserCompanyNotesModel` & `UserCompanyNotesRepository`: personal ratings (1-5) and rich-text notes kept isolated per user without mutating global documents.
  - `CompanyModel` & `CompanyRepository`: visibility rules (`ownerId: null` OR `ownerId: userId`), directory filtering (region, tier, hasApplications, search), slug resolution checking private records before global, soft deletion guarded against referenced applications.
- **API & Controller**:
  - `/api/v1/companies` (list directory, create private), `/api/v1/companies/search`, `/api/v1/companies/:idOrSlug` (detail with resolved personal notes & application summary), PATCH / DELETE private companies, PUT `/api/v1/companies/:id/my-notes`.
- **Frontend Companies UI**:
  - `/companies`: Directory with search, filters (Regions, Tiers, Applied Only), company cards with verification/directory pills, and infinite scroll.
  - `/companies/[slug]`: Rich profile page with research report ratings clearly labeled "Unverified", tech stack, linked application summaries, and private notes & personal 5-star rating editor.

### Phase 5: Dashboard Analytics & Charts

- **Backend Aggregation Service (`DashboardAggregationService`)**:
  - KPI summary metrics computed strictly from stored milestones and statusCategory: active applications, applications applied in period with previous-period comparison, response rate %, interview rate %, offers, mean days to first response, follow-ups due (applications + comments), and stale applications (14+ days no activity).
  - Charts aggregation: Funnel conversion stages, 12-week velocity by work mode, current pipeline status breakdown, source distribution with response yield, and upcoming interviews/follow-ups.
  - Endpoints: `/api/v1/dashboard/summary`, `/api/v1/dashboard/charts`, `/api/v1/dashboard/activity`.
- **Frontend Visualizations & Dashboard UI**:
  - Gen Z minimalist `HireTrailLogo` with geometric ascending trail icon and modern branding integrated across the navigation bar.
  - `KpiCard` with previous-period delta pills.
  - Recharts visualizations with accessible text alternatives (screen-reader tables/lists): `FunnelChart`, `WeeklyChart`, `StatusDistributionChart`, `SourceBreakdownChart`.
  - Actionable Upcoming Tasks list and live `RecentActivityList` with infinite scroll.
  - Range filter selector (`7d`, `30d`, `90d`, `ytd`, `all`).

### Phase 6: AI autofill (PRO)

- AiProvider port + GeminiAiProvider, SafeWebPageFetcher (SSRF guard), content extraction, `POST /ai/autofill`, `GET /ai/usage`, quotas + aiUsage, AutofillDialog and ApplicationPanel AI preview mode.

### Phase 7: Company verification + AI lookup (PRO)

- `POST /companies/:id/verify`, verifications list/apply, VerificationScorer, `POST /companies/ai-lookup` with cache, VerificationPanel/Badge and lookup card.

### Phase 8: Admin

- Admin API (users, detail, plan, status, companies list/merge, apply suggestions, audit log, AI usage), audit-log collection (append-only), admin UI.

### Phase 9: Export, import, insights, account

- CSV export and import wizard, weekly AI insights, `GET /me/export` ZIP, `DELETE /me` via collection registry, onboarding tips, mobile pass.

---

## Verification & Build

- `pnpm -r build`: 100% clean builds across `@hiretrail/shared`, `@hiretrail/api`, and `@hiretrail/web` (Next.js 16.4 Turbopack).
- `pnpm -r typecheck`: 0 type errors.
- `pnpm -r lint`: 0 lint errors.

---

## Not Done / Next Steps

1. **Manual**: a valid `GEMINI_API_KEY` in `apps/api/.env` (AI autofill, verification, lookup and insights returned AI_UNAVAILABLE with the old key).
2. **Phase 10 (hardening)**: k6 load test, OWASP ZAP baseline, Sentry, uptime check, privacy page and terms (incl. the Gemini free-tier note), backup and restore test.
3. **Not built from the Phase 8 doc list**: admin create/update of global companies and seed-JSON import (`POST/PATCH /admin/companies`, `/admin/companies/import`); they were not in this task.
4. **Deferred tests**: everything in `docs/TEST-BACKLOG.md` (no new tests were written for phases 4 to 9).
5. Open decisions: the Companies directory is ADMIN-only in the UI (docs say all users).
