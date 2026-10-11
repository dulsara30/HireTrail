# 02: Architecture

## 1. System view

```
Browser
  │  https://app.<domain>  (Vercel project: web)
  ▼
Next.js (apps/web)
  │  rewrites /api/v1/* → https://api.<domain>/api/v1/*   (same-origin for the browser,
  │                                                        so the refresh cookie is first-party)
  ▼
Express 5 API (apps/api, Vercel project: api, one Vercel Function)
  ├── MongoDB Atlas (data, sessions, rate-limit counters)
  ├── Google OAuth (sign-in)
  ├── Gemini API, free tier (AI features, server-side only, synchronous calls)
  └── Email provider (Resend free tier: verification + reset emails)
```

Why the rewrite matters: the browser only ever talks to the web app's own domain, so the refresh-token cookie is same-site. That avoids third-party cookie blocking (each `*.vercel.app` subdomain counts as a separate site) and makes CSRF easier to control. You used the same idea (a BFF proxy) in Seatly.

Vercel facts this design depends on (checked October 2026):

- Express deploys with zero config when `src/index.ts` (or `src/app.ts`, `src/server.ts`) default-exports the app. The whole app becomes one Vercel Function. `express.static()` is ignored.
- Hobby plan functions can run up to 300 seconds, so even a slow AI call (well under a minute) fits in a normal request.

**AI calls are synchronous.** The API calls Gemini inside the request and returns the result. No job queue, no cron, no background workers. The UI shows a loading state while it waits. This keeps the system simple; a queue can be added later if AI work ever grows.

## 2. Monorepo layout

```
hiretrail/
├── apps/
│   ├── web/                Next.js App Router frontend
│   └── api/                Express 5 backend
├── packages/
│   ├── shared/             Yup schemas, enums, error codes, DTO types, constants (used by web AND api)
│   ├── eslint-config/      shared ESLint flat config
│   └── tsconfig/           shared tsconfig bases
├── seed/                   companies.seed.json
├── docs/                   the plan + ADRs
├── .github/                workflows, PR template, issue templates, dependabot
├── AGENTS.md               rules for AI coding agents
├── CONTRIBUTING.md         how to work in this repo
├── README.md               what it is + how to run it
├── SECURITY.md             how to report a vulnerability
├── CHANGELOG.md            Keep a Changelog format
├── turbo.json, pnpm-workspace.yaml, package.json
└── .nvmrc                  Node 22 LTS (same in local, CI and Vercel)
```

The full folder trees for every app and package are in `10-folder-structure.md`.

## 3. Backend design

### 3.1 Layers

```
Route  →  Middleware chain  →  Controller  →  Service  →  Repository  →  Mongoose Model
                                                 │
                                                 ├── Policy (authorization rules for the domain)
                                                 ├── Domain helpers (pure classes/functions: MilestoneCalculator, HistoryDiff, VerificationScorer)
                                                 └── Ports (interfaces) → Infrastructure adapters (Gemini, Mailer, SafeFetcher, Argon2, Clock)
```

| Layer                  | Responsibility                                                                                                                            | Must not                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Route                  | Path, middleware order, bind controller method. Static paths (`/applications/board`, `/export`, `/import/*`) are registered before `/:id` | Contain logic                                              |
| Controller             | Read `req.validated` + `req.user`, call one service method, return through `ApiResponse` helpers                                          | Touch Mongoose, contain business `if`s                     |
| Service (command)      | Use cases that change state: create, update, move, archive. Transactions, policies, activities                                            | Read `req`/`res`, build HTTP responses, read `process.env` |
| Service (query)        | Read use cases: lists, board, detail, dashboard aggregations                                                                              | Write data                                                 |
| Policy                 | Authorization decisions for one domain (`ApplicationPolicy.assertCanEdit(user, app)`)                                                     | Query the DB itself                                        |
| Repository             | All DB access, always scoped by `userId` (or explicit global scope)                                                                       | Business rules, HTTP errors other than NotFound/Conflict   |
| Model                  | Mongoose schema, indexes, plugins                                                                                                         | Logic                                                      |
| Mapper                 | Document ⇄ response DTO                                                                                                                   | Queries                                                    |
| Infrastructure adapter | Implements a port (`GeminiAiProvider implements AiProvider`)                                                                              | Business rules                                             |

Splitting each domain into a **command service** and a **query service** keeps classes small (no 1,500-line `ApplicationService`) and makes it clear which code can change data.

### 3.2 OOP and SOLID, concretely

- **Classes with constructor injection** for services, repositories, policies, controllers and adapters. Wiring happens once in `core/container/container.ts` (composition root). No `new` of collaborators inside business classes, no service locator.
- **`BaseRepository<TDoc>`** (abstract class) gives every user-owned repository the same safe primitives: `findOwnedById(userId, id)`, `listOwned(userId, filter, cursorPage)`, `updateOwnedWithVersion(userId, id, version, changes)`, `softDeleteOwned(userId, id)`. Concrete repositories add domain queries. Nobody can forget the `userId` scope because the base methods require it.
- **Ports (interfaces)** in `core/ports`: `AiProvider`, `WebPageFetcher`, `Mailer`, `PasswordHasher`, `TokenSigner`, `Clock`, `IdGenerator`. Services depend on these, never on SDKs. Tests inject fakes.
- **Strategy pattern** where behaviour varies: `OptionMatcher` strategies (exact, alias, fuzzy) for AI/import mapping; `GroundedModeStrategy` (one-call vs two-call) inside the Gemini adapter.
- **Value objects** for small concepts with rules: `Money` (minor units + currency), `Cursor` (encode/decode, tamper-checked), `EmailAddress`, `FractionalOrder`.
- **Pure domain helpers** for logic that needs heavy testing: `MilestoneCalculator`, `HistoryDiff`, `VerificationScorer`, `CsvEscaper`, `DuplicateDetector`.
- **Single responsibility:** one reason to change per class. If a class needs more than ~5 constructor dependencies or ~200 lines, split it.
- **Open/closed:** a new AI provider, mailer or fetcher is a new adapter class, not an `if` in a service.
- **Liskov:** fakes and real adapters satisfy the same interface and the same contract tests.
- **Interface segregation:** small ports, one purpose each.
- **Dependency inversion:** business code imports `core/ports`, never `infrastructure/*`.

### 3.3 Code smells we reject in review

Long methods (~40+ lines), deep nesting (>3), boolean flag parameters, magic numbers/strings (use `packages/shared/constants`), primitive obsession for money/cursors (use value objects), duplicated validation (use shared schemas), feature envy (a service reaching into another module's repository instead of its service), god classes, `catch {}` that hides errors, `any`, commented-out code, `process.env` outside `config/`.

### 3.4 Middleware order (only in `app.ts`)

```
1. requestId            take x-request-id if it's a valid UUID, else generate; echo it back
2. httpLogger (pino)    method, path, status, duration, requestId, userId (never bodies or tokens)
3. helmet               security headers
4. cors                 allowlist from env
5. express.json         limit 1 MB; urlencoded off
6. cookie-parser
7. ipRateLimit          per IP, shared Mongo store (see 06-security.md §5)
8. routes               per route: [route IP limit] → authenticate → [userId limit]
                        → requireRole / requirePlan / requireVerifiedEmail → validate(schema) → controller
9. notFound             unknown route → NotFoundError(ROUTE_NOT_FOUND)
10. errorHandler        the only place errors become HTTP responses
```

### 3.5 Errors

```ts
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode; // from packages/shared
  abstract readonly status: number;
  constructor(
    message?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}
export class ValidationError extends AppError {
  code = ErrorCode.VALIDATION_FAILED;
  status = 400;
}
export class UnauthenticatedError extends AppError {
  code = ErrorCode.UNAUTHENTICATED;
  status = 401;
}
export class ForbiddenError extends AppError {
  code = ErrorCode.FORBIDDEN;
  status = 403;
}
export class PlanRequiredError extends AppError {
  code = ErrorCode.PLAN_REQUIRED;
  status = 403;
}
export class NotFoundError extends AppError {
  code = ErrorCode.NOT_FOUND;
  status = 404;
}
export class ConflictError extends AppError {
  code = ErrorCode.CONFLICT;
  status = 409;
}
export class RateLimitedError extends AppError {
  code = ErrorCode.RATE_LIMITED;
  status = 429;
}
export class UpstreamError extends AppError {
  code = ErrorCode.AI_UNAVAILABLE;
  status = 502;
}
// …one class per code family; codes listed in 04-api.md
```

The error handler maps:

- `AppError` → its status and `{ error: { code, message, details, requestId } }`.
- Mongoose `ValidationError` / `CastError` → 400 `VALIDATION_FAILED` / `INVALID_ID`.
- Duplicate key (11000) → 409 `DUPLICATE`.
- Malformed JSON → 400 `INVALID_JSON`.
- Anything else → 500 `INTERNAL_ERROR`, generic message; the real error is logged with the requestId.

Express 5 forwards rejected promises from async handlers to the error handler, so no `asyncHandler` wrapper is needed.

### 3.6 Responses

```jsonc
{ "data": { "id": "...", "roleTitle": "..." } }                                   // single
{ "data": [ ... ], "page": { "nextCursor": "eyJ...", "hasMore": true, "limit": 25 } } // list (cursor)
{ "error": { "code": "CONFLICT", "message": "...", "details": { "currentVersion": 7 }, "requestId": "..." } }
```

Status codes mean what they say: 200, 201, 204, 400, 401, 403, 404 (also for other users' resources), 409, 429, 500, 502.

### 3.7 Config, logging, DB

- `config/env.ts` validates every env var with Yup at startup and exports a typed, frozen `config` object. Bad config → the app refuses to start with a clear message.
- pino JSON logs with `requestId`, `userId`, `route`, `status`, `durationMs`; redaction of auth headers, cookies, passwords, tokens and API keys. No request bodies, job text or prompts at info level.
- Mongoose connection cached on `globalThis` for warm serverless invocations, `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`.

### 3.8 AI calls (synchronous)

```
POST /ai/autofill or POST /companies/:id/verify
  → guards (plan, verified email, quota)
  → service calls AiProvider with a timeout (autofill 30 s, verification 60 s)
  → result checked and returned in the same response
  → UI shows a loading state; on timeout / Gemini free-tier limit → 502 AI_UNAVAILABLE with a friendly message
```

## 4. Frontend design (summary)

- Next.js App Router. `app/` holds routes only; pages are thin and compose templates.
- Components follow atomic design: `atoms → molecules → organisms → templates`.
- The API layer is split into **endpoints**, **query keys**, **services** (plain typed axios calls) and **hooks** (TanStack Query). Hooks only fetch and return; they never reshape data. Formatting and mapping live in `utils/`.
- Lists use cursor pagination with `useInfiniteQuery` and an `IntersectionObserver` hook for infinite scrolling.
- Zustand only for UI state (auth token in memory, board UI, panel state).

Full rules and trees: `07-frontend-and-design.md` and `10-folder-structure.md`.
