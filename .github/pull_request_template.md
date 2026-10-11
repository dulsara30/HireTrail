## What changed & Why

<!-- Provide a concise description of the change and the rationale. -->

## Screenshots / Demos (for UI changes)

<!-- If applicable, include before/after screenshots or recordings. -->

## How it was tested

<!-- Detail tests executed (unit tests, manual testing, routes tested). -->

## Definition of Done Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally
- [ ] New service logic and pure helpers have unit tests
- [ ] New endpoints have route tests for auth, plan/role guards, ownership, and validation
- [ ] Inputs are validated with shared Yup schemas
- [ ] Errors use `AppError` subclasses and codes
- [ ] UI adheres strictly to design tokens (no raw hex) and 4-point spacing
- [ ] Docs in `docs/` and `CHANGELOG.md` updated if behaviour or API changed
- [ ] No secrets or real credentials committed
