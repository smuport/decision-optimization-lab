# ADR-0002: Monorepo Strategy

Date: 2026-06-23

Status: Accepted

---

## Context

The project has a frontend app, backend app, shared TypeScript contracts, Python runner, and course assets. The user considered Nx, but the current project is still early-stage and should avoid heavy tooling before the MVP is stable.

---

## Decision

Use `pnpm workspace + Turborepo` for the MVP stage.

```text
pnpm workspace = local package management
Turborepo      = task orchestration and caching
Nx             = possible later migration
```

Keep the repository Nx-friendly by maintaining:

- Project-level `package.json` files.
- Consistent scripts: `dev`, `build`, `typecheck`, `test`, `lint`.
- Root `tsconfig.base.json`.
- Package-name imports for shared code.

---

## Consequences

Benefits:

- Lightweight setup.
- Easy local package linking through `workspace:*`.
- Simple transition from current skeleton to real Angular/NestJS apps.
- Future Nx migration remains possible.

Tradeoffs:

- Turborepo does not enforce module boundaries like Nx.
- Angular/NestJS generators are not centrally managed.
- More conventions must be documented and followed manually.

---

## Follow-Up

Reconsider Nx after:

- More apps/packages are added.
- CI needs affected builds.
- Module boundary enforcement becomes necessary.
- Angular/NestJS generation patterns need standardization.

