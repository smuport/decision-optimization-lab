# Project State

> This file is the external memory for the project. Update it after every meaningful implementation or documentation change.

Last updated: 2026-06-23

---

## Current Phase

Week2 preparation: repository organization, project guardrails, Git initialization, and MVP implementation readiness.

The project has completed Week1 demo assets and is preparing to implement the Week2 MVP platform skeleton.

---

## Current Source of Truth

- Project instructions: `../AGENTS.md`
- Architecture: `design/ARCHITECTURE.md`
- Project structure: `design/PROJECT_STRUCTURE.md`
- Week2 plan: `plans/WEEK2_BUILD_PLAN.md`
- Implementation guardrails: `guides/IMPLEMENTATION_GUARDRAILS.md`
- Git workflow: `guides/GIT_WORKFLOW.md`
- ADRs: `decisions/`

---

## Decisions Locked In

- MVP architecture uses Angular + NestJS + Prisma + PostgreSQL + local runner.
- Monorepo uses `pnpm workspace + Turborepo` first; Nx may be introduced later.
- `packages/shared` is the API contract source of truth for frontend/backend shared DTOs and enums.
- Prisma Client is backend-only and must not be imported by frontend.
- Week2 includes `Report` and `ManualGrade` tables/types, but only placeholder UI/API entry points.
- Week2 does not introduce Redis, BullMQ, MinIO, independent FastAPI evaluator, Docker sandbox, WebSocket, leaderboard, Monaco editor, or full report/manual grading workflow.

---

## Completed

- Reorganized documentation into:
  - `docs/design`
  - `docs/plans`
  - `docs/acceptance`
  - `docs/guides`
- Created monorepo base structure:
  - `frontend`
  - `backend`
  - `packages/shared`
  - `storage`
- Added base monorepo config:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `turbo.json`
  - `tsconfig.base.json`
- Added minimal `@decision-lab/shared` package with core API/result types.
- Added Git workflow documentation.
- Added anti-drift mechanism:
  - `AGENTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/guides/IMPLEMENTATION_GUARDRAILS.md`
  - ADRs in `docs/decisions`
- Initialized local Git repository on branch `main`.

---

## Next Implementation Step

Start Week2 Day 1:

1. Install workspace dependencies with pnpm.
2. Initialize or replace placeholder `frontend` with an Angular app.
3. Initialize or replace placeholder `backend` with a NestJS app.
4. Keep `packages/shared` as the shared contract package.
5. Verify `pnpm turbo typecheck` and `pnpm turbo build` once real scripts are available.

---

## Open Questions

- Exact Angular active support version to use depends on local Node version at implementation time.
- GitHub repository has not yet been created.
- GitHub CLI authentication for account `vaanxy` is currently invalid and needs `gh auth login`.
- PostgreSQL local setup method still needs to be chosen when Day 2 begins.

---

## Known Legacy Artifacts

- `frontend-static` is Week1 legacy static portal.
- `submission-service` is Week1 legacy transition service.
- `runner/output` contains Week1 demo result files.

These should not be deleted without user confirmation.

---

## Update Protocol

After each work session, update:

- Current phase, if changed.
- Completed items.
- Next implementation step.
- Open questions.
- Any new decisions or constraints.
