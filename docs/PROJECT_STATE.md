# Project State

> This file is the external memory for the project. Update it after every meaningful implementation or documentation change.

Last updated: 2026-06-30

---

## Current Phase

Week2 Day7 completed: teacher progress API statistics, teacher dashboard, assignment submission list, submission-detail navigation, evaluator numeric tolerance fix, automated verification, and real database API acceptance.

Week3 Day1 completed: shared management contracts and runtime schemas, the SectionCaseRelease/Exercise/Assignment Prisma model, compatible migration, two-section seed data, migration data-check SQL, empty-database verification, repeated seed, and existing Week2 database migration have all passed.

Week3 Day2 completed: bcrypt-backed demo accounts, JWT authentication, global auth/role guards, section ownership checks, trusted current-user submission and grading, scoped existing APIs, frontend session recovery/interceptor/role routes, and real two-section permission acceptance have passed.

Week3 Day3 completed: ADMIN Case pagination/search/filtering, draft creation, detail and Exercise summaries, metadata editing, forward-only publish/archive state transitions, archived read-only protection, management UI, unsaved-change confirmation, automated tests, production builds, and real PostgreSQL API acceptance have passed.

Week3 Day4 completed: ADMIN Exercise management, case01 Exercise-owned asset migration, exercise manifest, six-part resource checks, publication blocking, Exercise-aware runner with legacy Case mapping, student-safe resource package generation, management UI, automated regression, repeated seed, and real PostgreSQL API/submission acceptance have passed.

Week3 Day5 completed: TEACHER section students and three-tab management, PUBLISHED Case catalog/search/batch release, release windows/order/archive, strict `/me/cases` visibility, no-assignment read-only behavior, automated tests, production compilation, and real two-section API isolation acceptance have passed.

Week3 Day6 completed: TEACHER Assignment draft/edit/publish/close/archive, transactional publication and submission gates, student assignment list/detail, availability/attempt/late rules, Assignment-centric workspace/resources/submission, legacy workspace migration, automated tests, production builds, and real two-section API acceptance have passed.

Follow-up completed: case01 teaching resources now provide a real downloadable resource package while preserving JSON APIs for preview/workspace initialization.

The project has completed Week1 demo assets and Week2 Day1 through Day7. Version 1.1 has passed automated and real database API acceptance; screenshot-style visual acceptance remains unavailable in the current Codex runtime.

---

## Current Source of Truth

- Project instructions: `../AGENTS.md`
- Architecture: `design/ARCHITECTURE.md`
- Project structure: `design/PROJECT_STRUCTURE.md`
- Active plan: `plans/WEEK3_BUILD_PLAN.md`
- Completed Week2 plan: `plans/WEEK2_BUILD_PLAN.md`
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
- Week3 uses `Case → Exercise` for shared content, `SectionCaseRelease → Case` for strict teaching-class visibility, and `Assignment → Exercise` for class-specific task publication.
- Students do not have a public case catalog; they only see cases released to an ACTIVE enrollment section.
- ADMIN maintains Case/Exercise metadata and status. TEACHER manages releases and assignments only for sections they teach.
- Exercise owns templates, datasets, rubric, validator, output schema, and downloadable resources. Assignment adds section, schedule, attempt, and late-submission rules.
- Week3 does not provide online editing/upload of templates, datasets, rubric, or validator; repository assets remain the source of truth.
- SectionCaseRelease is the only current student Case catalog gate; Case visibility requires ACTIVE Enrollment, PUBLISHED release, and an active visibility window.

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
- Implemented Week2 Day6 shared/API contract alignment:
  - Added login, course, exercise, dataset, submission, current-section, teacher-progress, and teacher-submission response types to `@decision-lab/shared`.
  - Removed duplicated API response interfaces from `frontend/src/app/core/api-client.service.ts`.
  - Updated frontend consumers to import API contracts from `@decision-lab/shared`.
  - Added `codeText` to `GET /api/v1/submissions/:id` for read-only submission replay.
- Completed Week3 design package:
  - ADR-0005 for Case, Exercise, SectionCaseRelease, Assignment, visibility, ownership, and role boundaries
  - authoritative architecture, database, API, frontend, evaluation, and project-structure updates
  - `WEEK3_BUILD_PLAN.md` with Day1-Day7 delivery and verification gates
  - daily implementation specifications covering prerequisites, step-by-step changes, test scenarios, acceptance criteria, and documentation closeout
  - `VERSION_1_2_ACCEPTANCE.md` with role, visibility, resource, submission, and compatibility scenarios
- Implemented Week3 Day1 persistence and contract foundation:
  - shared Week3 statuses, management DTOs, request types, and Zod runtime validation schemas
  - `SectionCaseRelease` with release window, ordering, publisher, timestamps, indexes, and explicit inverse relations
  - Exercise code/description/status/assetPath and `(caseId, code)` uniqueness
  - Assignment description/status/publishedAt/createdById and non-unique `(sectionId, exerciseId)` index
  - compatible migration that backfills case01, the existing Exercise, Assignment creators/status, and releases without replacing historical ids
  - idempotent seed for demo ADMIN, two teachers, two students, two sections, and one deliberately unreleased visibility section
  - transactional data-check SQL for migration relations, orphan detection, visibility isolation, and repeated Exercise assignment
- Verified Week3 Day1 code-level checks:
  - `pnpm --filter @decision-lab/shared build`
  - shared runtime validation accepts valid assignment input and rejects an inverted release window
  - `pnpm --filter backend prisma:validate`
  - `pnpm --filter backend typecheck`
  - `pnpm --filter backend build`
  - `pnpm --filter frontend exec ngc -p tsconfig.app.json`
  - `pnpm --filter backend test` (5 passed, including 3 Week3 Day1 contract/migration invariant tests)
  - `git diff --check`
- Verified Week3 Day1 database acceptance with `pnpm verify:week3:day1`:
  - backed up the Week2 development database to `/tmp/decision_lab_before_week3_day1.dump`
  - applied both migrations to an empty verification database
  - ran seed twice without duplicate sections, releases, or assignments
  - migrated the existing development database while preserving Assignment id `9924e441-d2d3-479a-98ed-3c7383b48299`
  - preserved 20 Submission rows, 20 RunResult rows, 0 Score rows, and all tested foreign-key relations
  - confirmed the demo section has one PUBLISHED case01 release and the visibility-control section has none
  - confirmed the same section can create another Assignment for the same Exercise inside a rolled-back verification transaction
- Implemented and verified Week3 Day2 authentication and authorization:
  - `@nestjs/jwt` access/refresh token signing and `bcryptjs` password verification
  - active-account validation and server-side user/role refresh on every authenticated request
  - global `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@Roles()`, and `@CurrentUser()`
  - `SectionAccessService` for ACTIVE Enrollment, owned section, Assignment, Submission, and Exercise access
  - unified numeric `ApiError` responses for 400/401/403/404/500 and `SECTION_ACCESS_DENIED` details
  - frontend Authorization interceptor, `/auth/me` restoration, role guards, role navigation, and 401/403/404 pages
  - authenticated blob download for Exercise resource packages
  - 12 backend tests and 5 frontend auth-policy/functional-guard tests passing
  - real logins for ADMIN, two TEACHER accounts, and two STUDENT accounts
  - real 401, role 403, cross-section teacher/student 403, resource isolation, and malicious `userId` rejection
  - successful case01 submission `602ce0f4-063e-4cca-bc47-79a019a8447e` with score 95 using the JWT student identity
- Implemented and verified Week3 Day3 ADMIN Case management:
  - shared pagination query, Case list/detail/request contracts, and runtime validation
  - ADMIN-only list, search, status filter, create, edit, publish, archive, and Exercise summaries
  - forward-only Case state machine and archived read-only protection without a delete endpoint
  - Angular Case directory/editor, student-view preview, inline Exercise draft entry, and unsaved-change guard
  - 16 backend tests and 7 frontend tests passed at Day3 closeout
  - real PostgreSQL create/edit/publish/archive/filter acceptance and TEACHER/STUDENT 403 checks
- Implemented and verified Week3 Day4 ADMIN Exercise management and assets:
  - ADMIN-only Exercise list/create/detail/edit/status/resource-check APIs and Angular management page
  - six-part resource checks with parameterized missing-resource coverage and publish blocking
  - case01 assets migrated to `course-assets/cases/case_01/exercises/production_planning`
  - Exercise-aware runner input with explicit Week2 `case_01` compatibility mapping
  - whitelist resource zip with README, template, public datasets, and output schema only
  - 31 backend tests, 9 frontend tests, and 8 runner tests passed
  - repeated seed preserved 22 Submission rows, 22 RunResult rows, Exercise id, and all tested foreign keys
  - real ADMIN resource check, incomplete publish rejection, STUDENT resource download, role 403, and synchronous score-95 submission passed
- Implemented the real `/exercises/:exerciseId/workspace`:
  - exercise, dataset, output-schema, and rubric summary
  - template-loaded Python textarea
  - local draft key `decision-lab.workspace.draft:{exerciseId}`
  - reset-to-template action
  - dataset selection and resource package download
  - real assignment-centric submission and synchronous result panel
  - status, score, objective, optimalObjective, gap, feasibility, and messages
  - submission-detail navigation and report placeholder
- Implemented `/submissions/:submissionId`:
  - status, score, attempt, submit/complete time, and late status
  - read-only `codeText`
  - objective, optimalObjective, gap, feasibility, and messages
  - metrics/artifacts JSON summaries
  - workspace navigation and report placeholder
- Fixed case01 floating-point evaluation boundaries:
  - unified absolute and relative tolerance through `rubric.json`
  - scale-aware resource-limit comparison
  - tolerant objective consistency and optimality comparison
  - finite-number validation
  - regression tests for rounded correct output, real constraint violation, and material objective mismatch
- Implemented Week2 Day7 teacher flow:
  - `averageScore` for section and assignment progress summaries
  - current-term section loading with the first section selected by default
  - assignment overview and selectable submission list
  - submission-detail navigation
  - manual-grade placeholder without implementing the full grading flow
  - real backend tests for teacher average-score behavior
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
- Verified Week2 Day6:
  - `pnpm --filter @decision-lab/shared build`
  - `pnpm --filter backend typecheck`
  - `pnpm --filter backend build`
  - `pnpm --filter frontend exec ngc -p tsconfig.app.json`
  - `pnpm --filter frontend build` under non-sandbox execution with local Node 23.5.0; the same sandboxed command hit the known `SIGABRT`
  - real `POST /api/v1/assignments/:id/submissions` returned `SUCCESS` for a feasible case01 solution
  - real failed submission returned `RUNTIME_ERROR` with readable messages
  - `GET /api/v1/submissions/:id` returned `codeText`, result, metrics, artifacts, and report placeholder
  - Angular workspace and submission-detail routes returned HTTP 200 on a temporary local verification server
  - in-app browser visual verification was unavailable because no browser instance was exposed in the current Codex runtime
- Verified Week2 Day7 implementation:
  - `python3 -m unittest discover -s runner/tests -p 'test_*.py' -v` (3 passed)
  - case01 demo runner returned `SUCCESS`, score 95, and gap 0
  - `pnpm --filter @decision-lab/shared build`
  - `pnpm --filter backend test` (2 passed)
  - `pnpm --filter backend typecheck`
  - `pnpm --filter backend build`
  - `pnpm --filter backend prisma:validate`
  - `pnpm --filter frontend exec ngc -p tsconfig.app.json`
  - frontend production build passed outside the sandbox; sandboxed Angular build hit the known `SIGABRT`
  - `pnpm turbo typecheck` completed shared/backend tasks but sandboxed Angular/esbuild deadlocked and exited 137
  - real demo login and current-section APIs against PostgreSQL
  - real teacher progress returned section/assignment `averageScore = 35.47`
  - real teacher assignment submissions returned detail-navigation ids
  - a four-decimal optimal solution returned `SUCCESS` through NestJS, runner, and PostgreSQL
  - Angular development server built and started on temporary port `4302` with the current backend on `3007`

---

## Next Implementation Step

Start Week3 Day7 from `plans/WEEK3_BUILD_PLAN.md`: run the complete ADMIN/TEACHER/STUDENT integration acceptance, rebuild/seed verification, compatibility audit, demo walkthrough, and Version 1.2 documentation closeout.

---

## Planning Notes

- Shared response contracts are now wired through the frontend API client; UI-only view models may remain local.
- Week2 feature implementation and runtime database API acceptance are complete.
- Week3 Day1 through Day6 are complete; Day7 integrated Version 1.2 acceptance and documentation closeout are next.
- Week3 remains case01-only and focuses on the management control plane rather than new cases or infrastructure.
- HTTP Authorization interceptor, global error toast/handler, and 404 page are useful polish, but non-blocking for Week2 completion.
- `GET /api/v1/submissions/:id` now exposes `codeText` for Week2 read-only code replay.
- `GET /api/v1/teacher/sections/:id/progress` now exposes section and assignment `averageScore`.

---

## Open Questions

- Codex sandbox can abort Angular builder, block dependency/network access, and isolate localhost; use scoped approval for important installs, builds, dev servers, and localhost verification. On 2026-06-25, `pnpm --filter frontend build` failed with `SIGABRT` inside the sandbox but passed outside the sandbox with the same local Node 23.5.0.
- `codex doctor` currently reports WebSocket/HTTP reachability warnings in this environment; use approved fallback execution or local terminal verification when needed.
- `pnpm turbo typecheck` can be killed with exit 137 during Angular build in this Codex environment; individual `frontend build`, `backend typecheck`, and `shared build` passed.
- `localhost:3000` and `localhost:4200` may already be occupied by the user's local services; use `3002`/`4300` for this project during Week2.
- On 2026-06-28, direct sandbox access to PostgreSQL returned `EPERM`; scoped non-sandbox verification succeeded against the healthy Docker PostgreSQL service.
- On 2026-06-29, an earlier scoped-execution interruption temporarily prevented Docker access; after the channel recovered, `pnpm verify:week3:day1` completed the empty and existing database migration gates successfully.
- The current runtime did not expose an in-app browser instance, so screenshot-style visual acceptance was not performed.

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
