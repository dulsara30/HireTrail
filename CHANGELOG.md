# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 0 foundation: pnpm + Turborepo monorepo setup (`apps/web`, `apps/api`, `packages/shared`).
- Shared package with common schemas, limits, default options, and error code catalogue.
- Express 5 API skeleton with strict middleware chain (`requestId`, `httpLogger`, `helmet`, `cors`, `express.json`, `cookieParser`, `notFound`, `errorHandler`).
- Pino logger with sensitive header, cookie, and credential redaction.
- Yup environment configuration validation and frozen config object.
- Cached Mongoose database connection with `softDelete` and `toJSON` plugins.
- `GET /health` endpoint with active database ping and status check.
- Core architecture primitives: `BaseRepository`, `BaseController`, AppError hierarchy, value objects (`Money`, `Cursor`, `FractionalOrder`), and security helpers (`CsvEscaper`, `RedirectGuard`, `HtmlSanitizer`).
- Next.js App Router application with exact design tokens, typography scale, and 4-point spacing grid.
- Atomic components: `Button`, `Input`, `Badge`, `Chip`, `Spinner`, `Skeleton`, `FormField`, `EmptyState`.
- Frontend API client skeleton with Axios instance, error transformer, TanStack Query, and `useHealth` hook.
- GitHub Actions CI/CD workflow, Vercel configuration files, and Architecture Decision Records (ADR 0001–0005).
