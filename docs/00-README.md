# HireTrail: Job Application Tracker

A personal job-application tracker with a pipeline board, one smart side panel for every application, a company directory and PRO AI features. Built as a fun project, designed like a product other people could use.

This folder is the full plan. It lives in the repo as `docs/`. The coding agent (Antigravity) reads it before every task, together with `AGENTS.md` at the repo root.

## The documents

| File                          | What it covers                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `01-product-requirements.md`  | Every feature, FREE vs PRO vs ADMIN, the side panel modes, dashboard KPIs                                      |
| `02-architecture.md`          | System view, backend layers and OOP/SOLID rules, middleware, errors, responses, synchronous AI                 |
| `03-data-model.md`            | Every MongoDB collection, fields, indexes, ownership, soft delete, versions, history, milestones               |
| `04-api.md`                   | Every REST endpoint, guards, error codes                                                                       |
| `05-ai.md`                    | Gemini free-tier setup, autofill → side panel preview, company verification score, AI lookup, insights, quotas |
| `06-security.md`              | Auth (email + Google), sessions, roles and plans, OWASP checklist, SSRF, rate limits                           |
| `07-frontend-and-design.md`   | Exact Figma tokens, board, the side panel layout and modes, forms, data fetching rules                         |
| `08-quality-ci-cd.md`         | Standards, tests, GitHub Actions, Vercel, environments, env vars                                               |
| `10-folder-structure.md`      | Exact folder trees for repo, shared, API and web; naming; repo docs                                            |
| `11-orbit.md`                 | Orbit: tasks, reminders, widget board, Free and Pro limits, email                                              |
| `../seed/companies.seed.json` | 173 companies from your two research PDFs, ready to import                                                     |

## Locked decisions

| Area     | Decision                                                                                                                                                                                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo     | pnpm + Turborepo monorepo: `apps/web`, `apps/api`, `packages/shared`                                                                                                                                                                                                                                |
| Frontend | Next.js App Router + TypeScript; atomic components; API layer split into endpoints / query keys / services / hooks (TanStack Query + Axios); hooks only fetch; infinite scroll on lists; Zustand for UI state; Formik + Yup; dnd-kit; TipTap; Recharts; Tailwind with the exact Seatly Figma tokens |
| Backend  | Express 5 + TypeScript; OOP classes with constructor injection; command/query services, policies, `BaseRepository` with userId scoping, ports + infrastructure adapters                                                                                                                             |
| Database | MongoDB Atlas + Mongoose                                                                                                                                                                                                                                                                            |
| Auth     | Own auth: email + password (argon2id) and Google sign-in (server code flow + PKCE). 15-min access JWT in memory + rotating refresh token in an HttpOnly cookie                                                                                                                                      |
| AI       | Gemini free tier through the `AiProvider` port. Synchronous calls inside the request (no queue, no cron). Models set by env                                                                                                                                                                         |
| Hosting  | Vercel: two projects from one repo; the web app proxies `/api/*` to the API                                                                                                                                                                                                                         |
| Plans    | FREE / PRO on the user document; PRO set by an admin for now; payments later                                                                                                                                                                                                                        |
| Git      | The agent never commits or pushes and never adds co-author lines. You commit after review                                                                                                                                                                                                           |

## Non-negotiable rules

1. Every user-owned query is scoped by `userId` in the repository layer.
2. PRO and ADMIN checks happen on the server, from the user loaded from the DB for that request.
3. Every input is validated with the shared Yup schema.
4. Every error is an `AppError` with a stable code. No raw error messages reach clients.
5. AI output is never saved until the user presses Save, and never treated as instructions.
6. Each phase ends with passing lint, type-check, tests and build.
