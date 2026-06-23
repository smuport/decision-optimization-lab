# ADR-0001: MVP Architecture

Date: 2026-06-23

Status: Accepted

---

## Context

The original platform documents described a full online judge architecture with Redis, BullMQ, MinIO, an independent evaluator, Docker sandboxing, and production operations. For the course platform, building all of that immediately would slow down the first usable teaching workflow.

The course needs a progressive platform that first supports case learning, code submission, structured feedback, and teacher progress visibility.

---

## Decision

Use an S2 MVP architecture for Week2:

```text
Angular frontend
NestJS backend
Prisma
PostgreSQL
Local runner adapter
Local file storage
```

Do not introduce Redis, BullMQ, MinIO, independent FastAPI evaluator, Docker sandbox, WebSocket, leaderboard, or production monitoring in Week2.

---

## Consequences

Benefits:

- Faster MVP delivery.
- Lower operational complexity.
- Easier classroom trial.
- Keeps focus on `case_01` and teaching workflow.

Tradeoffs:

- Synchronous evaluation is not suitable for high concurrency.
- Local file storage is not ideal for multi-machine deployment.
- Queue and sandbox migration will be needed before production-scale use.

---

## Follow-Up

Introduce queue, object storage, independent evaluator, and sandboxing only after the MVP submission workflow is stable.

