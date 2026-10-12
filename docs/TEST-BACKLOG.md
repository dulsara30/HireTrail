# Test Backlog (Deferred Tests for Phase 2 & 3)

Format: `[priority S=security / C=core / N=nice] what is tested - where`

- [priority S] Options ownership: another user's option ID returns 404 on GET, PATCH, move, archive, restore - apps/api/src/modules/options/**tests**/option.routes.test.ts
- [priority C] Options reassign guard: archiving an in-use option without reassignToId throws 409 OPTION_IN_USE - apps/api/src/modules/options/**tests**/option-command.service.test.ts
- [priority C] Options reassign execution: archiving with reassignToId atomically moves references in applications inside transaction - apps/api/src/modules/options/**tests**/option-command.service.test.ts
- [priority C] Options fractional reorder: move option calculates mid fractional key correctly - apps/api/src/modules/options/**tests**/option-command.service.test.ts
- [priority C] Options reset defaults: adds missing defaults without duplicating existing keys - apps/api/src/modules/options/**tests**/option-command.service.test.ts
- [priority S] Company ownership & visibility: users cannot see other users' private companies - apps/api/src/modules/companies/**tests**/company.routes.test.ts
- [priority C] Company creation: duplicate company with same normalized name throws 409 DUPLICATE - apps/api/src/modules/companies/**tests**/company.service.test.ts
- [priority S] Applications ownership: other user's application ID returns 404 on all endpoints - apps/api/src/modules/applications/**tests**/application.routes.test.ts
- [priority C] Applications optimistic concurrency: updating or moving with stale version throws 409 CONFLICT - apps/api/src/modules/applications/**tests**/application-command.service.test.ts
- [priority C] Applications history diff: field changes and option label snapshots logged to activities in transaction - apps/api/src/modules/applications/**tests**/history-diff.test.ts
- [priority C] Applications milestone calculator: status category changes correctly update appliedAt, firstResponseAt, firstInterviewAt, offerAt, and closedAt - apps/api/src/modules/applications/**tests**/milestone.calculator.test.ts
- [priority C] Applications duplicate detection: detects similar company & role within 90 days - apps/api/src/modules/applications/**tests**/duplicate.detector.test.ts
- [priority S] HTML sanitization: script tags and event handlers stripped from notesHtml and jobDescriptionHtml - apps/api/src/modules/applications/**tests**/application-command.service.test.ts
- [priority C] Applications board query: returns lane totals and items sorted by boardOrder - apps/api/src/modules/applications/**tests**/application-query.service.test.ts
- [priority C] Comments CRUD: adding, updating, toggling done, and deleting comments logs appropriate activity - apps/api/src/modules/comments/**tests**/comment.service.test.ts
- [priority S] Comments ownership: editing or deleting another user's comment returns 404 - apps/api/src/modules/comments/**tests**/comment.routes.test.ts
- [priority C] Applications table pagination: cursor pagination with filters and sorting works correctly - apps/api/src/modules/applications/**tests**/application-query.service.test.ts
- [priority N] Undo-delete: restore deleted application within allowed window - apps/api/src/modules/applications/**tests**/application-command.service.test.ts
- [priority C] Playwright E2E: create application, drag-and-drop card across lanes on board, inline edit in panel - apps/web/e2e/pipeline.spec.ts
