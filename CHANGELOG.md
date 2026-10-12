# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Phase 1 (Authentication)**:
  - Full auth flows: register, login, refresh with token rotation and reuse detection, logout, logout-all, `/me`, active sessions.
  - Email verification and forgot/reset password with secure one-time tokens.
  - Google OAuth 2.0 with PKCE and ID token verification.
  - In-transaction seeding of default options on registration.
  - Web auth pages (Formik + Yup), AuthBootstrap, and proxy/middleware UX guards.
- **Phase 2 & 3 (Pipeline & Applications)**:
  - Options module: CRUD, move (fractional indexing), archive with reassignment guard (`OPTION_IN_USE`), restore, reset defaults.
  - Settings -> Pipeline & fields page (`/settings/pipeline-fields`).
  - Companies module (minimal): create private company, search visible companies (owned + global).
  - Applications module:
    - Repository on `BaseRepository` with `userId` scoping.
    - Command service: optimistic locking with `version`, duplicate warning detection within 90 days, milestone transitions (`appliedAt`, `firstResponseAt`, `firstInterviewAt`, `offerAt`, `closedAt`), HTML sanitization, in-transaction activity history diff logging.
    - Query service: cursor pagination table listing with filters and sorting, Kanban board view with lane totals and per-lane load more.
  - Comments module (notes, follow-ups with due/done toggling, interview notes) and Activity feed.
  - Frontend components:
    - `InlineEditField` molecule with debounced/queue save and conflict detection banner.
    - `ApplicationsTable` with column sorting and infinite scroll.
    - `PipelineBoard` with `@dnd-kit`: mouse/touch/keyboard sensors, optimistic drag-and-drop with rollback, mobile support.
    - `ApplicationPanel` organism: Create and View/edit modes with two-column layout, TipTap rich text support, and bottom Activity/Comments timeline.
  - Web pages: `/applications` and `/pipeline`.
