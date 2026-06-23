# AGENTS.md

> Project-level instructions for Codex and any AI coding agent working on Decision & Optimization Lab.

This file is the highest-priority project instruction inside this repository. Before implementing, reviewing, refactoring, or committing changes, read this file and follow it together with the referenced design documents.

---

## 1. Required Reading Before Work

Before making non-trivial changes, read these files in order:

1. `AGENTS.md`
2. `docs/PROJECT_STATE.md`
3. `docs/README.md`
4. `docs/design/ARCHITECTURE.md`
5. `docs/design/PROJECT_STRUCTURE.md`
6. `docs/guides/IMPLEMENTATION_GUARDRAILS.md`
7. `docs/guides/GIT_WORKFLOW.md`
8. The active plan for the current phase, currently `docs/plans/WEEK2_BUILD_PLAN.md`

If the task touches database, backend API, frontend, or evaluation logic, also read the relevant design document:

- Database: `docs/design/DATABASE_DESIGN.md`
- Backend API: `docs/design/BACKEND_API_DESIGN.md`
- Frontend: `docs/design/FRONTEND_DESIGN.md`
- Evaluation: `docs/design/AUTO_EVALUATION_DESIGN.md`

---

## 2. Source of Truth

Use repository documents as the source of truth, not chat memory.

Priority order:

1. Explicit latest user instruction in the current conversation.
2. `AGENTS.md`
3. `docs/PROJECT_STATE.md`
4. Active phase plan, currently `docs/plans/WEEK2_BUILD_PLAN.md`
5. Design documents in `docs/design/`
6. ADRs in `docs/decisions/`
7. README and other supporting docs

If two documents conflict, stop and ask the user for confirmation before implementing. Do not silently choose one.

---

## 3. Current Implementation Direction

The project is currently in the transition from Week1 demo to Week2 MVP platform skeleton.

Week2 target:

- Angular frontend
- NestJS backend
- Prisma
- PostgreSQL
- `packages/shared` for frontend/backend API contracts
- `pnpm workspace + Turborepo`
- Local runner adapter using the existing `runner/evaluate.py`
- Local file storage for MVP submissions and results

Do not introduce Redis, BullMQ, MinIO, an independent FastAPI evaluator, Docker sandbox, leaderboard, WebSocket, Monaco editor, or full report/manual grading workflow during Week2 unless the user explicitly updates the plan.

---

## 4. Architecture Guardrails

- Prisma Client is backend-only.
- Frontend must not import `@prisma/client`.
- Frontend and backend must share API DTOs, enums, and schemas through `@decision-lab/shared`.
- Do not cross-import shared source by relative path such as `../../packages/shared/src`.
- API routes must follow `docs/design/BACKEND_API_DESIGN.md`.
- Submission creation must use `POST /api/v1/assignments/:id/submissions`.
- `Report` and `ManualGrade` are included in Week2 schema and shared types, but only as placeholder entry points in UI/API.
- `frontend-static` and `submission-service` are legacy Week1 artifacts. Keep them for reference, but do not build new main-platform features there.

---

## 5. Implementation Workflow

For every implementation task:

1. Read required docs.
2. Confirm the task fits the active plan.
3. Identify files to change.
4. Make focused edits.
5. Run the smallest meaningful verification.
6. Update `docs/PROJECT_STATE.md`.
7. If appropriate, update acceptance notes or plan status.
8. Use Git commit conventions in `docs/guides/GIT_WORKFLOW.md`.

If tests or builds cannot be run, record why in the final response and, when relevant, in `docs/PROJECT_STATE.md`.

---

## 6. Codex Sandbox and Permission Policy

Use the project-level Codex configuration in `.codex/config.toml` as the desired permission model:

- Default to workspace-scoped file access.
- Keep `approval_policy = "on-request"`.
- Allow network only for the project needs documented there, such as npm mirror access, GitHub access, and localhost development verification.
- Do not switch the project default to unrestricted local access such as `danger-full-access`.

When a command fails because of sandbox, DNS, localhost binding, dependency download, or dev-server restrictions:

1. Treat it as an environment/permission issue first if the same command is likely valid locally.
2. Retry the same meaningful command with scoped approval instead of changing application code or tool versions prematurely.
3. Explain the approval reason briefly and precisely.
4. If a non-sandbox or user-local run succeeds, record that distinction in the final response and, when relevant, in `docs/PROJECT_STATE.md`.

Typical commands that may need approval in this project:

- `corepack pnpm install`
- `pnpm --filter frontend build`
- `pnpm --filter frontend dev`
- `pnpm --filter backend dev`
- `curl http://localhost:<port>/...`
- GitHub remote operations such as push or repository management

---

## 7. Documentation Update Rule

Any change that affects architecture, workflow, API contract, data model, directory structure, or phase scope must update the relevant document in the same task.

Examples:

- Architecture decision changes: add or update ADR in `docs/decisions/`.
- Week2 scope changes: update `docs/plans/WEEK2_BUILD_PLAN.md`.
- Directory structure changes: update `docs/design/PROJECT_STRUCTURE.md`.
- Current progress changes: update `docs/PROJECT_STATE.md`.

---

## 8. Commit Rule

Do not create commits unless the user asks for it.

When asked to commit:

- Inspect changes first.
- Do not include unrelated local changes.
- Do not commit secrets, `.env`, caches, build output, or generated local runtime files.
- Use Conventional Commits from `docs/guides/GIT_WORKFLOW.md`.
- Prefer small commits grouped by purpose.

---

## 9. Safety Rule

Never use destructive Git or filesystem commands unless the user explicitly asks and confirms. This includes:

- `git reset --hard`
- `git checkout -- <path>`
- `rm -rf`
- Force push
- Rewriting history

Work with existing files and user changes. If user changes conflict with the requested task, ask before proceeding.
