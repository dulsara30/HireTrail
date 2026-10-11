# ADR 0004: Synchronous Gemini Free-Tier AI via Ports and Adapters

## Status

Accepted

## Context

AI capabilities (autofill from job post, company verification, insights) enhance user workflow. Complex background queues (BullMQ/Redis) add infrastructure costs and maintenance burden that are disproportionate for initial phases.

## Decision

- Execute AI requests synchronously within HTTP request lifecycles.
- Decouple application core from AI SDKs via `AiProvider` port interface; implement `GeminiAiProvider` infrastructure adapter.
- Rely on Vercel Function generous timeout limits (up to 300s on Hobby).
- Provide responsive UI loading indicators and graceful fallback on 429/timeout errors (502 `AI_UNAVAILABLE`).
- Never persist AI draft data automatically; require explicit user review and "Save".

## Consequences

- Zero external queue infrastructure required.
- Easy to swap AI providers by writing a new adapter implementing `AiProvider`.
- Clear user consent boundary before any AI data enters the database.
