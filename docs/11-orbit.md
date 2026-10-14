# 11: Orbit (tasks, reminders and a customizable command center)

Orbit is one page, `/orbit`, where a job seeker tracks everything that has a date: tasks, reminders, calls, meetings, interviews, follow-ups and deadlines. It is a board of widgets the user can move, resize and save as **spaces**. Everything can be linked to an application or a company.

## 1. Principles

1. Time is the centre. The signature widget is a radar where distance from the middle means "how soon".
2. Colour carries meaning. Every kind of item has its own colour everywhere (radar, lists, calendar, panel).
3. Application dates (deadline, follow-up, next interview) appear automatically. The user never types them twice.
4. Everything is editable from one side panel.
5. Limits and Pro features are enforced on the server. The UI only explains them.
6. Tasks are their own entity. Application comments (`FOLLOW_UP`, `INTERVIEW`) stay as they are and are not migrated.

## 2. Kinds and colours

| Kind      | Meaning                                                    | Colour (option colour token) |
| --------- | ---------------------------------------------------------- | ---------------------------- |
| TASK      | something to do                                            | info (blue)                  |
| REMINDER  | a nudge, usually about a company                           | purple                       |
| CALL      | a phone or video call                                      | teal                         |
| MEETING   | a meeting                                                  | indigo                       |
| INTERVIEW | an interview                                               | orange                       |
| FOLLOW_UP | follow up on an application                                | pink                         |
| DEADLINE  | a hard date                                                | danger (red)                 |
| WATCH     | recurring check of a company (careers page, LinkedIn). Pro | lime                         |
| OTHER     | anything else                                              | neutral                      |

Done items are shown muted. Overdue open items get a red ring.

## 3. Data model

### tasks (one document per item)

`{ userId, title, notesHtml, kind, status OPEN | DONE, priority LOW | MEDIUM | HIGH, dueAt, allDay, remindAt, applicationId, companyId, tags[], checklist[{id,text,done}], recurrence {freq, interval}, watchUrl, completedAt, snoozedUntil, notifiedAt, deletedAt, version, createdAt, updatedAt }`

- Indexes: `{ userId, status, dueAt }`, `{ userId, applicationId }`, `{ userId, companyId }`, `{ status, remindAt, notifiedAt }` (for the reminder job).
- `applicationId` and `companyId` are checked against the caller (another user's id gives 404).
- Notes are sanitised HTML (same sanitiser as comments).
- Soft delete. Optimistic concurrency with `version`.
- Completing a recurring item (Pro) marks it done and creates the next one.

### orbitSpaces (saved layouts)

`{ userId, name, order, widgets[{ id, type, x, y, w, h, config }], version }`. The grid has 12 columns. Widget types: ORBIT, TODAY, TASKS, REMINDERS, PULSE, DEADLINES, PIPELINE, AGING, GOAL, NOTES, CALENDAR, WATCH.

### orbitSettings (one per user)

`{ userId, timezone, emailDigest, emailReminders, digestHour, lastDigestDate, weeklyGoal }`.

## 4. Free and Pro

|                                             | Free                                             | Pro                |
| ------------------------------------------- | ------------------------------------------------ | ------------------ |
| Open tasks (all kinds except reminders)     | 15                                               | unlimited          |
| Open reminders (REMINDER)                   | 5                                                | unlimited          |
| Spaces                                      | 1                                                | 10                 |
| Widgets per space                           | 8                                                | 24                 |
| Widget types                                | ORBIT, TODAY, TASKS, REMINDERS, PULSE, DEADLINES | all                |
| Orbit zoom                                  | up to 14 days                                    | 7, 14, 30, 90 days |
| Tags per item                               | 2                                                | 10                 |
| Checklists                                  | no                                               | yes (30 steps)     |
| Recurring items and WATCH kind              | no                                               | yes                |
| Email: daily digest and reminders           | no                                               | yes                |
| Space templates (Interview week, Deep hunt) | no                                               | yes                |

Hitting a limit returns `403 PLAN_LIMIT_REACHED` with `{ limit, plan }`. A Pro-only feature returns `403 PLAN_REQUIRED`. Existing data is never deleted when someone leaves Pro: items over the Free limit stay readable and editable, but no new ones can be created until they are under the limit.

## 5. API

All routes need authentication, are under `/api/v1/orbit`, and are scoped by `userId`.

| Method     | Path                                     | Notes                                                                                          |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| GET        | `/tasks`                                 | filters: `q, kind[], status, priority, applicationId, companyId, tag, from, to, cursor, limit` |
| POST       | `/tasks`                                 | create; limits enforced                                                                        |
| GET        | `/tasks/:id`                             | one item                                                                                       |
| PATCH      | `/tasks/:id`                             | `{ ...fields, version }`; 409 on stale version                                                 |
| POST       | `/tasks/:id/complete`                    | `{ version }`; recurring items create the next one                                             |
| POST       | `/tasks/:id/reopen`                      | `{ version }`                                                                                  |
| POST       | `/tasks/:id/snooze`                      | `{ until }` moves `dueAt` and `remindAt`                                                       |
| DELETE     | `/tasks/:id`                             | soft delete                                                                                    |
| GET        | `/timeline`                              | `from, to`: tasks plus read-only application events (deadline, follow-up, next interview)      |
| GET        | `/pulse`                                 | weekly numbers (applied, done, overdue, streak)                                                |
| GET        | `/due`                                   | items due or reminding now, plus the overdue count (drives the bell)                           |
| GET / POST | `/spaces`, `/spaces/:id` (PATCH, DELETE) | layouts; Free limits enforced; a default space is created on first read                        |
| GET / PUT  | `/settings`                              | timezone, email preferences, weekly goal                                                       |

Cron (secured by `CRON_SECRET`, sent as `Authorization: Bearer ...`): `GET|POST /api/v1/internal/orbit/digest` (daily digest) and `/internal/orbit/due` (reminder emails for items that just became due).

## 6. Email (Resend)

Uses the existing `Mailer` port and `ResendMailer` with `EMAIL_API_KEY`. Only Pro users with a verified email and the matching preference receive anything. The digest is sent once per local day (`lastDigestDate`). Reminder emails are sent once per item (`notifiedAt`). Vercel's free plan runs a cron once a day, which covers the digest (`apps/api/vercel.json` runs it at 03:30 UTC, which is 09:00 in Sri Lanka, so it reaches people whose chosen hour is 09:00 or earlier there; a user's chosen hour is respected on the first run at or after it); for emails at the exact due time, call `/internal/orbit/due` every few minutes from a free external cron service.

## 7. Web

- Sidebar item "Orbit" with the route `/orbit`.
- **Board:** 12-column grid, edit mode with drag by the grip and resize from the corner (pointer events, snapped to cells, pushed down so widgets never overlap). Widget gallery drawer with Pro badges. Spaces as tabs.
- **Quick add:** one line with live chips. Understands dates ("in 2 weeks", "next Monday 3pm", via `chrono-node`), kinds ("call", "interview", "follow up", "remind me", "deadline"), `@Company`, `#tag` and `!high`.
- **Orbit radar:** the reference date is Today or any chosen date (arrows, date picker, Today button). Radius is the distance in time from that date. Earlier items sit on the left, later ones on the right, and each kind has its own wedge. Zoom 7, 14, 30 or 90 days. Hover shows a tooltip with the name; click opens the side panel. The colour legend doubles as filters.
- **Quick add reads words first (free, instant, for everyone).** It recognises kinds ("call", "interview", "follow up", "deadline", "remind me", "company watch"), dates ("tomorrow 3pm", "in 2 weeks", "next Monday"), repeats ("every 2 weeks", "weekly", "every monday"), `@Company`, `#tag`, `!high`, web addresses, and a company named in the sentence ("watch Altrium careers", "check Sysco LABS website"). Company watch and repeating items are PRO: on the Free plan the same line is saved as a one-off reminder and the chips say so.
- **Refine with AI (PRO).** When the words are not enough, a button sends only the typed sentence, the time and the UTC offset to the cheap Gemini extract model (`POST /orbit/quick-parse`, daily quota `AI_QUOTA_ORBIT_PARSE`, default 40). The answer only fills the preview chips: it is validated (known kinds, real dates in range, a link only if it was typed) and nothing is saved until Add is pressed.
- **Notification center.** A bell in the sidebar (with the due count) opens a panel with what is due or overdue now and what is coming in the next 24 hours, with Done, Snooze and Open. A small toast appears when something becomes due while the app is open, and optional desktop alerts (browser notifications) can be turned on in the panel.
- **Linked items.** The application details and the company page show every task, reminder, call and company watch linked to them, with a one-line add that uses the same word matching. Items open on Orbit.
- **Quick add reads words first (free, instant, for everyone).** It recognises kinds ("call", "interview", "follow up", "deadline", "remind me", "company watch"), dates ("tomorrow 3pm", "in 2 weeks", "next Monday"), repeats ("every 2 weeks", "weekly", "every monday"), `@Company`, `#tag`, `!high`, web addresses, and a company named in the sentence ("watch Altrium careers", "check Sysco LABS website"). Company watch and repeating items are PRO: on the Free plan the same line is saved as a one-off reminder and the chips say so.
- **Refine with AI (PRO).** When the words are not enough, a button sends only the typed sentence, the time and the UTC offset to the cheap Gemini extract model (`POST /orbit/quick-parse`, daily quota `AI_QUOTA_ORBIT_PARSE`, default 40). The answer only fills the preview chips: it is validated (known kinds, real dates in range, a link only if it was typed) and nothing is saved until Add is pressed.
- **Notification center.** A bell in the sidebar (with the due count) opens a panel with what is due or overdue now and what is coming in the next 24 hours, with Done, Snooze and Open. A small toast appears when something becomes due while the app is open, and optional desktop alerts (browser notifications) can be turned on in the panel.
- **Linked items.** The application details and the company page show every task, reminder, call and company watch linked to them, with a one-line add that uses the same word matching. Items open on Orbit.
- **Side panel:** edit everything, complete or reopen, snooze, duplicate, delete, open the linked application or company. Application events open the application instead.
- **Filters and search** on the page header apply to the widgets that list items.
- Widgets: Orbit, Today river, Tasks (grouped by due bucket, search, filters), Reminders, Pulse, Deadlines, Pipeline snapshot, Aging (days since applied), Weekly goal, Notes scratchpad, Calendar month, Company watch.
- Bell in the sidebar with the due count, and a toast when something becomes due.
- Mobile: one column, widgets stacked in layout order.
- Accessibility: every radar dot is a focusable button with an accessible name; the radar's animation respects reduced motion; drag and resize also work with the keyboard (arrow keys in edit mode).

## 8. Phases

1. **A, foundation:** shared types and limits, models, API, tests, Pulse and Due.
2. **B, board:** page, grid engine, spaces, widgets, Orbit radar, side panel, quick add, filters.
3. **C, Pro and email:** recurrence, WATCH, checklists, templates, settings, digest and reminder emails, cron.
4. **D, polish:** mobile, keyboard, empty states, docs, tests.

## 9. Tests

Services (limits for Free and Pro, ownership gives 404, version conflicts, recurrence, snooze, link validation), routes and guards, the timeline merge, the digest and reminder selection (once only), grid maths (move, resize, push down), radar geometry (stable positions, sides, zoom), quick-add parsing, filters.
