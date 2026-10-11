# Contributing to HireTrail

## Setup

1. Node version from `.nvmrc` (use `nvm use`), pnpm (`corepack enable`).
2. `pnpm install`
3. Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env.local`, then fill in values (see `docs/08-quality-ci-cd.md` §6).
4. `pnpm dev` starts the web app (:3000) and the API (:4000).

## Scripts

| Command                                                                        | What it does                 |
| ------------------------------------------------------------------------------ | ---------------------------- |
| `pnpm dev`                                                                     | run web + api in watch mode  |
| `pnpm lint` / `pnpm format`                                                    | ESLint / Prettier            |
| `pnpm typecheck`                                                               | TypeScript in every package  |
| `pnpm test`                                                                    | unit + route tests (Vitest)  |
| `pnpm test:e2e`                                                                | Playwright end-to-end tests  |
| `pnpm build`                                                                   | production builds            |
| `pnpm --filter api seed:companies ../seed/companies.seed.json`                 | import the company directory |
| `pnpm --filter api user:grant --email you@example.com --role ADMIN --plan PRO` | make a user admin/PRO        |

## Branches and commits

- Branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org): `feat(applications): add move endpoint`.
- Commits are written and made by a human. AI tools may propose messages but must not commit or add co-author lines.
- One feature slice per PR. Keep PRs small enough to review in 20 minutes.

## Definition of Done

- [ ] Lint, type-check, tests and build pass locally and in CI
- [ ] New service logic and pure helpers have unit tests
- [ ] New endpoints have route tests for auth, plan/role guards, ownership (other user's ID → 404) and validation
- [ ] Inputs validated with shared Yup schemas; errors use `AppError` codes
- [ ] UI works at 360 px and desktop, keyboard reachable, uses design tokens only
- [ ] Docs and `CHANGELOG.md` updated if behaviour or the API changed

## Adding a backend module (checklist)

1. Create `apps/api/src/modules/<name>/` with the standard shape (`docs/10-folder-structure.md` §3).
2. Model + indexes; repository extending `BaseRepository`.
3. Shared Yup schemas and DTO types in `packages/shared`.
4. Command/query services, policy, mapper, controller, routes.
5. Register everything in `core/container/container.ts` and mount the router in `app.ts`.
6. Tests: services, pure helpers, routes (guards + ownership).
7. Document endpoints in `docs/04-api.md`.

## Adding a frontend feature (checklist)

1. Endpoints in `api/endpoints`, keys in `api/query-keys`, request functions in `api/services`.
2. Hooks in `api/hooks/queries` or `api/hooks/mutations` (fetch/return only; cache work in mutations).
3. Atoms/molecules first if missing; organisms use the hooks; templates arrange organisms; pages render templates.
4. Mapping/formatting in `utils/`. Lists use infinite scroll.
5. Tests with React Testing Library + MSW.

## Code review checklist

- Does every query scope by `userId`? Are guards on the server?
- Any business logic in controllers, React components or hooks? Move it.
- Any magic numbers, duplicated validation, `any`, swallowed errors, `process.env` outside config?
- Any secrets, tokens or personal data in logs?
- Are new strings, colours and spacing using shared constants and tokens?
