# 03: Data Model (MongoDB + Mongoose)

## 1. Rules that apply to every collection

1. **Timestamps:** `createdAt`, `updatedAt` (Mongoose `timestamps: true`), stored as UTC `Date`.
2. **Soft delete:** user-facing collections have `deletedAt: Date | null`. A shared `softDelete` plugin adds `deletedAt: null` to every `find*` and `count*`, and for `aggregate` merges it into the existing first `$match` (or adds a `$match` only if the first stage isn't one; a `$text` match must stay the first stage) unless the query opts in with `.setOptions({ withDeleted: true })`. Nobody has to remember the filter.
3. **Ownership:** user-owned documents have `userId` (indexed). Repositories take `userId` as the first argument of every method and always include it in the filter. Reading by `_id` alone is not allowed in user-owned repositories.
4. **Optimistic concurrency:** documents that users edit (applications, comments, options, companies) have a `version` number (`versionKey: 'version'` on all four schemas). Clients send the `version` they edited. Repositories update with `findOneAndUpdate({ _id, userId, version }, { $set: changes, $inc: { version: 1 } }, { new: true })`. If nothing matched, the repository checks whether the document exists for this user: yes → `ConflictError` with `currentVersion`, no → `NotFoundError`. (`optimisticConcurrency` and Mongoose `VersionError` only apply to `doc.save()`, which we don't use for user edits.)
5. **Safe filters:** `mongoose.set('sanitizeFilter', true)` and `strictQuery: true`, so user input can't inject `$` operators. Because sanitizeFilter also wraps operators our own code adds, repositories build operators with `mongoose.trusted({ $in: ids })`, `mongoose.trusted({ $gte: from })`, etc. sanitizeFilter doesn't apply to `aggregate()`, so pipelines are built only from Yup-validated, typed values. All input is validated by Yup first.
6. **IDs in the API:** `id` (string). `_id` and `__v` never leave the API (the `toJSON` plugin and mappers handle this).
7. **Money:** integers in minor units + ISO 4217 currency code. Never floats.
8. **Ordering:** board order and option order use fractional-index strings (`fractional-indexing` package), so moving one item writes one document.
9. **Size caps:** arrays have explicit max lengths in both Yup and Mongoose validators.
10. **Soft delete frees unique keys.** When a private company is soft-deleted, its `normalizedName` and `slug` get the suffix `#deleted-<id>` so the name can be reused; restoring reverses this, or fails with `DUPLICATE` if the name was taken meanwhile. Users are never soft-deleted: account deletion is a permanent delete of the user and all their data in one transaction.

## 2. Collections

### users

| Field           | Type                                                                                    | Notes                                                                             |
| --------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| email           | string, lowercase, trimmed                                                              | unique                                                                            |
| passwordHash    | string \| null                                                                          | argon2id. Null for Google-only accounts                                           |
| google          | `{ sub, email, linkedAt } \| null`                                                      | `google.sub` unique sparse                                                        |
| name            | string (1..80)                                                                          |                                                                                   |
| avatarUrl       | string \| null                                                                          | from Google, or initials in UI                                                    |
| role            | `USER` \| `ADMIN`                                                                       | default USER                                                                      |
| plan            | `FREE` \| `PRO`                                                                         | default FREE                                                                      |
| planMeta        | `{ source: 'MANUAL' \| 'STRIPE', updatedAt, updatedBy, reason }`                        |                                                                                   |
| status          | `ACTIVE` \| `SUSPENDED`                                                                 |                                                                                   |
| emailVerifiedAt | Date \| null                                                                            | Google sign-ups are verified on creation (Google's `email_verified` must be true) |
| security        | `{ passwordChangedAt }`                                                                 | failed-login counters live in the rate-limit store, keyed by IP + email           |
| preferences     | `{ timezone: 'Asia/Colombo', currency: 'LKR', collapsedLanes: [statusId], panelWidth }` |                                                                                   |
| lastLoginAt     | Date                                                                                    |                                                                                   |

Indexes: `{ email: 1 }` unique, `{ 'google.sub': 1 }` unique sparse, `{ role: 1 }`, `{ plan: 1 }`.

### sessions (refresh tokens)

| Field             | Type                                                                                         | Notes                                                       |
| ----------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| userId            | ObjectId                                                                                     |                                                             |
| familyId          | string (UUID)                                                                                | all rotations of one login share a family                   |
| tokenHash         | string                                                                                       | SHA-256 of the refresh token. The raw token is never stored |
| expiresAt         | Date                                                                                         | 30 days from login (absolute), not extended by rotation     |
| rotatedAt         | Date \| null                                                                                 | set when this token was exchanged for a new one             |
| revokedAt         | Date \| null                                                                                 |                                                             |
| revokedReason     | `LOGOUT` \| `LOGOUT_ALL` \| `REUSE_DETECTED` \| `PASSWORD_CHANGED` \| `SUSPENDED` \| `ADMIN` |                                                             |
| userAgent, ipHash | string                                                                                       | for the "active sessions" list (IP is hashed)               |
| lastUsedAt        | Date                                                                                         |                                                             |

Indexes: `{ tokenHash: 1 }` unique, `{ userId: 1, revokedAt: 1 }`, `{ expiresAt: 1 }` TTL (`expireAfterSeconds: 0`).

### oneTimeTokens (email verification, password reset)

`{ userId, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD', tokenHash, expiresAt, usedAt }`. Unique on `tokenHash`, TTL on `expiresAt`. Creating a new token for the same purpose invalidates older unused ones.

### options (every customisable dropdown)

| Field      | Type                                                                                                  | Notes                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| userId     | ObjectId                                                                                              |                                                                                                        |
| type       | `STATUS` \| `PRIORITY` \| `LABEL` \| `WORK_MODE` \| `JOB_TYPE` \| `LEVEL` \| `SOURCE` \| `CV_VERSION` |                                                                                                        |
| key        | string slug                                                                                           | stable identifier, created from the label at creation and never changed. Used by AI mapping and import |
| label      | string (1..40)                                                                                        |                                                                                                        |
| color      | token name, e.g. `accent`, `success`, `danger`, `neutral`, `info`, `purple`                           | only palette tokens allowed, never raw hex                                                             |
| order      | fractional-index string                                                                               |                                                                                                        |
| isDefault  | boolean                                                                                               | seeded by the system                                                                                   |
| archivedAt | Date \| null                                                                                          | archived options stay for history but can't be picked                                                  |
| meta       | object, by type                                                                                       | STATUS: `{ category, closedReason? }`. PRIORITY: `{ rank }`                                            |
| aliases    | string[] (max 10)                                                                                     | extra words for AI and import mapping, e.g. Hybrid → ["hybrid", "partly remote"]                       |

Indexes: `{ userId: 1, type: 1, key: 1 }` unique, `{ userId: 1, type: 1, order: 1 }`.

### companies

| Field                            | Type                                                                                       | Notes                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| ownerId                          | ObjectId \| null                                                                           | null = global (seeded / admin), otherwise private to that user |
| name                             | string                                                                                     |                                                                |
| normalizedName                   | string                                                                                     | lowercase, alphanumeric only. Used for uniqueness and matching |
| slug                             | string                                                                                     |                                                                |
| aliases                          | string[]                                                                                   |                                                                |
| region                           | `LOCAL` \| `FOREIGN`                                                                       |                                                                |
| country, city                    | string                                                                                     |                                                                |
| website, careersUrl, linkedinUrl | string (http/https only)                                                                   |                                                                |
| contactEmail                     | string                                                                                     |                                                                |
| foundedYear                      | string                                                                                     | kept as text because the reports say things like "Pre-2023"    |
| size, industry                   | string                                                                                     |                                                                |
| techStack                        | string[]                                                                                   |                                                                |
| description                      | string (max 2,000)                                                                         |                                                                |
| hiringModel                      | string                                                                                     | e.g. "Remote via EOR" for foreign companies                    |
| reportRatings                    | `{ culture, workExperience, salary, learning, overall, scale, appeal }` (1..10)            | from the research reports, labelled unverified in UI           |
| tier                             | `A` \| `B` \| null                                                                         | priority tier from your job-scout list                         |
| source                           | `{ type: 'SEED' \| 'USER' \| 'AI_LOOKUP' \| 'ADMIN', ref, importedAt }`                    |                                                                |
| conflicts                        | object                                                                                     | values the two reports disagreed on, shown to admins           |
| verification                     | `{ status: 'UNVERIFIED' \| 'VERIFIED' \| 'FAILED', score, checkedAt, lastVerificationId }` | summary of the latest verification                             |
| createdBy                        | ObjectId \| null                                                                           |                                                                |
| deletedAt                        | Date \| null                                                                               |                                                                |

Indexes: `{ ownerId: 1, normalizedName: 1 }` unique, `{ ownerId: 1, slug: 1 }` unique, text index on `name`, `aliases` (weights: name 10, aliases 5), `{ region: 1, tier: 1 }`.

Visibility rule (in the repository): a user sees `ownerId: null` OR `ownerId: userId`.

### userCompanyNotes (a user's own view of any company)

`{ userId, companyId, myRating (1..5), notesHtml (legacy), updatedAt }`, unique on `{ userId, companyId }`. This keeps personal opinions out of shared global company documents. It holds the user's single star rating. The admin panel shows the average of `myRating` per company through an aggregation that returns only the mean and the count, never user ids. `notesHtml` is the old single note: the first time the user lists their notes it is copied into `companyNotes` and cleared (an atomic find-and-update, so it happens once).

### companyNotes (many private notes per user and company)

`{ userId, companyId, bodyHtml (sanitised), editedAt, deletedAt, version, createdAt, updatedAt }`. Index `{ userId, companyId, createdAt: -1 }`. Every query is scoped by `userId`, so another user's note id gives 404. Soft deleted. Included in the account data export and deleted with the account. When two companies are merged, notes move to the company that is kept.

### companyVerifications (history of AI checks)

| Field         | Type                                                                                                              | Notes                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| companyId     | ObjectId                                                                                                          |                                                          |
| requestedBy   | ObjectId                                                                                                          |                                                          |
| model         | string                                                                                                            | exact model ID used                                      |
| fields        | `[{ field, storedValue, foundValue, verdict: 'MATCH' \| 'DIFFERENT' \| 'NOT_FOUND', sources: [{ url, title }] }]` |                                                          |
| companyExists | `YES` \| `NO` \| `UNSURE`                                                                                         |                                                          |
| score         | number 0..100                                                                                                     | computed by our code from the verdicts, not by the model |
| suggestions   | `[{ field, value, sourceUrl }]`                                                                                   | admins (global) or owners (private) can apply them       |
| createdAt     | Date                                                                                                              |                                                          |

Index: `{ companyId: 1, createdAt: -1 }`.

### applications

| Field                                                             | Type                                                                                            | Notes                                                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| userId                                                            | ObjectId                                                                                        |                                                                                                                                      |
| companyId                                                         | ObjectId                                                                                        |                                                                                                                                      |
| companyName                                                       | string                                                                                          | snapshot for fast display and search                                                                                                 |
| roleTitle                                                         | string (2..150)                                                                                 |                                                                                                                                      |
| statusId                                                          | ObjectId (option STATUS)                                                                        |                                                                                                                                      |
| statusCategory                                                    | string                                                                                          | copied from the status option on every move, for fast dashboard queries                                                              |
| statusChangedAt                                                   | Date                                                                                            |                                                                                                                                      |
| boardOrder                                                        | fractional-index string                                                                         | order within the lane                                                                                                                |
| priorityId, workModeId, jobTypeId, levelId, sourceId, cvVersionId | ObjectId \| null                                                                                | options of the matching type                                                                                                         |
| priorityRank                                                      | number \| null                                                                                  | copied from the priority option's `meta.rank` (and refreshed when ranks change) so sorting by priority works                         |
| labelIds                                                          | ObjectId[] (max 20)                                                                             |                                                                                                                                      |
| location                                                          | string                                                                                          |                                                                                                                                      |
| coverLetter                                                       | boolean                                                                                         | default false; history diff shows Yes / No                                                                                           |
| contactEmail                                                      | string (email, lowercased)                                                                      | optional                                                                                                                             |
| resumeUrl                                                         | string (Google Drive / Docs link)                                                               | optional, validated by host                                                                                                          |
| resumeName                                                        | string (max 200)                                                                                | optional, file name picked with the Google Drive picker; cleared when the link is typed by hand                                      |
| jobUrl                                                            | string                                                                                          |                                                                                                                                      |
| jobDescription                                                    | `{ html, text }`                                                                                | html sanitised on the server; text derived from html for search and AI                                                               |
| salary                                                            | `{ min, max, currency, period, expected }`                                                      | integers in minor units                                                                                                              |
| dates                                                             | `{ savedAt, appliedAt, deadlineAt, followUpAt, nextInterviewAt }`                               |                                                                                                                                      |
| milestones                                                        | `{ appliedAt, firstResponseAt, firstInterviewAt, offerAt, acceptedAt, closedAt, closedReason }` | maintained by the service, see §5                                                                                                    |
| contacts                                                          | `[{ name, role, email, phone, linkedinUrl }]` (max 10)                                          |                                                                                                                                      |
| notesHtml                                                         | string                                                                                          | sanitised                                                                                                                            |
| ai                                                                | `{ aiUsageId, aiFilledFields: string[] }`                                                       | `aiUsageId` points to the `aiUsage` row of the autofill call; `aiFilledFields` lists fields that came from AI (sparkle until edited) |
| lastActivityAt                                                    | Date                                                                                            | updated on any change or comment, used for "stale"                                                                                   |
| archivedAt                                                        | Date \| null                                                                                    |                                                                                                                                      |
| deletedAt                                                         | Date \| null                                                                                    |                                                                                                                                      |
| version                                                           | number                                                                                          | optimistic concurrency key (see §1.4)                                                                                                |

Indexes:

- `{ userId: 1, statusId: 1, boardOrder: 1 }` (board lanes)
- `{ userId: 1, updatedAt: -1 }` (table default sort)
- `{ userId: 1, 'dates.followUpAt': 1 }`
- `{ userId: 1, 'milestones.appliedAt': -1 }` (dashboard)
- `{ userId: 1, companyId: 1 }`
- text index `{ roleTitle: 'text', companyName: 'text' }` (Mongo allows one text index per collection; for better search later, Atlas Search)

### comments

`{ userId, applicationId, kind: 'NOTE' | 'FOLLOW_UP' | 'INTERVIEW', bodyHtml, dueAt, doneAt, editedAt, deletedAt, version }`. Index `{ applicationId: 1, createdAt: -1 }`, `{ userId: 1, kind: 1, doneAt: 1, dueAt: 1 }` (follow-ups due).

### activities (history, append-only)

| Field      | Type                                                                                                                                                                             | Notes                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| userId     | ObjectId                                                                                                                                                                         | owner of the application (also the actor today; kept separate for future sharing)                           |
| actorId    | ObjectId                                                                                                                                                                         |                                                                                                             |
| actorType  | `USER` \| `SYSTEM` \| `AI`                                                                                                                                                       |                                                                                                             |
| entityType | `APPLICATION` \| `COMPANY`                                                                                                                                                       |                                                                                                             |
| entityId   | ObjectId                                                                                                                                                                         |                                                                                                             |
| type       | `CREATED` \| `UPDATED` \| `STATUS_CHANGED` \| `ARCHIVED` \| `RESTORED` \| `DELETED` \| `COMMENT_ADDED` \| `COMMENT_EDITED` \| `COMMENT_DELETED` \| `AI_AUTOFILLED` \| `IMPORTED` |                                                                                                             |
| changes    | `[{ field, from, to }]`                                                                                                                                                          | option IDs are stored together with their label at that time, so history reads correctly even after renames |
| summary    | string                                                                                                                                                                           | short human text, e.g. "Moved from Applied to Interview"                                                    |
| createdAt  | Date                                                                                                                                                                             |                                                                                                             |

Indexes: `{ entityId: 1, createdAt: -1 }`, `{ userId: 1, createdAt: -1 }` (recent activity feed). The repository has no update or delete methods. History is written in the same transaction as the change it describes.

### aiUsage (quotas and cost tracking)

`{ userId, feature: 'AUTOFILL' | 'COMPANY_VERIFY' | 'COMPANY_LOOKUP' | 'INSIGHTS', model, inputTokens, outputTokens, latencyMs, outcome: 'OK' | 'BLOCKED' | 'ERROR', day: 'YYYY-MM-DD', createdAt }`. Index `{ userId: 1, feature: 1, day: 1 }`. TTL 180 days.

### aiLookupCache

`{ normalizedName, result, sources, model, createdAt }` with TTL 7 days, so two users looking up the same unknown company don't pay twice.

### imports (CSV import staging)

`{ userId, fileName, rows: object[] (max 1,000), errors[], suggestedMapping, status: 'PREVIEWED' | 'COMMITTED', expiresAt }`. TTL on `expiresAt` (1 hour after preview). Commit reads the rows from here, so preview and commit can run in different serverless invocations.

### aiInsights (weekly dashboard insights)

`{ userId, isoWeek: '2026-W41', insights: [{ title, detail, basedOn[] }], model, createdAt, refreshedAt }`. Unique `{ userId: 1, isoWeek: 1 }`.

### auditLogs (admin actions, append-only)

`{ actorId (null for scripts), actorType: 'USER' | 'SYSTEM', action: 'USER_PLAN_CHANGED' | 'USER_SUSPENDED' | 'USER_REACTIVATED' | 'COMPANY_CREATED' | 'COMPANY_UPDATED' | 'COMPANY_MERGED' | 'COMPANIES_IMPORTED' | 'VERIFICATION_APPLIED', targetType, targetId, before, after, reason, ipHash, createdAt }`. Index `{ createdAt: -1 }`, `{ targetId: 1 }`.

### rateLimits

Owned by the rate-limit store library (shared counters across serverless instances). TTL index on the expiry field.

## 3. Transactions

Use `withTransaction(async (session) => …)` from `core/db` when one user action writes more than one document:

| Action                      | Documents written together                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| Create application          | application + activity (+ private company if new)                                 |
| Update / move application   | application + activity                                                            |
| Add / edit / delete comment | comment + activity + `application.lastActivityAt`                                 |
| Delete option in use        | reassign applications + archive option + activities                               |
| Admin changes plan          | user + audit log (no session revoke needed; plan is read from the DB per request) |
| Admin suspends user         | user + audit log + revoke all sessions                                            |
| Sign-up                     | user + default options                                                            |

Side effects outside the DB (emails, AI calls) run **after** the transaction commits, never inside it. AI calls that need DB data read it first, call the model outside any transaction, then write the result in a short transaction.

## 4. History diff

`application.events.ts` compares the document before and after an update, field by field, and produces `changes[]`:

- Plain fields: `{ field: 'roleTitle', from: 'Intern SE', to: 'Associate SE' }`.
- Option fields: `{ field: 'priority', from: { id, label: 'High' }, to: { id, label: 'Dream' } }`.
- Rich text fields: record only `{ field: 'notes', changed: true }` with character counts, not the full text (keeps history small and private).
- Status moves produce a `STATUS_CHANGED` activity instead of `UPDATED`.
- No activity is written when nothing changed.

## 5. Milestones (dashboard truth)

Updated by `ApplicationService.applyStatusChange()` whenever the status category changes:

| New category                                                            | Sets (only if not already set)                                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APPLIED, or any later category when `appliedAt` is still empty          | `milestones.appliedAt` (= `dates.appliedAt` if the user entered one, else now), so applications moved straight to Interview or Offer still count in rates |
| IN_PROGRESS, INTERVIEW, OFFER, ACCEPTED, or CLOSED with reason REJECTED | `firstResponseAt`                                                                                                                                         |
| INTERVIEW                                                               | `firstInterviewAt`                                                                                                                                        |
| OFFER                                                                   | `offerAt`                                                                                                                                                 |
| ACCEPTED                                                                | `acceptedAt`, `closedAt`                                                                                                                                  |
| CLOSED                                                                  | `closedAt`, `closedReason`                                                                                                                                |

Moving an application back (for example Rejected → Interview because the user made a mistake) clears `closedAt` and `closedReason` but keeps earlier milestones. Milestones are never derived from labels, so renaming statuses never breaks the dashboard.

## 6. Seed data

- `seed/companies.seed.json`: 173 companies (41 tier A, 10 foreign) extracted from the two research PDFs. Every record has `verification.status: 'UNVERIFIED'`, and 51 records list values where the two reports disagreed in `conflicts`.
- Import script `apps/api/scripts/seed-companies.ts`: idempotent upsert on `normalizedName` with `ownerId: null`. Re-running it never duplicates and never overwrites fields an admin has edited since (`source.type === 'ADMIN'` wins).
- Default options are created per user at sign-up from `packages/shared/constants/default-options.ts`.
