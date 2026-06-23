# ADR-0004: GitHub and AI Collaboration Safety

Date: 2026-06-23

Status: Accepted

---

## Context

The user wants Codex to help manage a public GitHub repository under the `smuport` organization. Remote repository operations involve authentication, visibility, and long-term project history.

---

## Decision

Use the user's local GitHub CLI authentication. Do not send passwords, tokens, or 2FA codes in chat.

Repository operations must follow:

- User completes `gh auth login` locally.
- Codex uses local `gh` and `git` commands only after confirmation.
- Public repository creation under `smuport` requires explicit confirmation of repository name and visibility.
- Commits follow `docs/guides/GIT_WORKFLOW.md`.
- No automatic force push or history rewrite.

---

## Consequences

Benefits:

- Minimal credential exposure.
- Clear audit trail.
- User retains account and organization control.
- Codex can still perform ordinary repository setup and commits.

Tradeoffs:

- First-time authentication requires user action.
- Some organization permissions may need user-side configuration.

---

## Follow-Up

Before creating the GitHub repository, confirm:

- Repository owner: `smuport`
- Repository name
- Visibility: public
- Initial branch: `main`
- First commit message

