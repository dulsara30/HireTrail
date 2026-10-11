# HireTrail Web (`apps/web`)

Next.js App Router frontend for HireTrail.

## Architecture Highlights

- **Design System:** Built using exact design tokens from `docs/07-frontend-and-design.md` §1 (Tailwind v4 theme variables, 4-point spacing grid, tag palette). No raw hex values.
- **Component Architecture:** Atomic design (atoms → molecules → organisms → templates).
- **Data Fetching:** TanStack Query + Axios split into endpoints, query-keys, services, and hooks. Hooks only fetch and return; data transformation lives in `utils/`.
- **API Proxy:** Next.js rewrites `/api/v1/*` to the Express backend for first-party session cookies.

## Scripts

- `pnpm dev`: Start Next.js development server on port 3000.
- `pnpm build`: Create production build.
- `pnpm typecheck`: Run TypeScript type checking.
- `pnpm test`: Run component and unit tests with Vitest.
