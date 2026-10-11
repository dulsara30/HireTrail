# 06: Security

## 1. Tokens and sessions

| Item             | Design                                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access token     | JWT, HS256 with `JWT_ACCESS_SECRET` (≥ 32 random bytes), **15 minutes**. Claims: `sub` (userId), `sid` (session id), `iat`, `exp`, `iss`, `aud`. No role or plan in the token. Returned in the JSON body and kept **in memory only** on the client (Zustand), never in localStorage                             |
| Refresh token    | 256-bit random string (not a JWT). Cookie `ht_rt`: `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`. Stored only as a SHA-256 hash in `sessions`                                                                                                                                                             |
| Rotation         | Every `/auth/refresh` issues a new refresh token and marks the old one `rotatedAt`. Absolute lifetime 30 days from login, not extended                                                                                                                                                                          |
| Reuse detection  | If a token that was already rotated is used again, revoke the whole family (`REUSE_DETECTED`) and return 401 `SESSION_REVOKED`. A short grace window (10 s) allows two tabs refreshing at the same moment                                                                                                       |
| Signed-in hint   | Cookie `ht_signed_in=1` (`Secure; SameSite=Lax; Path=/`, deliberately **not** HttpOnly because it holds no secret), same lifetime. The Next.js proxy uses it to redirect, and client code uses it to decide whether to call `/auth/refresh` on load. Never used for auth                                        |
| Revocation       | Logout, logout-all, password change/reset and suspension revoke sessions. Plan and role changes don't need to, because they're read from the DB on every request. Access tokens die within 15 minutes; `authenticate` also checks the session `sid` is not revoked (one indexed lookup, cached for the request) |
| Per-request user | `authenticate` loads the user from the DB on every request. Role, plan, status and verified email are read from that fresh document, never from the token. Suspended users get 401                                                                                                                              |

Client refresh logic (`lib/api-client.ts`): on 401 `TOKEN_EXPIRED`, pause other requests, call `/auth/refresh` once (single-flight), replay the queued requests with the new token. If refresh fails, clear the auth store and go to `/login?next=…`. Never swallow a 401 into an empty success.

On app load, the web app calls `/auth/refresh` to get an access token if `ht_signed_in` exists.

## 2. Passwords and login

- Hash: argon2id (`argon2` package), memory 19 MiB, iterations 2, parallelism 1 (OWASP baseline). Rehash on login if parameters change.
- Login error is always `INVALID_CREDENTIALS`, whether the email exists or not. Run a dummy hash when the user doesn't exist so timing doesn't leak it.
- Lockout: failed logins are counted per **IP + email** in the rate-limit store, whether or not the email exists. After 5 failures in 15 minutes that pair gets 429 `RATE_LIMITED` with `Retry-After` (15 minutes, doubling up to 24 hours). Because unknown emails are throttled the same way, the response never reveals whether an account exists, and an attacker on another IP can't lock the real user out. Successful login resets the counter.
- Registration with an email that already exists returns 409 `DUPLICATE`. This reveals that the email is registered; it's an accepted trade-off for a simple sign-up flow, limited by the strict register rate limit. (Stronger option later: always answer "check your email" and email the existing owner instead.)
- Password change requires the current password. Password reset requires the emailed token, which is single-use, expires in 30 minutes and is stored hashed. After reset, all sessions are revoked.
- Email verification token: same pattern, valid 24 hours.

## 3. Google sign-in

Server-side authorization-code flow with PKCE:

1. `GET /auth/google/start`: create `state` (random) and PKCE `code_verifier`; store them with the requested relative redirect in a short-lived signed, HttpOnly cookie (5 min); redirect to Google with `scope=openid email profile`.
2. `GET /auth/google/callback`: check `state` matches the cookie, exchange `code` with `code_verifier` and the client secret (`google-auth-library`), then **verify the ID token**: signature, `iss` is Google, `aud` equals our client ID, not expired, and `email_verified === true`.
3. Identify the user by `google.sub` (not by email). If no user has that `sub`:
   - no account with that email → create one (emailVerifiedAt = now, no password);
   - an account with that email exists → do **not** link automatically. Redirect to login with a message to sign in with the password and link Google from Settings.
4. Create the session, set cookies, redirect to the stored relative path (only paths starting with `/`, never full URLs).

Linking Google to an existing signed-in account (`POST /auth/google/link`): the API creates the same signed state cookie but with `{ intent: 'LINK', userId, sessionId }`. In the callback, intent LINK requires that the session is still active and belongs to that `userId`, then sets `google.sub` on that user. If the `sub` is already linked to any other user, reject with `DUPLICATE` and link nothing.

Security note: OAuth flows must never trust the email sent by the browser or omit checking the token's audience, which could allow account takeover. Here the identity comes only from the verified ID token's `sub`.

## 4. Authorization

| Guard                  | Rule                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `authenticate`         | valid access token + active session + active user                          |
| `requireRole('ADMIN')` | `req.user.role === 'ADMIN'` (fresh from DB)                                |
| `requirePlan('PRO')`   | `req.user.plan === 'PRO'`, else 403 `PLAN_REQUIRED`                        |
| `requireVerifiedEmail` | `emailVerifiedAt` set, else 403 `EMAIL_NOT_VERIFIED`                       |
| Ownership              | repositories always filter by `userId`; another user's ID returns 404      |
| Global companies       | users can read; only admins can write                                      |
| Admin privacy          | admin routes return account metadata and counts, never application content |

Frontend guards (hidden menu items, disabled buttons, the Next.js proxy redirect) are only for UX. Every check above is enforced in the API.

## 5. Rate limiting

Shared store in MongoDB (works across serverless instances), for example `rate-limit-mongo` with `express-rate-limit`. Upstash Redis is an option later if traffic grows.

| Scope                                         | Limit                                           | Key                             |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------- |
| Global API                                    | 300 requests / 5 min                            | IP                              |
| `/auth/login`, `/auth/register`               | 10 / 15 min                                     | IP, plus per-email lockout (§2) |
| `/auth/password/forgot`, `/auth/email/resend` | 5 / hour                                        | IP + email                      |
| `/auth/refresh`                               | 60 / 15 min                                     | IP                              |
| AI endpoints                                  | per-user daily quota (`05-ai.md` §8) + 10 / min | userId                          |
| Writes (POST/PATCH/DELETE)                    | 120 / min                                       | userId                          |

If the rate-limit store is unreachable: auth routes fail closed (429 with `Retry-After: 60`), every other route fails open and logs a warning.

Client IP: requests reach the API through the web app's rewrite, so the IP the API sees depends on which headers Vercel forwards. In phase 1, deploy a preview, log `x-forwarded-for`, `x-real-ip` and `x-vercel-forwarded-for` once, and pick the header that holds the real browser IP. Set `app.set('trust proxy', …)` to match. If no header carries the real IP, rate-limit auth routes by IP **and** by email, and everything else by userId. IP-keyed limits run before authentication (in `app.ts`), so anonymous abuse is counted. userId-keyed limits (AI, writes) run in the route chain right after `authenticate`.

## 6. Input, output and data safety

| Risk                               | Control                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Injection into Mongo queries       | Yup validation with `stripUnknown`; `sanitizeFilter: true`; never pass raw `req.query` into a filter; whitelisted sort fields                                                                                                                                                                                                                                                                                                                                                       |
| XSS through rich text              | TipTap on the client with a limited extension set. Server sanitises every HTML field with `sanitize-html` (allow: p, br, strong, em, u, s, ul, ol, li, a[href with http/https/mailto, rel=noopener noreferrer nofollow, target=_blank], h3, h4, blockquote, code, pre). Max 100 KB per field                                                                                                                                                                                        |
| XSS through AI output              | Rendered as text only                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Clickjacking, sniffing             | `helmet` on the API; Next.js security headers: CSP (self + Google OAuth + API origin), `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`                                                                                                                                                                                                                                                                 |
| CSRF                               | Refresh cookie is `SameSite=Lax`, path-limited, and `/auth/refresh` + `/auth/logout` require a custom header `X-Requested-With: hiretrail` and a matching `Origin`. All other endpoints use the Bearer header, which browsers don't attach automatically                                                                                                                                                                                                                            |
| SSRF (job links, company websites) | `SafeFetcher`: only `http`/`https`; resolve DNS and reject private, loopback, link-local, CGNAT and metadata ranges (IPv4 + IPv6); then **connect to the exact IP that was checked** (custom `lookup` in the HTTP agent, with the original Host/SNI) so DNS rebinding can't switch it; redirects handled manually and re-checked the same way on every hop (max 3); ports 80/443 only; 8 s timeout; 2 MB cap; no cookies or auth headers sent; content type text/html or text/plain |
| Open redirect                      | Post-login and OAuth redirects accept only relative paths that start with a single `/`                                                                                                                                                                                                                                                                                                                                                                                              |
| CSV formula injection              | Export prefixes cells starting with `= + - @`, tab or CR with `'`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| File uploads                       | Only CSV import, ≤ 1 MB. The file itself is never stored; parsed rows are kept in the `imports` collection for 1 hour (TTL) between preview and commit, owned by the user                                                                                                                                                                                                                                                                                                           |
| Mass assignment                    | DTOs list allowed fields; `userId`, `role`, `plan`, `version` bumps, `milestones`, `statusCategory` are never accepted from clients                                                                                                                                                                                                                                                                                                                                                 |
| Enumeration                        | Same responses for unknown email on login and forgot-password; 404 for other users' IDs                                                                                                                                                                                                                                                                                                                                                                                             |
| Secrets                            | Only in Vercel env vars and GitHub secrets. `.env*` gitignored, `.env.example` committed with fake values. Gitleaks in CI                                                                                                                                                                                                                                                                                                                                                           |
| Logs                               | Redaction (see `02-architecture.md` §3.7). No tokens, passwords, cookies, JD text or prompts                                                                                                                                                                                                                                                                                                                                                                                        |
| Dependencies                       | Dependabot weekly, `pnpm audit --prod` in CI (fail on high/critical)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Error leaks                        | Generic message for 500s; details only in logs with requestId                                                                                                                                                                                                                                                                                                                                                                                                                       |

## 7. Privacy

- Users can export all their data (CSV + JSON) and delete their account.
- Admins never see application content.
- IP addresses stored only as salted hashes.
- Data sent to Gemini: job post text the user provided (autofill), public company fields (verification/lookup), aggregated numbers (insights). Nothing else: no notes, comments, contacts, emails or salary expectations. On the Gemini free tier Google may use prompts and responses to improve its products, and the privacy page says so.

## 8. Security tests (must exist)

- Access with another user's application/comment/option/company ID → 404.
- FREE user calls each PRO endpoint → 403 `PLAN_REQUIRED`.
- USER calls each admin endpoint → 403.
- Refresh token reuse → whole family revoked.
- Password reset without a token / with a used token / expired token → rejected.
- Google callback with wrong `state`, wrong `aud`, `email_verified: false` → rejected.
- SafeFetcher rejects `http://169.254.169.254`, `http://localhost`, `http://[::1]`, a domain resolving to `10.0.0.1`, and a redirect to a private IP.
- Rich text with `<script>`, `onerror=`, `javascript:` links → stripped.
- Query `?statusIds[$ne]=x` → 400.
- CSV export cell `=HYPERLINK(...)` → prefixed.
