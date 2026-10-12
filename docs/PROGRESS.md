# Implementation Progress

## Done

### Phase 1: Authentication & Core Architecture

- Auth module: register, login, refresh with token rotation and reuse detection, logout, logout-all, `/me`, active sessions listing.
- Password reset and email verification flows with one-time tokens.
- Google OAuth 2.0 with PKCE and ID token validation.
- Default options seeded upon user registration inside database transactions.
- Express rate limiting and login throttling.

### Phase 2 & 3: Pipeline, Applications & Options

- **Shared Package (`packages/shared`)**:
  - Schemas: `option.schema.ts`, `company.schema.ts`, `application.schema.ts`, `comment.schema.ts`.
  - DTOs: `option.dto.ts`, `company.dto.ts`, `application.dto.ts`, `comment.dto.ts`, `board.dto.ts`.
- **Backend (`apps/api`)**:
  - Options module: CRUD, fractional indexing reorder (`FractionalOrder`), archive with reassign check (`OPTION_IN_USE`), restore, reset-defaults.
  - Companies module (minimal): create private company, search global + owned companies.
  - Applications module:
    - `ApplicationRepository` extending `BaseRepository` with `userId` scoping.
    - `ApplicationCommandService`: optimistic locking with version check (`findOneAndUpdate` on `{ _id, userId, version }`), duplicate warning detection (90 days), status transition & milestone calculations (`milestones.appliedAt`, `firstResponseAt`, `firstInterviewAt`, `offerAt`, `closedAt`, `closedReason`), HTML sanitization (`HtmlSanitizer`), history diff recording in `activities` collection within database transactions (`withTransaction`), archive, restore, soft delete, undo delete.
    - `ApplicationQueryService`: Table listing with cursor pagination (`Cursor`), filtering, sorting, board view with lane counts & items, per-lane load more.
    - Application controller and routes mounted with authentication guards.
  - Comments & Activity Feed module:
    - Comments CRUD with follow-up due/done toggling.
    - Activity feed endpoint (`/applications/:id/activities`) supporting `All`, `Comments`, and `History` filters with cursor pagination.
  - Container DI wiring in `core/container/container.ts` and route mounting in `app.ts`.
- **Frontend (`apps/web`)**:
  - API layer: endpoints, query-keys, services, and TanStack Query hooks (`useOptions`, `useApplicationsInfinite`, `useBoard`, `useApplication`, `useComments`, `useActivitiesInfinite`, `useCreateApplication`, `useUpdateApplicationField`, `useMoveApplication`).
  - Molecules & Organisms:
    - `InlineEditField` with debounced/queue save and state feedback.
    - `StatusPill` and `PriorityChip`.
    - `ApplicationsTable` with column structure and infinite scroll sentinel (`useInfiniteScroll`).
    - `PipelineLane` and `PipelineBoard` with `@dnd-kit`: mouse/touch/keyboard sensors, optimistic drag-and-drop with rollback, drag overlay.
    - `ApplicationPanel`: Single organism supporting `Create` and `View/edit` modes (with `mode` prop prepared for future `'ai-preview'`), two-column layout, InlineEditField save queue, CONFLICT banner with reload button, bottom `ActivityFeed` with `All`, `Comments`, and `History` tabs.
  - Pages:
    - `/applications`: Table page with infinite scroll and panel integration.
    - `/pipeline`: Kanban board with drag-and-drop and panel integration.
    - `/settings/pipeline-fields`: Pipeline & fields management (CRUD, archive, restore defaults).
  - Next.js 16 proxy/middleware compatibility verified.
  - Monorepo typecheck, lint, and build all pass cleanly (0 errors).

---

## Not Done / Next Steps

1. **Phase 4**: Companies directory & seed data import (`seed/companies.seed.json`, company profile page, report ratings, admin merge/verification).
2. **Phase 5**: Dashboard KPIs, analytics charts, and weekly insights.
3. **Phase 6**: AI integration (job description autofill with Gemini, company accuracy verifications).
4. **Deferred Tests**: Execute and implement tests documented in `docs/TEST-BACKLOG.md`.
