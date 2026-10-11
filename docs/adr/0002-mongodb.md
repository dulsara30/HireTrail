# ADR 0002: MongoDB Atlas and Mongoose with BaseRepository Scoping

## Status

Accepted

## Context

HireTrail requires a flexible schema for polymorphic options, flexible job descriptions, activities diffing, and milestones tracking, while maintaining strict ownership security and atomic updates across entities.

## Decision

Use MongoDB Atlas as the primary database with Mongoose ODM:

- Global cached Mongoose connection for serverless warm starts.
- Multi-document ACID transactions with `withTransaction` for state mutations and activities logging.
- `BaseRepository<TDoc>` requiring `userId` on every operation to prevent cross-tenant data leaks.
- Optimistic concurrency control via `version` numbers.
- Global schema plugins: `softDelete` (filtering `deletedAt: null` across queries and aggregations) and `toJSON` (transforming `_id` to `id` and stripping `__v`).

## Consequences

- Guaranteed `userId` scoping across repository operations.
- Safe transactions for all state mutations.
- Need for MongoDB replica set in test environments (provided by `mongodb-memory-server`).
