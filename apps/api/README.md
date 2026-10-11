# HireTrail API (`apps/api`)

Express 5 backend providing the REST API for HireTrail (`/api/v1`).

## Architecture Highlights

- **Express 5** native promise handling for async route errors.
- **Layers:** Routes → Middleware → Controllers → Services (Command/Query) → Repositories (`BaseRepository` with `userId` scoping) → Mongoose Models.
- **Composition Root:** `core/container/container.ts` wires all singletons and repositories once.
- **Pino Logger:** Redacts authorization headers, cookies, passwords, API keys, and sensitive tokens.
- **Strict Error Envelope:** All errors are transformed through `errorHandler` into `{ error: { code, message, details, requestId } }`.
- **Cached Mongoose Connection:** Cached on `globalThis` for optimal serverless execution on Vercel.

## Scripts

- `pnpm dev`: Start local development server on port 4000 via `tsx watch`.
- `pnpm build`: Compile TypeScript for production.
- `pnpm typecheck`: Run type verification.
- `pnpm test`: Execute Vitest test suite.
