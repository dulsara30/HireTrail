# HireTrail

HireTrail is a production-grade personal job-application tracker featuring a Kanban pipeline board, a smart side panel for every application, a verified company directory, and AI-assisted workflows.

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend (`apps/web`):** Next.js App Router (React 19), Tailwind CSS v4 with design tokens, TanStack Query, Axios, Lucide React
- **Backend (`apps/api`):** Express 5, TypeScript, Mongoose, Pino logger, Yup validation, OOP architecture with composition root container
- **Shared (`packages/shared`):** Shared Yup validation schemas, error codes, DTOs, and domain constants
- **Database:** MongoDB Atlas (or local MongoDB replica set for transactions)
- **CI/CD & Hosting:** GitHub Actions, Vercel Functions and hosting

## Quick Start

### Prerequisites

- Node.js >= 22 (pinned in `.nvmrc`)
- pnpm >= 10 (`corepack enable` or `npm install -g pnpm`)
- MongoDB connection string (Atlas or local replica set)

### Setup

1. Clone the repository:

   ```bash
   git clone <repo-url> hiretrail
   cd hiretrail
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Configure environment variables:
   - Copy `apps/api/.env.example` to `apps/api/.env` and update values.
   - Copy `apps/web/.env.example` to `apps/web/.env.local` and update values.

4. Run the development servers:
   ```bash
   pnpm dev
   ```
   - Web application: http://localhost:3000
   - Express API: http://localhost:4000

## Available Scripts

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Run all applications in development mode   |
| `pnpm build`        | Build all packages and applications        |
| `pnpm lint`         | Lint all packages with ESLint              |
| `pnpm typecheck`    | Run TypeScript type checks                 |
| `pnpm test`         | Run unit and integration tests with Vitest |
| `pnpm test:e2e`     | Run end-to-end tests                       |
| `pnpm format`       | Format code with Prettier                  |
| `pnpm format:check` | Check code formatting                      |

## Documentation

Full architectural and product specifications are maintained in the [`docs/`](./docs) folder:

- [00-README.md](./docs/00-README.md) - System overview and index
- [01-product-requirements.md](./docs/01-product-requirements.md) - Functional requirements
- [02-architecture.md](./docs/02-architecture.md) - System design and backend layers
- [03-data-model.md](./docs/03-data-model.md) - MongoDB schemas, indexes, and plugins
- [04-api.md](./docs/04-api.md) - REST API specification
- [05-ai.md](./docs/05-ai.md) - AI integration strategy
- [06-security.md](./docs/06-security.md) - Authentication and security
- [07-frontend-and-design.md](./docs/07-frontend-and-design.md) - Design tokens and frontend architecture
- [08-quality-ci-cd.md](./docs/08-quality-ci-cd.md) - Testing and deployment pipelines
- [09-roadmap.md](./docs/09-roadmap.md) - Phased implementation plan
- [10-folder-structure.md](./docs/10-folder-structure.md) - Folder layout and conventions
