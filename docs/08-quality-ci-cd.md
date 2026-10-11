# 08: Code Quality, Testing, CI/CD and Environments

## 1. Coding standards

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, no `any` (ESLint error). `unknown` + narrowing instead.
- ESLint flat config (`packages/eslint-config`): `typescript-eslint` strict + type-checked, `eslint-plugin-import` (ordered imports, no cycles), `no-floating-promises`, `no-console` (use the logger), React hooks rules on the web app.
- Prettier, 100-char lines. Husky + lint-staged run lint and format on staged files.
- Naming: `PascalCase` classes and components, `camelCase` functions and variables, `UPPER_SNAKE` constants, files `kebab-case` (backend: `application.service.ts`; frontend components `ApplicationCard.tsx`).
- SOLID in practice:
  - **S:** controllers translate HTTP, services hold rules, repositories hold queries.
  - **O:** new AI providers, fetchers or mailers are new classes implementing an interface, not `if` branches.
  - **L:** fakes in tests implement the same interfaces as real providers.
  - **I:** small interfaces (`AiProvider`, `PageFetcher`, `Mailer`, `Clock`), not one giant "utils".
  - **D:** services depend on interfaces, wired in `core/container.ts`.
- Code smells to avoid (PR reviewers check): functions over ~40 lines, more than 3 levels of nesting, boolean flag parameters, magic numbers (use `packages/shared/constants`), duplicated validation (use shared schemas), `catch {}` that hides errors, business logic in controllers or React components, `process.env` outside `config/`.
- Commits: Conventional Commits (`feat(applications): add move endpoint`). Branches: `feat/...`, `fix/...`, `chore/...`.
- PR template: what changed, why, screenshots for UI, how it was tested, checklist (tests added, docs updated, no secrets, migrations/seed needed?).

### Definition of Done (every PR)

- [ ] Lint, type-check, tests and build pass in CI
- [ ] New service logic has unit tests; new endpoints have route tests including auth and ownership cases
- [ ] Validation uses shared Yup schemas
- [ ] Errors use `AppError` codes
- [ ] UI works at 360 px and desktop, keyboard reachable
- [ ] Docs in `docs/` updated if behaviour or API changed

## 2. Testing strategy

| Layer            | Tool                                                                      | What                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared schemas   | Vitest                                                                    | every schema: valid and invalid examples                                                                                                                                                              |
| API services     | Vitest + `mongodb-memory-server` (replica-set mode, so transactions work) | business rules, milestones, history diff, option reassignment, quota checks, verification scoring                                                                                                     |
| API routes       | Vitest + Supertest against the real Express app and in-memory Mongo       | status codes, envelope shape, auth/plan/role guards, ownership (another user's IDs → 404), validation errors, rate limit headers                                                                      |
| AI               | Vitest with `FakeAiProvider` and recorded fixtures                        | extraction checks, evidence verification, injection attempts, fallbacks. No real Gemini calls in CI                                                                                                   |
| Security helpers | Vitest                                                                    | SafeFetcher IP blocking, HTML sanitiser, CSV escaping, token hashing                                                                                                                                  |
| Web components   | Vitest + React Testing Library + MSW                                      | forms (validation messages, server error mapping), inline edit states, card rendering, plan-locked UI                                                                                                 |
| E2E              | Playwright (from phase 3)                                                 | sign up → create application → drag to Interview → open side panel → edit → comment → see history → dashboard counts update. Runs in the `e2e` CI job against local servers and mongodb-memory-server |

Coverage gate in CI: API services ≥ 80% lines, overall ≥ 70%. The gate rises as the project matures, never drops.

Optional manual check before each release: `pnpm test:ai-live` runs 5 real Gemini calls against fixtures with your key, locally only.

## 3. GitHub Actions

### `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - name: Cache MongoDB binaries (mongodb-memory-server)
        uses: actions/cache@v4
        with:
          path: ~/.cache/mongodb-binaries
          key: mongo-bin-${{ runner.os }}-v1
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck
      - run: pnpm turbo run test -- --coverage
      - run: pnpm turbo run build
        env:
          # build-time placeholders only; real values live in Vercel
          API_ORIGIN: http://localhost:4000
      - run: pnpm audit --prod --audit-level=high

  e2e:
    needs: quality
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web exec playwright install --with-deps chromium
      # The e2e script starts mongodb-memory-server (replica set), the API on :4000 and the web app on :3000,
      # seeds a test user, then runs Playwright. Secrets here are throwaway test values.
      - run: pnpm test:e2e
        env:
          APP_ENV: development
          JWT_ACCESS_SECRET: e2e-only-secret-not-used-anywhere-else-000000
          COOKIE_SECRET: e2e-only-cookie-secret-000000000000000000
          IP_HASH_SALT: e2e-salt-0000000000
          AI_ENABLED: 'false'
          API_ORIGIN: http://localhost:4000
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    name: Deploy ${{ matrix.app }} (${{ github.event_name == 'push' && 'production' || 'preview' }})
    needs: [quality, e2e, secrets-scan]
    if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - app: api
            project_secret: VERCEL_PROJECT_ID_API
          - app: web
            project_secret: VERCEL_PROJECT_ID_WEB
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets[matrix.project_secret] }}
      VERCEL_ENV: ${{ github.event_name == 'push' && 'production' || 'preview' }}
      PROD_FLAG: ${{ github.event_name == 'push' && '--prod' || '' }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm add -g vercel@latest
      - run: vercel pull --yes --environment=$VERCEL_ENV --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build $PROD_FLAG --token=${{ secrets.VERCEL_TOKEN }}
      - id: deploy
        run: echo "url=$(vercel deploy --prebuilt $PROD_FLAG --token=${{ secrets.VERCEL_TOKEN }})" >> "$GITHUB_OUTPUT"
      - name: Point the stable preview alias at this PR's deployment
        if: github.event_name == 'pull_request'
        run: vercel alias set ${{ steps.deploy.outputs.url }} ${{ matrix.app == 'api' && vars.PREVIEW_ALIAS_API || vars.PREVIEW_ALIAS_WEB }} --token=${{ secrets.VERCEL_TOKEN }}
      - run: echo "Deployed ${{ matrix.app }} to ${{ steps.deploy.outputs.url }}"
```

Notes:

- Until phase 3, `pnpm test:e2e` is a placeholder script that prints "no e2e tests yet" and exits 0.
- Deploys only happen after `quality` and `secrets-scan` pass. PRs get preview deployments; pushes to `main` go to production. The API deploys before the web app is fine either way because the web only proxies.
- Turn off Vercel's own Git auto-deploys so nothing deploys untested. In both `apps/web/vercel.json` and `apps/api/vercel.json` set `"git": { "deploymentEnabled": false }`.
- In each Vercel project set **Root Directory** to `apps/web` or `apps/api`, and Node.js version to match `.nvmrc`.
- Pin the `vercel` CLI version once things work (replace `@latest`), and pin third-party actions to a commit SHA for supply-chain safety.
- Branch protection on `main`: require the `quality`, `e2e` and `secrets-scan` checks, require PRs (no direct pushes), require linear history.
- Add `.github/dependabot.yml` for npm (weekly, grouped minor/patch) and GitHub Actions (monthly).

### `apps/api/vercel.json`

```json
{ "git": { "deploymentEnabled": false } }
```

No cron jobs: all AI work is synchronous.

### Web rewrite (`apps/web/next.config.ts`)

```ts
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.API_ORIGIN}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

## 4. Environments

| Env              | Web                                            | API                 | Database                                                                                                                               |
| ---------------- | ---------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Local            | `pnpm dev` on :3000                            | `pnpm dev` on :4000 | Atlas free cluster DB `hiretrail_dev` (or local Docker Mongo as a replica set)                                                         |
| Preview (per PR) | Vercel preview URL                             | Vercel preview URL  | Atlas DB `hiretrail_preview` (shared, wiped weekly by a script)                                                                        |
| Production       | `app` domain (custom domain or `*.vercel.app`) | `api` domain        | Atlas DB `hiretrail_prod` with daily backups (Atlas free tier has limits; export a weekly JSON backup with a script until you upgrade) |

Preview URLs change on every deploy, but `API_ORIGIN`, `WEB_APP_URL`, `CORS_ORIGINS` and the CSRF `Origin` check need fixed values. So give each Vercel project a stable preview alias (for example `api-staging.<domain>` and `staging.<domain>`, assigned with `vercel alias` in the deploy job for PR builds) and set the Preview-environment variables to those aliases. Previews must never point at the production API or database. With one shared staging alias, the last deployed PR wins, which is fine for a solo project.

Google sign-in needs exact redirect URIs, and preview URLs change on every deploy. So use email + password on previews, or add one stable preview alias (for example `staging`) and register only that URI with Google.

## 5. Database operations

- Atlas: enable IP access list for Vercel (Atlas "allow access from anywhere" is the common choice on Vercel's dynamic IPs; then the strong DB password and TLS are the protection, so keep the user's permissions limited to one database).
- Separate DB users per environment, least privilege (`readWrite` on that DB only).
- Index creation: `autoIndex` on in dev; in production run `pnpm --filter api db:sync-indexes` as a deploy step script (manual for now).
- Seed: `pnpm --filter api seed:companies ../seed/companies.seed.json` (idempotent).
- Make yourself admin and PRO: `pnpm --filter api user:grant --email you@example.com --role ADMIN --plan PRO` (script writes an audit log entry with `actorType: 'SYSTEM'` and `actorId: null`).

## 6. Environment variables

`apps/api` (validated at startup by `config/env.ts`):

| Name                                                                                           | Example / rule                                        | Notes                                                           |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `APP_ENV`                                                                                      | `development` \| `preview` \| `production`            |                                                                 |
| `PORT`                                                                                         | `4000`                                                | local only                                                      |
| `LOG_LEVEL`                                                                                    | `info`                                                |                                                                 |
| `MONGODB_URI`                                                                                  | `mongodb+srv://…`                                     | secret                                                          |
| `MONGODB_DB_NAME`                                                                              | `hiretrail_prod`                                      |                                                                 |
| `WEB_APP_URL`                                                                                  | `https://app.example.com`                             | used in emails and OAuth redirects                              |
| `CORS_ORIGINS`                                                                                 | comma-separated                                       | the web origin                                                  |
| `JWT_ACCESS_SECRET`                                                                            | ≥ 32 random bytes                                     | secret                                                          |
| `JWT_ISSUER`, `JWT_AUDIENCE`                                                                   | `hiretrail-api`, `hiretrail-web`                      |                                                                 |
| `ACCESS_TOKEN_TTL_MIN`                                                                         | `15`                                                  |                                                                 |
| `REFRESH_TOKEN_TTL_DAYS`                                                                       | `30`                                                  |                                                                 |
| `COOKIE_SECRET`                                                                                | ≥ 32 bytes                                            | signs the short-lived OAuth state cookie                        |
| `IP_HASH_SALT`                                                                                 | ≥ 16 bytes                                            |                                                                 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                     | from Google Cloud console                             | secret                                                          |
| `GOOGLE_REDIRECT_URI`                                                                          | `https://app.example.com/api/v1/auth/google/callback` | goes through the web rewrite, so cookies land on the web domain |
| `GEMINI_API_KEY`                                                                               | from Google AI Studio                                 | secret, server only                                             |
| `GEMINI_MODEL_EXTRACT`                                                                         | `gemini-3.6-flash` (newest free Flash)                | extraction and structuring. Re-check the free list in AI Studio |
| `GEMINI_MODEL_GROUNDED`                                                                        | `gemini-2.5-flash`                                    | Google Search grounding is free on this model (500/day shared)  |
| `GEMINI_TOOLS_WITH_SCHEMA`                                                                     | `false`                                               | two-call mode for the free tier (see `05-ai.md` §3)             |
| `AI_ENABLED`                                                                                   | `true`                                                | kill switch                                                     |
| `AI_GLOBAL_DAILY_LIMIT`                                                                        | `500`                                                 |                                                                 |
| `AI_QUOTA_AUTOFILL`, `AI_QUOTA_COMPANY_VERIFY`, `AI_QUOTA_COMPANY_LOOKUP`, `AI_QUOTA_INSIGHTS` | `40`, `20`, `20`, `1`                                 | per PRO user per day                                            |
| `EMAIL_API_KEY`, `EMAIL_FROM`                                                                  | e.g. Resend key, `HireTrail <no-reply@…>`             |                                                                 |
| `SENTRY_DSN`                                                                                   | optional                                              |                                                                 |

`apps/web`:

| Name                     | Notes                            |
| ------------------------ | -------------------------------- |
| `API_ORIGIN`             | server-only, used by the rewrite |
| `NEXT_PUBLIC_APP_NAME`   | display name                     |
| `NEXT_PUBLIC_SENTRY_DSN` | optional                         |

GitHub repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_WEB`, `VERCEL_PROJECT_ID_API`. Repository variables: `PREVIEW_ALIAS_API`, `PREVIEW_ALIAS_WEB` (for example `api-staging.example.com`, `staging.example.com`).

Commit `.env.example` files with fake values for both apps. Never commit real `.env` files.
