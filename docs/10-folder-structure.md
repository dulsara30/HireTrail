# 10: Folder Structure and File Conventions

This is the exact structure the coding agent must create. If something doesn't fit, ask before inventing a new folder.

## 1. Repository root

```
hiretrail/
├── .github/
│   ├── workflows/ci-cd.yml
│   ├── pull_request_template.md
│   ├── ISSUE_TEMPLATE/bug_report.md
│   ├── ISSUE_TEMPLATE/feature_request.md
│   └── dependabot.yml
├── .husky/                       pre-commit: lint-staged
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── shared/
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
│   ├── 00-README.md … 10-folder-structure.md
│   └── adr/                      Architecture Decision Records (0001-monorepo.md, 0002-mongodb.md, …)
├── seed/companies.seed.json
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── SECURITY.md
├── CHANGELOG.md
├── LICENSE                       your choice (MIT if you want it public, or "All rights reserved")
├── .editorconfig, .gitignore, .nvmrc, .prettierrc, .prettierignore
├── package.json, pnpm-workspace.yaml, turbo.json
└── .env.example files live inside each app, not at the root
```

## 2. `packages/shared`

```
packages/shared/src/
├── constants/
│   ├── limits.ts               MAX_PAGE_SIZE, MAX_LABELS, UNDO_DELETE_WINDOW_MIN, text lengths…
│   ├── options.ts              OptionType, StatusCategory, ClosedReason, OptionColor
│   ├── default-options.ts      the defaults seeded at sign-up (single source)
│   ├── plans.ts                Plan, Role, AccountStatus, AI features + default quotas
│   └── index.ts
├── errors/
│   ├── error-codes.ts          ErrorCode enum
│   ├── error-meta.ts           default HTTP status + default message per code
│   └── index.ts
├── schemas/                    Yup schemas, one file per domain
│   ├── auth.schema.ts
│   ├── application.schema.ts   create, update (partial), move, list query, board query, field-level schemas
│   ├── option.schema.ts
│   ├── company.schema.ts
│   ├── comment.schema.ts
│   ├── ai.schema.ts            autofill request + AI response validation
│   ├── common.schema.ts        objectId, cursor page query, date range, url, money
│   └── index.ts
├── types/
│   ├── dto/                    response DTOs (ApplicationDto, CompanyDto, …)
│   ├── api.ts                  ApiSuccess<T>, ApiList<T>, ApiErrorBody, PageInfo
│   └── index.ts
└── index.ts
```

## 3. `apps/api`

```
apps/api/
├── src/
│   ├── index.ts                     default-exports the Express app (Vercel entry)
│   ├── server.ts                    local dev only: app.listen(PORT)
│   ├── app.ts                       creates the app, middleware order, mounts routers
│   ├── config/
│   │   ├── env.schema.ts            Yup schema for env
│   │   └── config.ts                typed, frozen config object
│   ├── core/                        shared kernel (no business logic)
│   │   ├── base/
│   │   │   ├── base.repository.ts   abstract BaseRepository<TDoc> with owner-scoped helpers
│   │   │   └── base.controller.ts   small helpers (ok, created, noContent, list)
│   │   ├── container/
│   │   │   └── container.ts         composition root: builds every adapter, repo, service, controller once
│   │   ├── db/
│   │   │   ├── connection.ts        cached Mongoose connection
│   │   │   ├── transaction.ts       withTransaction(fn)
│   │   │   └── plugins/             soft-delete.plugin.ts, to-json.plugin.ts
│   │   ├── errors/                  app-error.ts + one file per error family
│   │   ├── http/                    api-response.ts, cursor.ts (value object), request-context.ts
│   │   ├── logger/                  logger.ts (pino + redaction)
│   │   ├── middleware/              request-id, http-logger, rate-limit, authenticate, require-role,
│   │   │                            require-plan, require-verified-email, validate, not-found, error-handler
│   │   ├── ports/                   interfaces: ai-provider.port.ts, web-page-fetcher.port.ts, mailer.port.ts,
│   │   │                            password-hasher.port.ts, token-signer.port.ts, clock.port.ts
│   │   ├── security/                html-sanitizer.ts, csv-escaper.ts, token-hash.ts, ip-hash.ts, redirect-guard.ts
│   │   └── value-objects/           money.ts, email-address.ts, fractional-order.ts
│   ├── infrastructure/              adapters that implement ports (the only place SDKs are imported)
│   │   ├── ai/gemini/               gemini.ai-provider.ts, grounded-mode.strategy.ts, prompts/, schemas/
│   │   ├── fetcher/                 safe-web-page-fetcher.ts (SSRF guard, IP pinning), content-extractor.ts
│   │   ├── mailer/                  resend.mailer.ts, console.mailer.ts (dev), templates/
│   │   ├── hashing/                 argon2.password-hasher.ts
│   │   ├── tokens/                  jwt.token-signer.ts
│   │   └── clock/                   system.clock.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── options/
│   │   ├── companies/
│   │   ├── applications/
│   │   ├── comments/
│   │   ├── activities/
│   │   ├── ai/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   └── health/
│   └── types/express.d.ts           req.user, req.requestId, req.validated typing
├── scripts/                         seed-companies.ts, user-grant.ts, sync-indexes.ts
├── test/
│   ├── setup.ts                     mongodb-memory-server (replica set), test container wiring
│   ├── factories/                   userFactory, applicationFactory, …
│   ├── fakes/                       FakeAiProvider, FakeMailer, FakeFetcher, FixedClock
│   └── fixtures/                    job posts, Gemini responses
├── .env.example
├── vercel.json
├── package.json, tsconfig.json, vitest.config.ts
```

### One module (same shape for every domain)

```
modules/applications/
├── application.routes.ts
├── controllers/
│   └── application.controller.ts
├── services/
│   ├── application-command.service.ts     create, update, move, archive, delete, restore
│   ├── application-query.service.ts       list (cursor), board, detail, export rows
│   ├── milestone.calculator.ts            pure: status category change → milestone updates
│   ├── history-diff.ts                    pure: before/after → activity changes[]
│   └── duplicate.detector.ts              pure: similar company + title in last 90 days
├── policies/
│   └── application.policy.ts
├── repositories/
│   └── application.repository.ts         extends BaseRepository<ApplicationDoc>
├── models/
│   └── application.model.ts
├── mappers/
│   └── application.mapper.ts
└── __tests__/
    ├── application-command.service.test.ts
    ├── application-query.service.test.ts
    ├── milestone.calculator.test.ts
    ├── history-diff.test.ts
    └── application.routes.test.ts         Supertest: guards, ownership, validation, envelope
```

Request DTO types come from `packages/shared` schemas (`InferType`), so modules don't redefine them.

## 4. `apps/web`

Kind-first folders at the top, domain folders inside each kind. This keeps atoms/molecules/organisms, constants, utils and the API layer clearly separated, as requested.

```
apps/web/src/
├── app/                                  routes only; pages are thin and render templates
│   ├── (public)/login/page.tsx, register/, forgot-password/, reset-password/, verify-email/
│   ├── (app)/layout.tsx                  authenticated shell
│   ├── (app)/dashboard/page.tsx
│   ├── (app)/pipeline/page.tsx           ?app=<id> | ?new=1 | ?draft=<key> opens the side panel
│   ├── (app)/applications/page.tsx
│   ├── (app)/companies/page.tsx, companies/[slug]/page.tsx
│   ├── (app)/settings/profile/, security/, pipeline-fields/, plan/
│   ├── (admin)/admin/users/, companies/, audit/, ai-usage/
│   ├── layout.tsx, not-found.tsx, error.tsx, globals.css
├── api/
│   ├── client/
│   │   ├── http-client.ts                axios instance (baseURL /api/v1, withCredentials, X-Requested-With)
│   │   ├── auth-interceptor.ts           Bearer header + single-flight refresh on TOKEN_EXPIRED
│   │   └── api-error.ts                  ApiError class built from the error envelope
│   ├── endpoints/                        URL builders only, one file per domain
│   │   ├── auth.endpoints.ts             e.g. AUTH_ENDPOINTS.login = '/auth/login'
│   │   ├── applications.endpoints.ts     e.g. APPLICATION_ENDPOINTS.byId = (id) => `/applications/${id}`
│   │   ├── companies.endpoints.ts, options.endpoints.ts, comments.endpoints.ts, ai.endpoints.ts,
│   │   └── dashboard.endpoints.ts, admin.endpoints.ts, me.endpoints.ts
│   ├── query-keys/                       key factories, one file per domain
│   │   └── applications.keys.ts, companies.keys.ts, options.keys.ts, …
│   ├── services/                         typed request functions, no React, no transformation
│   │   └── applications.service.ts       getBoard(filters), getList(params), getById(id), create(dto), update(id, dto), move(...)
│   └── hooks/                            React Query hooks only
│       ├── queries/                      useApplicationsInfinite.ts, useBoard.ts, useApplication.ts, useCompaniesInfinite.ts, …
│       └── mutations/                    useCreateApplication.ts, useUpdateApplicationField.ts, useMoveApplication.ts, …
├── components/
│   ├── atoms/                            Button/, Input/, Badge/, Chip/, Avatar/, Spinner/, Icon/, Skeleton/, Checkbox/, …
│   ├── molecules/                        FormField/, SelectField/, DateField/, SearchInput/, InlineEditField/,
│   │                                     StatusPill/, PriorityChip/, LabelChips/, AccuracyBadge/, EmptyState/, KpiCard/, …
│   ├── organisms/
│   │   ├── applications/                 ApplicationCard/, ApplicationPanel/ (main + sidebar + activity), ApplicationsTable/
│   │   ├── pipeline/                     PipelineBoard/, PipelineLane/, BoardFilters/
│   │   ├── activity/                     ActivityFeed/, CommentComposer/, HistoryList/
│   │   ├── companies/                    CompanyList/, CompanyProfile/, VerificationPanel/, AiLookupResult/
│   │   ├── dashboard/                    FunnelChart/, WeeklyChart/, SourceChart/, RecentActivity/, InsightsCard/
│   │   ├── ai/                           AutofillDialog/
│   │   ├── settings/                     OptionManager/, SessionsList/
│   │   ├── auth/                         LoginForm/, RegisterForm/, …
│   │   └── layout/                       Sidebar/, Topbar/, MobileTabBar/
│   └── templates/                        AppShellTemplate/, DashboardTemplate/, PipelineTemplate/, CompanyTemplate/, AuthTemplate/
├── constants/
│   ├── routes.ts                         ROUTES.pipeline, ROUTES.company(slug), …
│   ├── ui.ts                             panel widths, debounce ms, poll/stale times, page sizes
│   ├── option-colors.ts                  token name → Tailwind classes
│   └── storage-keys.ts
├── hooks/                                generic UI hooks, no data fetching
│   ├── useInfiniteScroll.ts              IntersectionObserver sentinel → fetchNextPage
│   ├── useDebouncedValue.ts, useMediaQuery.ts, useDisclosure.ts, useUrlState.ts
├── providers/                            QueryProvider.tsx, AuthBootstrap.tsx, ToastProvider.tsx
├── store/                                Zustand slices: auth.store.ts, board-ui.store.ts, panel.store.ts
├── utils/
│   ├── formatters/                       date.ts (user time zone), money.ts, relative-time.ts, text.ts
│   ├── mappers/                          dto → view models (board lanes → columns, activity → timeline rows)
│   ├── validation/                       Formik helpers: mapServerErrors(), yup re-exports from shared
│   └── helpers/                          classNames, fractional order helpers for optimistic moves
├── types/                                view-model types, re-exports of shared DTOs
├── test/                                 msw handlers, render helpers
└── proxy.ts                              Next 16 middleware file: redirect if no ht_signed_in cookie (UX only)
```

### Component folder convention

```
components/molecules/InlineEditField/
├── InlineEditField.tsx
├── InlineEditField.types.ts
├── InlineEditField.test.tsx
└── index.ts                 export { InlineEditField } from './InlineEditField';
```

Rules:

- Atoms import nothing from molecules/organisms. Molecules import atoms only. Organisms may use hooks from `api/hooks`. Templates arrange organisms. Pages render templates.
- Only organisms (and templates when needed) call API hooks. Atoms and molecules get data through props.

### API layer rules

```ts
// api/endpoints/applications.endpoints.ts
export const APPLICATION_ENDPOINTS = {
  list: '/applications',
  board: '/applications/board',
  byId: (id: string) => `/applications/${id}`,
  move: (id: string) => `/applications/${id}/move`,
} as const;

// api/query-keys/applications.keys.ts
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: ApplicationListQuery) => [...applicationKeys.lists(), params] as const,
  board: (filters: BoardQuery) => [...applicationKeys.all, 'board', filters] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
  activities: (id: string) => [...applicationKeys.all, 'activities', id] as const,
};

// api/services/applications.service.ts  (plain functions; return the envelope's data/page as-is)
export const applicationsService = {
  list: (params: ApplicationListQuery) =>
    httpClient
      .get<ApiList<ApplicationDto>>(APPLICATION_ENDPOINTS.list, { params })
      .then((r) => r.data),
  getById: (id: string) =>
    httpClient
      .get<ApiSuccess<ApplicationDetailDto>>(APPLICATION_ENDPOINTS.byId(id))
      .then((r) => r.data.data),
};

// api/hooks/queries/useApplicationsInfinite.ts  (fetch and return, nothing else)
export const useApplicationsInfinite = (params: ApplicationListQuery) =>
  useInfiniteQuery({
    queryKey: applicationKeys.list(params),
    queryFn: ({ pageParam }) => applicationsService.list({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.page.hasMore ? lastPage.page.nextCursor : undefined),
  });
```

- Hooks never format, filter, sort or map data. If a component needs a different shape, it calls a function from `utils/mappers` or `utils/formatters`.
- Mutation hooks may only do cache work in `onSuccess`/`onMutate`/`onError` (invalidate, optimistic update, rollback), using the key factories.
- Infinite scrolling: lists (applications table, companies, activity feed, admin lists) use `useInfiniteQuery` + `useInfiniteScroll` (sentinel element at the bottom). Board lanes use the same pattern per lane.

## 5. Naming

| Thing              | Convention                                      | Example                                                       |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------- |
| Backend files      | kebab-case with role suffix                     | `application-command.service.ts`, `application.repository.ts` |
| Classes            | PascalCase with role suffix                     | `ApplicationCommandService`, `GeminiAiProvider`               |
| Interfaces (ports) | PascalCase, no `I` prefix                       | `AiProvider`, `Mailer`                                        |
| React components   | PascalCase folder + file                        | `ApplicationCard/ApplicationCard.tsx`                         |
| Hooks              | `use` + PascalCase                              | `useMoveApplication.ts`                                       |
| Constants          | UPPER_SNAKE                                     | `MAX_PAGE_SIZE`                                               |
| Enums              | PascalCase name, UPPER_SNAKE members            | `StatusCategory.IN_PROGRESS`                                  |
| Tests              | same name + `.test.ts(x)`                       | `history-diff.test.ts`                                        |
| Env vars           | UPPER_SNAKE                                     | `GEMINI_MODEL_EXTRACT`                                        |
| Collections        | camelCase plural                                | `applications`, `aiUsage`                                     |
| API paths          | kebab-case plural nouns, verbs only for actions | `/applications/:id/move`                                      |

## 6. Repo documentation (created in Phase 0; `AGENTS.md` and `CONTRIBUTING.md` are already written, keep them updated)

| File                               | Content                                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                        | What HireTrail is, screenshots (later), tech stack, quick start (prerequisites, env setup, `pnpm i`, `pnpm dev`), scripts table, links to docs                                                                                |
| `CONTRIBUTING.md`                  | Branch naming, Conventional Commits, PR rules, Definition of Done, how to run tests, how to add a module (checklist), code review checklist                                                                                   |
| `AGENTS.md`                        | Rules for AI agents (already written)                                                                                                                                                                                         |
| `docs/adr/`                        | One short ADR per big decision: context, decision, consequences. Start with 0001 monorepo, 0002 MongoDB, 0003 own auth with rotating refresh tokens, 0004 synchronous AI on the Gemini free tier, 0005 Vercel + rewrite proxy |
| `SECURITY.md`                      | How to report a vulnerability (your email), supported versions                                                                                                                                                                |
| `CHANGELOG.md`                     | Keep a Changelog; one entry per merged PR under "Unreleased"                                                                                                                                                                  |
| `apps/*/README.md`                 | App-specific scripts and env vars                                                                                                                                                                                             |
| `.github/pull_request_template.md` | What/why, screenshots, how tested, checklist                                                                                                                                                                                  |
