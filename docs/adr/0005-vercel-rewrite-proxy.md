# ADR 0005: Vercel Deployments with Next.js Rewrite Proxy

## Status

Accepted

## Context

Deploying `apps/web` and `apps/api` on different domains or subdomains creates cross-site cookie boundaries, causing browsers to block third-party cookies by default and opening potential CSRF exposure.

## Decision

- Deploy both `apps/web` and `apps/api` to separate Vercel projects from the single monorepo.
- `apps/web/next.config.ts` rewrites `/api/v1/:path*` to the backend origin `${process.env.API_ORIGIN}/api/v1/:path*`.
- The browser exclusively communicates with the web origin, making the session cookie same-site and first-party.
- `apps/api` default-exports the Express app in `src/index.ts` to run as a Vercel Serverless Function without server daemon overhead.

## Consequences

- Same-site cookies prevent third-party cookie blocking.
- Unified security headers and CORS configuration.
- Local dev replicates production routing via Next.js rewrites.
