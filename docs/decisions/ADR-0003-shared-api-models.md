# ADR-0003: Shared API Models Instead of Prisma Types in Frontend

Date: 2026-06-23

Status: Accepted

---

## Context

The project needs frontend and backend type consistency. One option is to directly share Prisma Client types. Another is to maintain API DTOs and schemas in `packages/shared`.

Direct Prisma type sharing is fast initially, but it couples frontend code to database persistence structure and risks exposing internal or sensitive fields.

---

## Decision

Use `packages/shared` as the frontend/backend API contract source of truth.

Use Prisma Client only inside the backend.

```text
Prisma schema / Prisma Client
= backend persistence model

packages/shared
= API DTOs, enums, schemas, response types
```

Frontend must import from:

```ts
import type { RunResultDto } from '@decision-lab/shared';
```

Frontend must not import from:

```ts
import type { User } from '@prisma/client';
```

---

## Consequences

Benefits:

- Clear API boundary.
- Better security and field-level control.
- Frontend can use page-oriented DTOs rather than raw database rows.
- Database can evolve without forcing frontend changes.
- Future OpenAPI/Zod validation remains straightforward.

Tradeoffs:

- Requires mapping between Prisma models and DTOs.
- DTOs can drift from database models if not maintained.
- Slightly slower initial development.

---

## Follow-Up

Use mapper functions or service-layer adapters in backend modules to convert Prisma results into shared DTOs.

