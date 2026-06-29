CREATE TYPE "CaseReleaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExerciseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

ALTER TABLE "exercises"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "status" "ExerciseStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "asset_path" TEXT;

UPDATE "exercises"
SET
  "code" = CASE
    WHEN "id" = 'exercise-case01-production-planning' THEN 'production_planning'
    ELSE 'legacy_' || replace("id", '-', '_')
  END,
  "status" = 'PUBLISHED',
  "asset_path" = CASE
    WHEN "id" = 'exercise-case01-production-planning' THEN 'course-assets/cases/case_01'
    ELSE 'course-assets/cases/' || replace("case_id", '-', '_')
  END;

ALTER TABLE "exercises"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "asset_path" SET NOT NULL;

ALTER TABLE "assignments"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "published_at" TIMESTAMP(3),
  ADD COLUMN "created_by_id" TEXT;

UPDATE "assignments" AS assignment
SET
  "status" = 'PUBLISHED',
  "published_at" = COALESCE(assignment."opens_at", CURRENT_TIMESTAMP),
  "created_by_id" = section."teacher_id"
FROM "class_sections" AS section
WHERE assignment."section_id" = section."id";

UPDATE "assignments"
SET "created_by_id" = (
  SELECT "id"
  FROM "users"
  WHERE "email" = 'teacher.demo@decision-lab.local'
  LIMIT 1
)
WHERE "created_by_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "assignments" WHERE "created_by_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill assignments.created_by_id: assignment section has no teacher';
  END IF;
END $$;

ALTER TABLE "assignments" ALTER COLUMN "created_by_id" SET NOT NULL;

UPDATE "cases" SET "status" = 'PUBLISHED' WHERE "code" = 'case_01';
ALTER TABLE "cases" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE "section_case_releases" (
  "id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "status" "CaseReleaseStatus" NOT NULL DEFAULT 'DRAFT',
  "visible_from" TIMESTAMP(3),
  "visible_until" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "section_case_releases_pkey" PRIMARY KEY ("id")
);

INSERT INTO "section_case_releases" (
  "id",
  "section_id",
  "case_id",
  "status",
  "visible_from",
  "sort_order",
  "published_at",
  "created_by_id"
)
SELECT
  'week3-release-' || md5(assignment."section_id" || ':' || exercise."case_id"),
  assignment."section_id",
  exercise."case_id",
  'PUBLISHED',
  MIN(assignment."opens_at"),
  case_record."sort_order",
  MIN(COALESCE(assignment."published_at", assignment."opens_at", CURRENT_TIMESTAMP)),
  section."teacher_id"
FROM "assignments" AS assignment
JOIN "exercises" AS exercise ON exercise."id" = assignment."exercise_id"
JOIN "cases" AS case_record ON case_record."id" = exercise."case_id"
JOIN "class_sections" AS section ON section."id" = assignment."section_id"
WHERE section."teacher_id" IS NOT NULL
GROUP BY assignment."section_id", exercise."case_id", case_record."sort_order", section."teacher_id";

DROP INDEX "assignments_section_id_exercise_id_key";

CREATE UNIQUE INDEX "exercises_case_id_code_key" ON "exercises"("case_id", "code");
CREATE UNIQUE INDEX "section_case_releases_section_id_case_id_key" ON "section_case_releases"("section_id", "case_id");
CREATE INDEX "section_case_releases_case_id_idx" ON "section_case_releases"("case_id");
CREATE INDEX "section_case_releases_created_by_id_idx" ON "section_case_releases"("created_by_id");
CREATE INDEX "section_case_releases_section_id_status_idx" ON "section_case_releases"("section_id", "status");
CREATE INDEX "assignments_section_id_idx" ON "assignments"("section_id");
CREATE INDEX "assignments_section_id_exercise_id_idx" ON "assignments"("section_id", "exercise_id");
CREATE INDEX "assignments_created_by_id_idx" ON "assignments"("created_by_id");

ALTER TABLE "section_case_releases" ADD CONSTRAINT "section_case_releases_section_id_fkey"
  FOREIGN KEY ("section_id") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "section_case_releases" ADD CONSTRAINT "section_case_releases_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "section_case_releases" ADD CONSTRAINT "section_case_releases_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignments" DROP CONSTRAINT "assignments_exercise_id_fkey";
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_exercise_id_fkey"
  FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
