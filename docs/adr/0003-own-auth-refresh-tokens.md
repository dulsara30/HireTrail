# ADR 0003: Custom Auth with In-Memory Access Token and Rotating Refresh Token

## Status

Accepted

## Context

Third-party auth providers introduce vendor lock-in, latency, and subscription costs. HireTrail needs full control over user identity, plan entitlements, and sessions without storing raw credentials or vulnerable tokens.

## Decision

Implement a custom authentication service:

- Password hashing with argon2id.
- Google OAuth 2.0 with server code exchange, PKCE, and token audience verification.
- Short-lived (15 minutes) access JWT stored strictly in browser memory.
- Long-lived (30 days) rotating refresh token stored in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
- SHA-256 hashed refresh token storage in the `sessions` collection with automatic reuse detection and revocation.

## Consequences

- Protection against XSS stealing persistent tokens.
- Immediate invalidation on detected token replay.
- First-party cookie support enabled via Next.js reverse proxy.
