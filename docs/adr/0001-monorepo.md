# ADR 0001: Monorepo with pnpm and Turborepo

## Status

Accepted

## Context

HireTrail consists of a web frontend (`apps/web`), an API backend (`apps/api`), and shared validation schemas, types, constants, and error codes (`packages/shared`). Maintaining separate repositories introduces version drift and complicated coordination between client and server schemas.

## Decision

Use a pnpm workspaces monorepo managed with Turborepo.

- `apps/web`: Next.js frontend application.
- `apps/api`: Express 5 backend application.
- `packages/shared`: Shared Yup schemas, DTOs, constants, and error codes.
- `packages/tsconfig`, `packages/eslint-config`: Shared configurations.

## Consequences

- Fast cross-package linking with strict dependency boundaries.
- Coordinated changes to validation schemas and error codes across client and server.
- Turborepo caches builds, lints, and test pipelines locally and in CI.
