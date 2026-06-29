# ADR-0005: Case, Exercise, Section Release, and Assignment Model

Date: 2026-06-28

Status: Accepted

---

## Context

Week2 proved a fixed-seed case01 submission loop, but the platform cannot yet express who maintains shared content, which teaching class can read a case, or which exercise is published as an assignment. Treating Case as content, downloadable resources, and assignment at the same time breaks when one Case contains multiple Exercises or different sections use different teaching schedules.

## Decision

Use four separate responsibilities:

```text
Case
= shared course content

Exercise
= executable and assessable task under a Case

SectionCaseRelease
= permission for one ClassSection to read one Case

Assignment
= publication of one Exercise to one ClassSection
```

The ownership model is:

```text
Case 1 ── N Exercise
Exercise 1 ── N Dataset / Template / Rubric
ClassSection N ── N Case through SectionCaseRelease
ClassSection 1 ── N Assignment N ── 1 Exercise
```

ADMIN maintains shared Case and Exercise metadata. TEACHER manages releases and assignments only for sections they teach. STUDENT has no public case catalog and can only read cases released to an ACTIVE enrollment section.

Exercise owns downloadable resources. Assignment references Exercise and adds section, schedule, attempt, and late-submission rules. Templates, datasets, rubric files, and validators remain repository-managed in Week3.

## Consequences

Benefits:

- Case reading visibility is independent from assignment availability.
- One Case can contain multiple Exercises.
- Different sections can publish the same Exercise with different rules.
- Closing an Assignment does not remove Case content or submission history.
- Exercise resource packages have a single owner and stable contract.

Tradeoffs:

- Adds a SectionCaseRelease table and management flow.
- Student APIs must be current-user scoped instead of returning all Exercises.
- Existing case01 assets and workspace routes need a compatibility migration.
- Publishing an Assignment requires cross-entity validation.

## Follow-Up

- Add Week3 schema, shared DTOs, API guards, ADMIN/TEACHER pages, and student visibility tests.
- Move case01 exercise assets under an Exercise directory without breaking Week2 history.
- Keep legacy Case-centric API examples marked as superseded until removed from documentation and code.
