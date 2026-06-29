# Implementation Guardrails

> This document prevents implementation drift. If a requested change conflicts with this file, ask the user before proceeding.

---

## 1. Non-Negotiable Current Scope

### 1.1 Week3 management control plane

Week3 is case01-only and implements:

- ADMIN Case/Exercise metadata, status, preview, and resource-readiness management.
- TEACHER management of owned ClassSection case releases and Assignments.
- STUDENT visibility derived from ACTIVE Enrollment and PUBLISHED SectionCaseRelease.
- Exercise-owned templates, datasets, rubric, validator, output schema, and resource package.
- Assignment-centric workspace, resource authorization, and submission access.
- Week2 history compatibility.

Week3 does not implement new cases, online template/dataset/rubric/validator editing, full reports/manual grading, queues, object storage, WebSocket, Monaco, Docker sandbox, leaderboard, or production deployment.

### 1.2 Completed Week2 scope

Week2 builds a usable MVP platform skeleton, not the full online judge.

Allowed in Week2:

- Angular frontend.
- NestJS backend.
- Prisma schema and seed.
- PostgreSQL.
- `packages/shared` DTO/schema/type package.
- `pnpm workspace + Turborepo`.
- Local runner adapter using `runner/evaluate.py`.
- Local file storage for submissions and results.
- Detailed `case_01` teaching sample.
- Placeholder report entry in submission detail.
- Placeholder manual grading entry in teacher panel.

Not allowed in Week2 unless the plan is explicitly updated:

- Redis.
- BullMQ.
- MinIO.
- Independent FastAPI evaluator.
- Docker sandbox.
- WebSocket result push.
- Leaderboard.
- Monaco editor.
- Full report editor, attachments, comments, or grading workflow.
- Full production deployment.

---

## 2. Data Model Guardrails

Week2 MVP database includes:

- `User`
- `Course`
- `Term`
- `ClassSection`
- `Enrollment`
- `Case`
- `Exercise`
- `Assignment`
- `Dataset`
- `Template`
- `Rubric`
- `Submission`
- `RunResult`
- `Score`
- `Report`
- `ManualGrade`

Do not add `Leaderboard`, `AuditLog`, `SystemConfig`, MinIO object tables, or full feedback/comment models in Week2 unless confirmed.

---

## 3. Shared Model Guardrails

Use this separation:

```text
Prisma schema / Prisma Client
= backend persistence model

packages/shared
= frontend/backend API contract
```

Rules:

- `@prisma/client` is backend-only.
- Frontend imports API types from `@decision-lab/shared`.
- Backend controller DTOs and response types should use `@decision-lab/shared` where practical.
- Shared package may contain DTOs, enums, Zod schemas, and API response types.
- Do not expose `passwordHash`, activation secrets, internal paths, or hidden dataset details to frontend DTOs.

---

## 4. API Guardrails

Use API routes from `docs/design/BACKEND_API_DESIGN.md`.

Important Week2 route:

```text
POST /api/v1/assignments/:id/submissions
```

Week3 adds these ownership rules:

- Case and Exercise are shared course assets managed by ADMIN.
- SectionCaseRelease controls Case reading visibility for one ClassSection.
- Assignment publishes one Exercise to one ClassSection.
- Students use current-user `/me/cases` and `/me/assignments`; do not expose all Exercises.
- Exercise owns the resource package, but student download requires an authorized Assignment.

Do not replace it with:

```text
POST /api/v1/submissions
```

Submission response should preserve future async compatibility:

```json
{
  "submissionId": "sub_001",
  "status": "QUEUED",
  "statusUrl": "/api/v1/submissions/sub_001",
  "resultUrl": "/api/v1/submissions/sub_001/results"
}
```

Week2 may execute runner synchronously, but API shape should not block future async queue migration.

---

## 5. Frontend Guardrails

Week2 frontend pages:

- `/auth/login`
- `/`
- `/cases/:caseId`
- `/exercises/:exerciseId/workspace`
- `/submissions/:submissionId`
- `/teacher`

The workspace should follow:

```text
left: problem/data/rubric
center: code textarea
right: result/report placeholder
```

Use textarea for Week2. Do not introduce Monaco unless the plan changes.

---

## 6. Monorepo Guardrails

Use:

```text
pnpm workspace + Turborepo
```

Do not introduce Nx in Week2. Preserve future Nx migration by:

- Keeping project-level `package.json` files.
- Keeping consistent scripts: `dev`, `build`, `typecheck`, `test`, `lint`.
- Keeping shared imports via package name.
- Keeping `tsconfig.base.json`.

---

## 7. Case01 Guardrails

`case_01` is the only Week2 deep teaching sample.

It must include:

- Problem introduction.
- A/B product production scenario.
- Objective and constraints.
- Model construction guide.
- PuLP guide.
- Dataset table.
- Template code.
- Submission flow.
- Structured result feedback.

`case_04` and `case_16` only need basic metadata availability in Week2.

---

## 8. Documentation Guardrails

When implementation changes design or scope, update documents immediately:

- Architecture change: `docs/design/ARCHITECTURE.md`
- Project structure change: `docs/design/PROJECT_STRUCTURE.md`
- API change: `docs/design/BACKEND_API_DESIGN.md`
- Database change: `docs/design/DATABASE_DESIGN.md`
- Current phase plan change: `docs/plans/WEEK3_BUILD_PLAN.md`
- Current state change: `docs/PROJECT_STATE.md`
- New major decision: `docs/decisions/ADR-xxxx-*.md`

---

## 9. Codex Sandbox Guardrails

The project uses `.codex/config.toml` to document the intended Codex permission posture:

- Workspace-scoped file access by default.
- `approval_policy = "on-request"`.
- Network access limited to project needs such as `localhost`, GitHub, and npm mirror access.
- No default `danger-full-access`.

If a build, dependency install, dev server, or localhost request fails inside Codex but is expected to work locally:

1. Do not change framework versions or source code solely to satisfy the sandbox.
2. Re-run the same meaningful command with scoped approval when the command is important for verification.
3. Prefer stable project baselines from the design docs, such as `.nvmrc` Node 22 LTS and `.npmrc` npmmirror, over ad hoc environment changes.
4. Record the exact distinction between sandbox failure and non-sandbox/local success.

Known examples:

- Angular builder may abort or behave differently in a restricted sandbox.
- NestJS/Angular dev servers may fail to bind ports inside a restricted sandbox.
- `curl localhost` may need to run in the same non-sandbox network context as the dev server.
- Dependency installation may fail without approved network access.

---

## 10. Stop-and-Ask Conditions

Stop and ask the user before proceeding if:

- A design document conflicts with the active plan.
- A requested change would add a Week2-forbidden technology.
- A requested change would expose Prisma Client types to frontend.
- A requested change would delete or overwrite legacy assets.
- A requested change requires GitHub remote creation, push, force push, or visibility change.
- Local files contain user changes that conflict with the current task.
