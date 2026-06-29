BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "exercises" AS exercise
    JOIN "cases" AS case_record ON case_record."id" = exercise."case_id"
    WHERE case_record."code" = 'case_01'
      AND case_record."status" = 'PUBLISHED'
      AND exercise."code" = 'production_planning'
      AND exercise."status" = 'PUBLISHED'
      AND exercise."asset_path" = 'course-assets/cases/case_01'
  ) THEN
    RAISE EXCEPTION 'case01 exercise backfill is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "submissions" AS submission
    LEFT JOIN "assignments" AS assignment ON assignment."id" = submission."assignment_id"
    WHERE assignment."id" IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "run_results" AS result
    LEFT JOIN "submissions" AS submission ON submission."id" = result."submission_id"
    WHERE submission."id" IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "scores" AS score
    LEFT JOIN "assignments" AS assignment ON assignment."id" = score."assignment_id"
    WHERE assignment."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Week2 submission, result, or score relation is broken';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "assignments" AS assignment
    JOIN "exercises" AS exercise ON exercise."id" = assignment."exercise_id"
    JOIN "section_case_releases" AS release
      ON release."section_id" = assignment."section_id"
      AND release."case_id" = exercise."case_id"
    JOIN "users" AS creator ON creator."id" = assignment."created_by_id"
    WHERE assignment."section_id" = 'section-2026-graduate-demo'
      AND assignment."status" = 'PUBLISHED'
      AND release."status" = 'PUBLISHED'
      AND creator."role" IN ('TEACHER', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'demo assignment is not connected to its release and creator';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "section_case_releases"
    WHERE "section_id" = 'section-2026-visibility-demo'
  ) THEN
    RAISE EXCEPTION 'visibility control section must not receive a case release';
  END IF;
END $$;

INSERT INTO "assignments" (
  "id", "section_id", "exercise_id", "title", "status", "allow_late", "created_by_id"
)
SELECT
  'week3-day1-duplicate-assignment-check',
  assignment."section_id",
  assignment."exercise_id",
  'Week3 Day1 duplicate exercise check',
  'DRAFT',
  false,
  assignment."created_by_id"
FROM "assignments" AS assignment
WHERE assignment."section_id" = 'section-2026-graduate-demo'
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "assignments" WHERE "id" = 'week3-day1-duplicate-assignment-check'
  ) THEN
    RAISE EXCEPTION 'same exercise cannot be assigned to the same section more than once';
  END IF;
END $$;

ROLLBACK;
