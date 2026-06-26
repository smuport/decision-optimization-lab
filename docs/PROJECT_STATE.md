# Project State

> This file is the external memory for the project. Update it after every meaningful implementation or documentation change.

Last updated: 2026-06-26

---

## Current Phase

Week2 Day5 completed: case01 detail page, teaching tabs, small dataset table, LP modeling guide, PuLP guide, template preview, dataset entry, and workspace entry.

Follow-up completed: case01 teaching resources now provide a real downloadable resource package while preserving JSON APIs for preview/workspace initialization.

The project has completed Week1 demo assets, Week2 Day1 platform skeleton setup, Week2 Day2 database baseline, Week2 Day3 backend MVP API implementation, Week2 Day4 frontend entry flow, and Week2 Day5 case01 teaching detail page.

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
- Future commit messages must follow Conventional Commits with English `type`/`scope` and Chinese subject text.
- Week2 local PostgreSQL uses Docker Compose with `postgres:14-alpine` and maps the container to host port `55432` to avoid conflicts with any existing local PostgreSQL on `5432`.
- Backend uses Prisma 7.8.0 with `prisma.config.ts` and `@prisma/adapter-pg`; Prisma Client remains backend-only.
- `.nvmrc` keeps Node 22 LTS as the recommended/CI baseline, but the current local default Node 23.5.0 has been verified for backend/shared builds and non-sandbox Angular build. If Angular build fails with `SIGABRT` inside Codex, treat it as a sandbox/runtime-permission issue before changing Node versions.
- Local development uses backend port `3002` and frontend port `4300` to avoid conflicts with the user's existing local `3000` and `4200` services.
- Frontend uses `@angular/forms` from Angular 21.2.16; dependency installation for the whole workspace should use Node 22 because Prisma 7 install scripts reject Node 23.

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
- Implemented Week2 Day2 database baseline:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20260624000000_init_week2_day2/migration.sql`
  - `backend/prisma/seed.ts`
  - `.env.example` and `backend/.env.example`
  - PostgreSQL 14 Docker Compose service on host port `55432`
- Seeded:
  - current course
  - current term
  - one teaching section
  - demo teacher
  - demo student
  - demo enrollment
  - `case_01`, `case_04`, `case_16`
  - `case_01` exercise, assignment, datasets, template, and rubric
- Verified:
  - `pnpm --filter @decision-lab/shared build`
  - `pnpm --filter backend build`
  - `pnpm --filter frontend build`
  - `pnpm turbo typecheck`
  - `pnpm turbo build`
  - `GET /api/v1/health`
  - `pnpm --filter backend prisma:validate`
  - `pnpm --filter backend prisma:generate`
  - `pnpm --filter backend exec prisma migrate dev --schema prisma/schema.prisma`
  - `pnpm --filter backend exec prisma db push --schema prisma/schema.prisma`
  - `pnpm --filter backend prisma:seed`
  - `pnpm --filter backend typecheck`
  - PostgreSQL table and seed count queries
- Implemented Week2 Day3 backend MVP API modules:
  - `backend/src/common`
  - `backend/src/prisma`
  - `backend/src/auth`
  - `backend/src/courses`
  - `backend/src/enrollments`
  - `backend/src/exercises`
  - `backend/src/submissions`
  - `backend/src/reports`
  - `backend/src/teacher`
  - `backend/src/runner-adapter`
- Implemented Week2 Day3 API surface:
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/courses/current`
  - `GET /api/v1/terms/current/sections`
  - `POST /api/v1/admin/sections/:id/enrollments/import`
  - `GET /api/v1/exercises`
  - `GET /api/v1/exercises/:id`
  - `GET /api/v1/exercises/:id/datasets`
  - `GET /api/v1/exercises/:id/template`
  - `POST /api/v1/assignments/:id/submissions`
  - `GET /api/v1/submissions/:id`
  - `GET /api/v1/submissions/:id/results`
  - `POST /api/v1/submissions/:id/report`
  - `GET /api/v1/teacher/sections/:id/progress`
  - `GET /api/v1/teacher/assignments/:id/submissions`
  - `PATCH /api/v1/teacher/submissions/:id/manual-grade`
- Added synchronous local runner integration through `backend/src/runner-adapter`, calling `runner/evaluate.py` for Week2 MVP submission evaluation.
- Added official Angular LLM reference for Week2 Day4 frontend work:
  - `docs/references/angular/llms.txt`
  - `docs/references/angular/README.md`
- Implemented Week2 Day4 frontend entry flow:
  - Angular app shell with top navigation and account area.
  - `frontend/src/app/core/api-client.service.ts` for typed API access.
  - `frontend/src/app/core/auth-state.service.ts` for demo auth state and local token storage.
  - `/auth/login` demo login page using `@angular/forms`.
  - `/` course home page backed by `GET /api/v1/courses/current` and `GET /api/v1/exercises`.
  - `/cases/:caseId` placeholder landing page for Day5 case01 detail work.
  - `frontend/proxy.conf.json` proxying `/api` to `http://localhost:3002`.
  - `frontend` dev script bound to port `4300`.
- Implemented Week2 Day5 case detail page:
  - Replaced the Day4 case placeholder with `frontend/src/app/features/cases/case-detail.component.ts`.
  - Added maintainable case teaching content in `frontend/src/app/features/cases/case-content.ts`.
  - `/cases/case_01` renders tabs: `问题介绍`、`模型构建`、`PuLP 求解`、`提交实验`.
  - case01 intro includes the small dataset resource/profit table.
  - case01 modeling tab includes decision variables, objective function, resource constraints, and teaching explanations.
  - case01 PuLP tab includes the course-plan PuLP example and explanations for `LpProblem`, `LpVariable`, `model +=`, `model.solve()`, `value(model.objective)`, variable values, and shadow prices.
  - case01 submission tab includes expected output structure, scoring notes, dataset entry, template preview, and workspace entry.
  - Added `course-assets/cases/case_01/datasets/` with public small/medium/large JSON datasets.
  - Added `GET /api/v1/exercises/:id/resources/download` to download a zip resource package containing `README.md`, the default template, and public datasets.
  - Updated the case01 page to describe the resource package contents and link to the zip download instead of opening JSON API responses as download entries.
  - Added `/exercises/:exerciseId/workspace` placeholder route so the Day5 workspace entry has a real landing page while full workspace implementation remains Day6 scope.
  - `case_04` and `case_16` keep basic metadata only.
  - Updated `scripts/dev.sh` to keep frontend `4300`, backend `3002`, and Angular proxy config aligned.
- Verified Week2 Day3:
  - `python3 runner/evaluate.py --case case_01 --dataset small --submission runner/demo_submissions/case_01_demo.py`
  - `pnpm --filter backend typecheck`
  - `pnpm --filter backend build`
  - `pnpm --filter @decision-lab/shared build`
  - `pnpm --filter frontend build` under non-sandbox execution with local Node 23.5.0
  - `GET /api/v1/exercises`
  - `GET /api/v1/exercises/:id`
  - `POST /api/v1/assignments/:id/submissions` with a valid case01 demo submission
  - `GET /api/v1/submissions/:id/results` for success and failed submissions
  - `POST /api/v1/submissions/:id/report`
  - `GET /api/v1/teacher/sections/:id/progress`
  - `GET /api/v1/teacher/assignments/:id/submissions`
  - `PATCH /api/v1/teacher/submissions/:id/manual-grade`
- Verified Week2 Day4:
  - `pnpm install --force` under Node 22 to install `@angular/forms` and restore Prisma install scripts.
  - `pnpm --filter frontend exec ngc -p tsconfig.app.json`
  - `pnpm --filter frontend build` under non-sandbox execution with local Node 23.5.0
  - `pnpm --filter backend typecheck`
  - `pnpm --filter backend build`
  - `pnpm --filter @decision-lab/shared build`
  - `PORT=3002 pnpm --filter backend dev`
  - `pnpm --filter frontend dev`
  - `GET http://localhost:3002/api/v1/courses/current`
  - `GET http://localhost:4300/api/v1/exercises`
  - `POST http://localhost:4300/api/v1/auth/login`
  - `GET http://localhost:4300/`
- Verified Week2 Day5:
  - `python3 runner/evaluate.py --case case_01 --dataset small --submission runner/demo_submissions/case_01_demo.py`
  - `pnpm --filter frontend exec ngc -p tsconfig.app.json`
  - `pnpm --filter frontend build` under non-sandbox execution with local Node 23.5.0
  - `pnpm --filter backend typecheck`
  - `pnpm --filter backend build`
  - `unzip -l /tmp/decision-lab-resource-test.zip`
  - `pnpm --filter @decision-lab/shared build`
  - `GET http://localhost:3002/api/v1/exercises/exercise-case01-production-planning`
  - `GET http://localhost:3002/api/v1/exercises/exercise-case01-production-planning/template`
  - `GET http://localhost:3002/api/v1/exercises/exercise-case01-production-planning/datasets`
  - `GET http://localhost:4300/cases/case_01`
  - `GET http://localhost:4300/cases/case_04`
  - `GET http://localhost:4300/cases/case_16`
  - `GET http://localhost:4300/exercises/exercise-case01-production-planning/workspace`
  - `bash -n scripts/dev.sh`

---

## Next Implementation Step

Start Week2 Day 6:

1. Implement `/exercises/:exerciseId/workspace` with left guide, middle code textarea, dataset selection, submit button, result panel, and report placeholder.
2. Implement `/submissions/:submissionId` detail page with status, score, objective, optimalObjective, gap, messages, metrics/artifacts summary, and report placeholder.
3. Submit case01 default/demo code through the frontend and show structured feedback.
4. Keep Monaco, multi-file uploads, complex visualization, and full report editing out of Week2 Day6.

---

## Open Questions

- Codex sandbox can abort Angular builder, block dependency/network access, and isolate localhost; use scoped approval for important installs, builds, dev servers, and localhost verification. On 2026-06-25, `pnpm --filter frontend build` failed with `SIGABRT` inside the sandbox but passed outside the sandbox with the same local Node 23.5.0.
- `codex doctor` currently reports WebSocket/HTTP reachability warnings in this environment; use approved fallback execution or local terminal verification when needed.
- `pnpm turbo typecheck` can be killed with exit 137 during Angular build in this Codex environment; individual `frontend build`, `backend typecheck`, and `shared build` passed.
- `localhost:3000` and `localhost:4200` may already be occupied by the user's local services; use `3002`/`4300` for this project during Week2.

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
