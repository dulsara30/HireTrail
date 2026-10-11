# 04: REST API (`/api/v1`)

Conventions:

- JSON only. Envelope and errors as in `02-architecture.md` §3.5–3.6.
- Auth: `Authorization: Bearer <accessToken>` on everything except the public auth routes and `/health`.
- Lists use cursor pagination: `?limit=25&cursor=<opaque>`. `limit` max is **100** (validated). Sorting only by whitelisted fields from the shared schema.
- Partial updates use `PATCH` with only changed fields + `version`. `null` means "clear this field"; a missing key means "don't change".
- Guard notation below: 🔓 public, 🔒 signed in, ⭐ PRO, ✉️ verified email, 🛡️ ADMIN.

## Auth

| Method | Path                    | Guard                  | Body / query                                | Result                                                                 |
| ------ | ----------------------- | ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| POST   | `/auth/register`        | 🔓 + strict rate limit | `{ email, password, name }`                 | 201 `{ accessToken, user }` + refresh cookie. Sends verification email |
| POST   | `/auth/login`           | 🔓 + strict rate limit | `{ email, password }`                       | 200 `{ accessToken, user }` + cookie                                   |
| POST   | `/auth/refresh`         | cookie                 | none                                        | 200 `{ accessToken, user }` + rotated cookie                           |
| POST   | `/auth/logout`          | cookie                 | none                                        | 204, revokes this session                                              |
| POST   | `/auth/logout-all`      | 🔒                     | none                                        | 204, revokes all sessions                                              |
| GET    | `/auth/google/start`    | 🔓                     | `?redirect=/pipeline` (relative paths only) | 302 to Google with state + PKCE                                        |
| GET    | `/auth/google/callback` | 🔓                     | Google's `code`, `state`                    | 302 to web app; sets cookie                                            |
| POST   | `/auth/google/link`     | 🔒                     | starts link flow for signed-in user         | 200 `{ url }`                                                          |
| POST   | `/auth/email/verify`    | 🔓                     | `{ token }`                                 | 204                                                                    |
| POST   | `/auth/email/resend`    | 🔒 + rate limit        | none                                        | 204                                                                    |
| POST   | `/auth/password/forgot` | 🔓 + strict rate limit | `{ email }`                                 | 204 always (never reveals if the email exists)                         |
| POST   | `/auth/password/reset`  | 🔓                     | `{ token, newPassword }`                    | 204, revokes all sessions                                              |

## Me

| Method | Path               | Guard | Notes                                                                                                                                                       |
| ------ | ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/me`              | 🔒    | profile, role, plan, preferences, `aiQuota` remaining today                                                                                                 |
| PATCH  | `/me`              | 🔒    | name, preferences                                                                                                                                           |
| PATCH  | `/me/password`     | 🔒    | `{ currentPassword, newPassword }`; revokes other sessions                                                                                                  |
| GET    | `/me/sessions`     | 🔒    | active sessions                                                                                                                                             |
| DELETE | `/me/sessions/:id` | 🔒    | revoke one                                                                                                                                                  |
| GET    | `/me/export`       | 🔒    | ZIP with JSON of all the user's data + applications CSV. Rate-limited to 3 per day                                                                          |
| DELETE | `/me`              | 🔒    | `{ password }` or `{ confirmText: 'DELETE' }` for Google-only accounts; permanently deletes the user and all data in one transaction, revokes sessions, 204 |

## Options

| Method | Path                      | Guard | Notes                                                                                 |
| ------ | ------------------------- | ----- | ------------------------------------------------------------------------------------- |
| GET    | `/options`                | 🔒    | `?type=STATUS` or all types grouped. Archived excluded unless `?includeArchived=true` |
| POST   | `/options`                | 🔒    | `{ type, label, color, meta? }`                                                       |
| PATCH  | `/options/:id`            | 🔒    | `{ label?, color?, meta?, aliases?, version }`                                        |
| POST   | `/options/:id/move`       | 🔒    | `{ beforeId?, afterId? }` → new fractional order                                      |
| POST   | `/options/:id/archive`    | 🔒    | `{ reassignToId? }` required if in use. 409 `OPTION_IN_USE` if missing                |
| POST   | `/options/:id/restore`    | 🔒    |                                                                                       |
| POST   | `/options/reset-defaults` | 🔒    | `{ type }` adds missing defaults only                                                 |

## Applications

| Method | Path                                     | Guard | Notes                                                                                                                                                                                                              |
| ------ | ---------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/applications`                          | 🔒    | table: `q, statusIds[], priorityIds[], labelIds[], workModeIds[], sourceIds[], companyId, appliedFrom, appliedTo, followUpDue, archived, sort (updatedAt\|appliedAt\|companyName\|priority), order, cursor, limit` |
| GET    | `/applications/board`                    | 🔒    | same filters. Returns lanes: `[{ status, total, items[≤50], nextCursor }]`                                                                                                                                         |
| GET    | `/applications/board/lane/:statusId`     | 🔒    | "load more" for one lane                                                                                                                                                                                           |
| POST   | `/applications`                          | 🔒    | create. Response includes `possibleDuplicates[]`                                                                                                                                                                   |
| GET    | `/applications/:id`                      | 🔒    | full detail incl. resolved options and company summary                                                                                                                                                             |
| PATCH  | `/applications/:id`                      | 🔒    | partial update with `version`                                                                                                                                                                                      |
| POST   | `/applications/:id/move`                 | 🔒    | `{ statusId, beforeId?, afterId?, version }`                                                                                                                                                                       |
| POST   | `/applications/:id/archive` / `/restore` | 🔒    |                                                                                                                                                                                                                    |
| DELETE | `/applications/:id`                      | 🔒    | soft delete, 204                                                                                                                                                                                                   |
| POST   | `/applications/:id/undo-delete`          | 🔒    | allowed for 10 minutes                                                                                                                                                                                             |
| GET    | `/applications/:id/activities`           | 🔒    | `?type=history\|all&cursor`                                                                                                                                                                                        |
| GET    | `/applications/export`                   | 🔒    | same filters as list. Streams `text/csv` with formula-safe values                                                                                                                                                  |
| POST   | `/applications/import/preview`           | 🔒    | multipart CSV ≤ 1 MB, ≤ 1,000 rows → parsed rows + errors + mapping suggestions                                                                                                                                    |
| POST   | `/applications/import/commit`            | 🔒    | `{ importId, mapping }`                                                                                                                                                                                            |

## Comments

| Method | Path                         | Guard | Notes                                                     |
| ------ | ---------------------------- | ----- | --------------------------------------------------------- |
| GET    | `/applications/:id/comments` | 🔒    |                                                           |
| POST   | `/applications/:id/comments` | 🔒    | `{ kind, bodyHtml, dueAt? }`                              |
| PATCH  | `/comments/:id`              | 🔒    | `{ bodyHtml?, dueAt?, done?, version }` own comments only |
| DELETE | `/comments/:id`              | 🔒    | soft delete                                               |

## Companies

| Method | Path                                      | Guard    | Notes                                                                                                                                                                                       |
| ------ | ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/companies`                              | 🔒       | `q, region, tier, verification, hasApplications, cursor, limit`. Global + own private                                                                                                       |
| GET    | `/companies/:idOrSlug`                    | 🔒       | profile + my notes + my applications summary + latest verification. Slug lookup checks the user's private companies first, then global                                                      |
| POST   | `/companies`                              | 🔒       | creates a private company. 409 `DUPLICATE` with the existing one if the normalized name already exists in what the user can see                                                             |
| PATCH  | `/companies/:id`                          | 🔒       | own private companies only. Global → 403                                                                                                                                                    |
| DELETE | `/companies/:id`                          | 🔒       | own private only, and only if no applications use it                                                                                                                                        |
| PUT    | `/companies/:id/my-notes`                 | 🔒       | `{ myRating, notesHtml }`                                                                                                                                                                   |
| POST   | `/companies/:id/verify`                   | 🔒 ⭐ ✉️ | Synchronous (up to ~60 s). 200 with the verification result. 429 `RATE_LIMITED` with `resetsAt` if this user re-checked it in the last 24 h. 502 `AI_UNAVAILABLE` on Gemini limits/timeouts |
| GET    | `/companies/:id/verifications`            | 🔒       | history (PRO sees details, FREE sees status only)                                                                                                                                           |
| POST   | `/companies/:id/verifications/:vid/apply` | 🔒       | owner of private company applies suggestions; global → admin route                                                                                                                          |
| POST   | `/companies/ai-lookup`                    | 🔒 ⭐ ✉️ | `{ name, hint? }` → AI profile draft with sources and `isAiResult: true` (not saved)                                                                                                        |

## AI

| Method | Path           | Guard    | Notes                                                                                                                                                           |
| ------ | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/ai/autofill` | 🔒 ⭐ ✉️ | `{ text? , url? }` (one required, text ≤ 30,000 chars). Synchronous. 200 with the draft the side panel shows in AI preview mode (see `05-ai.md`). Nothing saved |
| GET    | `/ai/usage`    | 🔒       | today's usage and limits per feature                                                                                                                            |

## Dashboard

| Method | Path                          | Guard    | Notes                                                           |
| ------ | ----------------------------- | -------- | --------------------------------------------------------------- |
| GET    | `/dashboard/summary`          | 🔒       | `?range=7d\|30d\|90d\|ytd\|all` → KPIs + previous-period values |
| GET    | `/dashboard/charts`           | 🔒       | funnel, weekly, by status, by source, upcoming                  |
| GET    | `/dashboard/activity`         | 🔒       | recent activity feed, cursor                                    |
| GET    | `/dashboard/insights`         | 🔒 ⭐    | latest stored insights                                          |
| POST   | `/dashboard/insights/refresh` | 🔒 ⭐ ✉️ | Synchronous, 200 with new insights; max once per day            |

## Admin (🛡️ on all)

| Method | Path                                              | Notes                                                                   |
| ------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/admin/users`                                    | `q, plan, role, status, cursor`                                         |
| GET    | `/admin/users/:id`                                | metadata + counts + AI usage (no content)                               |
| PATCH  | `/admin/users/:id/plan`                           | `{ plan, reason }` → audit log. Takes effect on the user's next request |
| PATCH  | `/admin/users/:id/status`                         | `{ status, reason }` → audit log; suspension revokes all sessions       |
| GET    | `/admin/companies`                                | includes `conflicts` and verification info                              |
| POST   | `/admin/companies` / PATCH `/admin/companies/:id` | global companies                                                        |
| POST   | `/admin/companies/import`                         | seed JSON upload, dry-run first: `?dryRun=true`                         |
| POST   | `/admin/companies/:id/merge`                      | `{ intoId }` moves applications and aliases                             |
| POST   | `/admin/companies/:id/verifications/:vid/apply`   | apply suggestions to a global company                                   |
| GET    | `/admin/audit-logs`                               | cursor                                                                  |
| GET    | `/admin/ai-usage`                                 | daily totals                                                            |

## System

| Method | Path      | Guard | Notes                                                      |
| ------ | --------- | ----- | ---------------------------------------------------------- |
| GET    | `/health` | 🔓    | `{ status, db: 'up'\|'down', version }`. 503 if DB is down |

## Error codes (in `packages/shared/errors`)

| Code                           | HTTP | When                                                              |
| ------------------------------ | ---- | ----------------------------------------------------------------- |
| `VALIDATION_FAILED`            | 400  | Yup or Mongoose validation. `details: [{ path, message }]`        |
| `INVALID_JSON`, `INVALID_ID`   | 400  |                                                                   |
| `UNAUTHENTICATED`              | 401  | no or bad token                                                   |
| `TOKEN_EXPIRED`                | 401  | access token expired → client refreshes                           |
| `INVALID_CREDENTIALS`          | 401  | wrong email or password (same message for both)                   |
| `SESSION_REVOKED`              | 401  | refresh token revoked or reused                                   |
| `FORBIDDEN`                    | 403  | role check failed                                                 |
| `PLAN_REQUIRED`                | 403  | PRO feature on FREE plan, `details.requiredPlan`                  |
| `EMAIL_NOT_VERIFIED`           | 403  |                                                                   |
| `NOT_FOUND`, `ROUTE_NOT_FOUND` | 404  | also used for other users' resources                              |
| `CONFLICT`                     | 409  | version mismatch, `details.currentVersion`                        |
| `DUPLICATE`                    | 409  | unique conflict, `details.existingId`                             |
| `OPTION_IN_USE`                | 409  | archive without reassign                                          |
| `LIMIT_REACHED`                | 409  | per-user caps (applications, options, comments)                   |
| `RATE_LIMITED`                 | 429  | `Retry-After` header                                              |
| `AI_QUOTA_EXCEEDED`            | 429  | `details.resetsAt`                                                |
| `SOURCE_UNREACHABLE`           | 400  | job link couldn't be read; the UI asks the user to paste the text |
| `AI_UNAVAILABLE`               | 502  | Gemini error or timeout                                           |
| `INTERNAL_ERROR`               | 500  | anything unexpected                                               |
