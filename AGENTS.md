# AGENTS.md: Rules for AI coding agents

You are working on **HireTrail**, a production-grade job application tracker, built from scratch.
The plan in `docs/` is the source of truth. If the code and the docs disagree, stop and ask.

## Git rules (strict)

- **Never run `git commit`, `git push`, `git merge`, `git rebase`, `git tag`, `git reset --hard` or `git stash`**, and never change git config. The owner commits everything himself after reviewing.
- You may run read-only git commands (`git status`, `git diff`, `git log`).
- **Never add yourself as an author or co-author.** No `Co-Authored-By` lines, no "Generated with …" or "Created by AI" text in commit messages, PR descriptions, code comments, docs or file headers.
- At the end of each task, propose a Conventional Commit message (for example `feat(auth): add refresh token rotation`) in your reply, as text only.

## Before writing code

1. Read `docs/00-README.md` and every doc the current phase in `docs/09-roadmap.md` lists.
2. Reply with a plan: files to create or change (as a tree), key decisions, tests to add, open questions.
3. Wait for explicit approval ("approved"). Then implement only that phase.

## Always

- Use the folder structure in `docs/10-folder-structure.md` exactly. Ask before adding a new top-level folder.
- Backend: layers and OOP/SOLID rules in `docs/02-architecture.md` §3. Classes with constructor injection, wired only in `core/container/container.ts`. Command and query services per domain. Repositories extend `BaseRepository` and always scope by `userId`. SDKs are imported only in `infrastructure/`.
- Enforce role, plan and verified-email checks on the server (`docs/06-security.md` §4).
- Validate every input with the shared Yup schemas in `packages/shared`.
- Throw `AppError` subclasses with codes from `packages/shared/errors`. Never send raw error messages.
- Frontend: atoms → molecules → organisms → templates. API layer split into `endpoints`, `query-keys`, `services`, `hooks`. Hooks only fetch and return data; mapping and formatting live in `utils/`. Lists use `useInfiniteQuery` + `useInfiniteScroll`.
- Use only the design tokens from `docs/07-frontend-and-design.md` §1. No raw hex colours in components.
- Side effects (emails, AI calls) happen after the database transaction commits.
- AI calls go through the `AiProvider` port and are synchronous. AI output is never saved until the user presses Save.
- Write tests for every new service, pure helper and route, including ownership (other user's ID → 404) and guard tests.
- Before saying a task is done, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and show the result.
- Update the docs (and `CHANGELOG.md` under "Unreleased") when behaviour or the API changes.

## Never

- Commit secrets or real `.env` files, or print secrets in logs.
- Add a dependency without saying why and asking.
- Disable lint rules, type checks or tests, or use `any`, to make things pass.
- Build features from later phases "while you're there".
- Leave TODOs without listing them in your final reply.
