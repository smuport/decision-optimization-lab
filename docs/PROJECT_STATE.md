# Project State

> This file is the external memory for the project. Update it after every meaningful implementation or documentation change.

Last updated: 2026-06-23

---

## Current Phase

Week2 Day1 completed: repository organization, project guardrails, Git initialization, and MVP platform skeleton.

The project has completed Week1 demo assets and Week2 Day1 platform skeleton setup.

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
- Day1 uses Node 22 LTS via `.nvmrc`, pnpm 9.0.0, Angular 21.2.16, NestJS 11.1.27, and TypeScript 5.9.3.
- npm/pnpm registry is configured through `.npmrc` to use `https://registry.npmmirror.com/`.
- Codex should use workspace-scoped permissions with `approval_policy = "on-request"` and limited project network/localhost access as documented in `.codex/config.toml`; do not default to unrestricted local access.

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
- Connected and pushed the initial repository to `smuport/decision-optimization-lab`.
- Added `.nvmrc` and `.npmrc` for stable Node/pnpm setup in China network conditions.
- Added `.codex/config.toml` and documented the project sandbox/permission strategy.
- Verified Codex configuration with `codex --strict-config doctor --summary --no-color --ascii`; current runtime reports restricted filesystem, restricted network, and approval `OnRequest`.
- Added `scripts/dev.sh` and root `pnpm dev:app` for quick local frontend/backend startup.
- Implemented Day1 frontend shell in `frontend/` with Angular.
- Implemented Day1 backend shell in `backend/` with NestJS and `GET /api/v1/health`.
- Expanded `packages/shared` with `ApiResponse`, `ApiError`, `PaginatedResponse`, enums, and `RunResultDto`.
- Marked `frontend-static/` as Week1 legacy demo.
- Verified:
  - `pnpm --filter @decision-lab/shared build`
  - `pnpm --filter backend build`
  - `pnpm --filter frontend build`
  - `pnpm turbo typecheck`
  - `pnpm turbo build`
  - `GET /api/v1/health`

---

## Next Implementation Step

Start Week2 Day 2:

1. Add PostgreSQL development setup decision.
2. Implement `backend/prisma/schema.prisma`.
3. Add Prisma migrate/seed baseline.
4. Expand `packages/shared` with Day2 data model DTOs/enums.
5. Seed current course, term, section, demo users, and initial case/exercise/assignment data.

---

## Open Questions

- PostgreSQL local setup method still needs to be chosen when Day 2 begins.
- Codex sandbox can abort Angular builder, block dependency/network access, and isolate localhost; use scoped approval for important installs, builds, dev servers, and localhost verification.
- `codex doctor` currently reports WebSocket/HTTP reachability warnings in this environment; use approved fallback execution or local terminal verification when needed.

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
