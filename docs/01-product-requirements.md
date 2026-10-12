# 01: Product Requirements

## 1. Users, roles and plans

| Concept        | Values                | Stored         | Notes                                                                     |
| -------------- | --------------------- | -------------- | ------------------------------------------------------------------------- |
| Role           | `USER`, `ADMIN`       | `users.role`   | ADMIN can open `/admin`. Set directly in the DB for the first admin (you) |
| Plan           | `FREE`, `PRO`         | `users.plan`   | PRO unlocks AI features. Admin can change it. Later Stripe will change it |
| Account status | `ACTIVE`, `SUSPENDED` | `users.status` | Suspended users can't sign in and their sessions are revoked              |

What each plan gets:

| Feature                                                      | FREE                   | PRO               |
| ------------------------------------------------------------ | ---------------------- | ----------------- |
| Pipeline board, table view, side panel, history, comments    | Yes                    | Yes               |
| Custom statuses, labels, priorities and every other dropdown | Yes                    | Yes               |
| Company directory search (seeded + own companies)            | Yes                    | Yes               |
| Dashboard KPIs, charts, recent activity                      | Yes                    | Yes               |
| CSV export, CSV import                                       | Yes                    | Yes               |
| AI autofill from pasted job post or link                     | No                     | Yes (daily quota) |
| AI company data verification and accuracy score              | No (sees "unverified") | Yes (daily quota) |
| AI lookup for companies not in the database                  | No                     | Yes (daily quota) |
| AI dashboard insights                                        | No                     | Yes (weekly)      |

Locked PRO features show a small "PRO" badge and an explanation, never a broken button.

## 2. Authentication

- Sign up and sign in with email + password, or with Google.
- Password rules (shared Yup schema, checked on both sides): 10 to 128 characters, at least one letter and one number, not in a small list of very common passwords, and not equal to the email.
- Google sign-in: if the Google email matches an existing email+password account, the user must sign in with the password once and then link Google from Settings → Security. Never auto-merge accounts by email alone.
- Forgot password: email with a one-time link (token valid 30 minutes, single use). The reset endpoint requires that token.
- Email verification: required before AI features can be used (stops throwaway accounts burning AI quota). Manual features work without it.
- Sessions: "Sign out" ends this device. "Sign out everywhere" in Settings revokes every session.
- Settings → Security shows active sessions (device, approximate location from IP is optional later, last used) and lets the user revoke one.
- Delete account: Settings → Danger zone. The user is offered a data export first, then confirms with their password (or by typing DELETE for Google-only accounts). All their data is permanently deleted in one transaction and all sessions are revoked. No background cleanup job is needed.

## 3. Applications

### 3.1 Fields

| Field           | Type                                                               | Required | Notes                                                                              |
| --------------- | ------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------- |
| Company         | reference to a company, plus a name snapshot                       | Yes      | Pick from directory or type a new name (creates a private company)                 |
| Role title      | text, 2 to 150 chars                                               | Yes      |                                                                                    |
| Status          | option (type STATUS)                                               | Yes      | Defaults to the user's first status (Saved)                                        |
| Priority        | option (PRIORITY)                                                  | No       | Defaults: High, Medium, Low                                                        |
| Labels          | many options (LABEL)                                               | No       | Free tags like "Java", "Referral", "Remote"                                        |
| Work mode       | option (WORK_MODE)                                                 | No       | Onsite, Hybrid, Remote                                                             |
| Job type        | option (JOB_TYPE)                                                  | No       | Internship, Full-time, Contract, Part-time                                         |
| Level           | option (LEVEL)                                                     | No       | Intern, Junior, Mid, Senior                                                        |
| Source          | option (SOURCE)                                                    | No       | LinkedIn, Company website, TopJobs, ITPro, Referral, Email, Other                  |
| CV version      | option (CV_VERSION)                                                | No       | Master, Java-Spring, Frontend-React, Full-Stack                                    |
| Location        | text                                                               | No       |                                                                                    |
| Cover Letter    | boolean (Yes / No)                                                 | No       | Default No. Shown as "Cover Letter" (Yes/No) in the panel, table column and export |
| Job link        | URL (http/https only)                                              | No       |                                                                                    |
| Job description | rich text, one field                                               | No       | Stored exactly as pasted (sanitised HTML + plain text copy). Never rewritten by AI |
| Salary          | min, max, currency, period (MONTH/YEAR/HOUR), and "my expectation" | No       | Stored as integers in minor units (cents) to avoid float errors                    |
| Dates           | saved, applied, deadline, follow-up, next interview                | No       | Stored in UTC, shown in the user's time zone                                       |
| Contacts        | list of name, role, email, phone, LinkedIn                         | No       | Max 10                                                                             |
| Notes           | rich text                                                          | No       |                                                                                    |

### 3.2 Behaviour

- Create: from the "New application" button, from a lane's "+", or from AI autofill.
- Moving status records `statusChangedAt` and updates milestones (see `03-data-model.md` §5) used by the dashboard.
- Archive hides an application from the board but keeps it in reports. Delete is a soft delete. The UI shows a 10-second "Undo" toast; the API accepts undo for 10 minutes (`UNDO_DELETE_WINDOW_MIN` in shared constants). After that it's gone from every view. An admin can't see your applications.
- Duplicate warning: when creating, if an application with the same company and very similar role title (case-insensitive, ignoring punctuation) exists in the last 90 days, show "You may have already applied" with a link. Not blocking.
- Concurrent edits: every update sends the version it was based on. If someone (another tab) changed it first, the API returns `CONFLICT`, and the UI shows "This was updated elsewhere" with a reload button. No silent overwrite.

## 4. Pipeline board (swimlanes)

- One lane per status, in the user's status order. Each lane header shows the status name, its colour and the count of applications in it (the real total, not just loaded cards).
- Cards show: company logo initial or favicon, company name, role title, priority chip, up to 3 labels (+N), work mode icon, applied date ("Applied 5d ago"), follow-up due badge (amber when due today, red when overdue), and the company accuracy badge when it exists.
- Drag a card to another lane to change status, or within a lane to reorder. Optimistic update with rollback and an error toast on failure.
- Keyboard: dnd-kit keyboard sensor so cards can be moved without a mouse. Each card also has a "Move to…" menu, which is the main method on phones.
- Filters above the board: search (company or role), priority, labels, work mode, source, "follow-up due", "show archived". Filters are kept in the URL so a view can be bookmarked.
- Lanes load 50 cards at first with "Load more". Closed lanes (Rejected, Withdrawn, Ghosted) can be collapsed, and the choice is remembered per user.
- Table view (`/applications`): the same data as a sortable, paginated table with column picker, for users who prefer lists.

## 5. The application side panel (create, AI preview, view and edit in one place)

One side panel does everything. Full layout and behaviour: `07-frontend-and-design.md` §5.

- **Create:** "New application" (or a lane's "+") opens the panel empty. Nothing is saved until **Save**.
- **AI preview:** "Autofill with AI" → paste the job post or a link → the API reads it and returns a draft → the panel opens pre-filled, with AI-filled fields marked and doubtful fields warned. The user checks and edits, then presses **Save application** (or **Discard**). Nothing is saved before that.
- **View / edit:** clicking a card or row opens the saved application. Every field is editable in place and saves on its own.

Layout on desktop: a wide panel with two columns.

- **Main column:** company link, role title (editable), job description (rich text), notes (rich text), and at the **bottom** the Activity section with tabs All / Comments / History. Comments include notes, follow-ups (due date + done tick) and interview notes. History is the read-only change log (who, when, field, old → new, status moves, AI autofill).
- **Side column:** status, priority, labels, work mode, job type, level, source, CV version, location, job link, salary, dates, contacts, and the company card with the accuracy badge.
- On phones the panel is full screen and the side-column fields become a collapsible "Details" section under the title.

The URL reflects the panel (`?new=1`, `?draft=<key>`, `?app=<id>`), so the back button closes it and a saved application can be linked to.

## 6. Customisable options (everything editable)

Settings → Pipeline & fields lets the user manage each option type: STATUS, PRIORITY, LABEL, WORK_MODE, JOB_TYPE, LEVEL, SOURCE, CV_VERSION.

- Add, rename, recolour (from the token palette only), reorder by drag, archive.
- Deleting an option that is in use asks which option to move those applications to. Then it's archived (kept for history), not hard-deleted.
- Statuses also have a **category** that drives the dashboard, so renaming a status never breaks KPIs. Categories: `SAVED`, `APPLIED`, `IN_PROGRESS`, `INTERVIEW`, `OFFER`, `ACCEPTED`, `CLOSED`. A status in `CLOSED` also has a reason: `REJECTED`, `WITHDRAWN`, `DECLINED`, `GHOSTED`, `OTHER`.
- At least one status must stay in `SAVED` or `APPLIED`, so new applications always have a home.
- "Reset to defaults" per type (only adds missing defaults back, matched by name case-insensitively so nothing is duplicated; never deletes the user's custom ones).
- The page is the sidebar section **Configuration**, with one tab per type plus a Cover Letter note. An option used by existing applications can only be removed after choosing another option to move them to.

Defaults created at sign-up:

| Type       | Defaults (in order)                                                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STATUS     | Saved (SAVED), Applied (APPLIED), Screening (IN_PROGRESS), Interview 1 (INTERVIEW), Interview 2 (INTERVIEW), Technical Test (IN_PROGRESS), Offer (OFFER), Accepted (ACCEPTED), Rejected (CLOSED/REJECTED), Ghosted (CLOSED/GHOSTED), Withdrawn (CLOSED/WITHDRAWN) |
| PRIORITY   | High, Medium, Low                                                                                                                                                                                                                                                 |
| JOB_TYPE   | Internship, Full-time, Contract, Part-time                                                                                                                                                                                                                        |
| LEVEL      | Intern, Junior, Mid, Senior                                                                                                                                                                                                                                       |
| WORK_MODE  | Onsite, Hybrid, Remote                                                                                                                                                                                                                                            |
| SOURCE     | LinkedIn, Company Website, Referral, Job Board, Email, University/Career Fair, Other                                                                                                                                                                              |
| CV_VERSION | Master, Java-Spring, Frontend-React, Full-Stack, .NET, Other, Customized                                                                                                                                                                                          |
| LABEL      | none                                                                                                                                                                                                                                                              |

Later (not v1): user-defined custom fields (text, number, date, select) per application.

## 7. Companies

- Directory page with search (name and aliases), filters (Local / Foreign, tier A/B, has open applications, verification status) and sort.
- Two kinds of company:
  - Global companies: seeded from `seed/companies.seed.json`, managed by admins, visible to everyone.
  - Private companies: created by a user (manually or from AI lookup). Only that user sees them.
- Company page: profile fields, "Report ratings" from the seed clearly labelled as coming from an AI research report and unverified, the user's own rating (1 to 5) and private notes, list of the user's applications to this company, and the verification panel.
- Verification panel (PRO): runs when the user clicks "Check data accuracy" and returns the result in the same request (up to about a minute, with a loading state). Shows an accuracy score 0 to 100, status per field (matches / differs / not found), the value found online, source links, and "checked N days ago". A result less than 30 days old is shared and shown to every PRO user (global companies). "Re-check" forces a new check and is allowed once per rolling 24 hours per company per user.
- Search miss: if no company matches, FREE users see "Add company". PRO users also see "Look up with AI". The AI result is shown with a clear warning banner ("AI result, not in our database, may be wrong") and source links, and can be saved as a private company.
- Two different numbers, never mixed:
  - **Data accuracy score** (AI verification): how well the stored data matches current public information.
  - **Company rating**: the report's ratings and the user's own rating. AI never invents a "how good is this company" score.

## 8. Dashboard

KPI cards (with the change vs the previous period of the same length):

| KPI                        | Definition                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Active applications        | Not archived, not deleted, status category not `CLOSED` and not `ACCEPTED`         |
| Applied this period        | `milestones.appliedAt` within the selected range                                   |
| Response rate              | Of applications applied in range, the share with `milestones.firstResponseAt` set  |
| Interview rate             | Of applications applied in range, the share with `milestones.firstInterviewAt` set |
| Offers                     | `milestones.offerAt` within range                                                  |
| Avg days to first response | Mean of `firstResponseAt − appliedAt`, for those with a response                   |
| Follow-ups due             | Applications or follow-up comments due today or overdue                            |
| Stale applications         | In `APPLIED`, `IN_PROGRESS` or `INTERVIEW` with no activity for 14+ days           |

Range picker: 7 days, 30 days, 90 days, this year, all time.

Charts:

- Funnel: Applied → Responded → Interview → Offer → Accepted.
- Applications per week (last 12 weeks), stacked by work mode.
- Status distribution (current board).
- By source (where applications came from, with response rate per source).
- Upcoming: next interviews and follow-ups (list).
- Recent activity feed (last 20 events, "Load more").

PRO: "Weekly insights" card. AI summarises the aggregated numbers (never raw job text) into 3 to 5 short observations and suggestions, with the numbers they're based on. Generated on demand (button), at most once per day; the latest result for the week is stored and shown.

## 9. Export and import

- Export: all applications (or the current filter) to CSV. Column headers are human labels. Values that start with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` to prevent spreadsheet formula injection.
- Import (phase 9): upload a CSV (for example from your Google Sheet), map columns to fields in a wizard, preview the first 20 rows with validation errors, then import. Unknown option values can be created on the fly. Max 1,000 rows per import.

## 10. Admin

- Users: search by email or name, see plan, role, status, created date, last login, application count, AI usage this month. Change plan (FREE ↔ PRO) with a required reason. Suspend / reactivate.
- Companies: manage global companies, import or update from a seed JSON, apply suggested fixes from verification results, merge duplicates.
- Audit log: every admin action with who, when, what changed (before → after) and the reason. Read-only.
- AI usage: calls, tokens and failures per day and per user.
- Admin can't read other users' applications, comments or notes. Privacy by design.

## 11. Non-functional requirements

| Area          | Requirement                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Responsive    | Works from 360 px phones to wide desktops (see `07-frontend-and-design.md`)                                   |
| Performance   | API p95 under 300 ms for non-AI endpoints with 2,000 applications per user. Board first load under 2 s on 4G  |
| Availability  | Health endpoint checks the DB. Failures in AI never block manual features                                     |
| Accessibility | Keyboard-usable board and forms, visible focus, colour contrast AA, labels on every input                     |
| Privacy       | Users only ever see their own data. Admins see account metadata, not content                                  |
| Time          | Store UTC. Show in the user's time zone (default Asia/Colombo)                                                |
| Money         | Integers in minor units plus an ISO currency code. Default currency LKR                                       |
| Limits        | Max 5,000 applications per user, 200 options per type, 500 comments per application. Clear error when reached |
