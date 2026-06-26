CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TA', 'TEACHER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CaseCategory" AS ENUM ('LINEAR_PROGRAMMING', 'INTEGER_PROGRAMMING', 'HEURISTIC', 'META_HEURISTIC', 'REPORT_ANALYSIS');
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExerciseKind" AS ENUM ('EXACT_MODELING', 'HEURISTIC', 'REPORT', 'MIXED');
CREATE TYPE "DatasetVisibility" AS ENUM ('PUBLIC', 'HIDDEN');
CREATE TYPE "SubmissionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RUNTIME_ERROR', 'INVALID_OUTPUT');
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "student_no" TEXT,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "password_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courses" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "terms" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_sections" (
  "id" TEXT NOT NULL,
  "term_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "teacher_id" TEXT,
  CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollments" (
  "id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cases" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "category" "CaseCategory" NOT NULL DEFAULT 'LINEAR_PROGRAMMING',
  "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
  "status" "CaseStatus" NOT NULL DEFAULT 'PUBLISHED',
  "knowledge_points" JSONB NOT NULL DEFAULT '[]',
  "summary" TEXT,
  "content" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exercises" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kind" "ExerciseKind" NOT NULL,
  "entrypoint" TEXT,
  "output_schema" JSONB,
  "guide" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "datasets" (
  "id" TEXT NOT NULL,
  "exercise_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "visibility" "DatasetVisibility" NOT NULL DEFAULT 'PUBLIC',
  "path" TEXT,
  "content" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "templates" (
  "id" TEXT NOT NULL,
  "exercise_id" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'python',
  "filename" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "path" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rubrics" (
  "id" TEXT NOT NULL,
  "exercise_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "total_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "rules" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignments" (
  "id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "exercise_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "opens_at" TIMESTAMP(3),
  "due_at" TIMESTAMP(3),
  "max_attempts" INTEGER,
  "allow_late" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "submissions" (
  "id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "SubmissionStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt_number" INTEGER NOT NULL DEFAULT 1,
  "is_late" BOOLEAN NOT NULL DEFAULT false,
  "code_path" TEXT,
  "code_text" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "error_message" TEXT,
  CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "run_results" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "status" "SubmissionStatus" NOT NULL,
  "is_feasible" BOOLEAN NOT NULL DEFAULT false,
  "objective" DOUBLE PRECISION,
  "optimal_objective" DOUBLE PRECISION,
  "gap" DOUBLE PRECISION,
  "score" DOUBLE PRECISION,
  "runtime_ms" INTEGER,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "messages" JSONB NOT NULL DEFAULT '[]',
  "artifacts" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "run_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scores" (
  "id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "best_submission_id" TEXT,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "SubmissionStatus",
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
  "content" TEXT,
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manual_grades" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "grader_id" TEXT NOT NULL,
  "score_delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "manual_grades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_student_no_key" ON "users"("student_no");
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");
CREATE INDEX "terms_course_id_idx" ON "terms"("course_id");
CREATE INDEX "class_sections_term_id_idx" ON "class_sections"("term_id");
CREATE INDEX "class_sections_teacher_id_idx" ON "class_sections"("teacher_id");
CREATE UNIQUE INDEX "enrollments_section_id_user_id_key" ON "enrollments"("section_id", "user_id");
CREATE INDEX "enrollments_user_id_idx" ON "enrollments"("user_id");
CREATE UNIQUE INDEX "cases_code_key" ON "cases"("code");
CREATE INDEX "cases_course_id_idx" ON "cases"("course_id");
CREATE INDEX "exercises_case_id_idx" ON "exercises"("case_id");
CREATE UNIQUE INDEX "datasets_exercise_id_key_key" ON "datasets"("exercise_id", "key");
CREATE INDEX "datasets_exercise_id_idx" ON "datasets"("exercise_id");
CREATE INDEX "templates_exercise_id_idx" ON "templates"("exercise_id");
CREATE UNIQUE INDEX "rubrics_exercise_id_version_key" ON "rubrics"("exercise_id", "version");
CREATE UNIQUE INDEX "assignments_section_id_exercise_id_key" ON "assignments"("section_id", "exercise_id");
CREATE INDEX "assignments_exercise_id_idx" ON "assignments"("exercise_id");
CREATE INDEX "submissions_assignment_id_idx" ON "submissions"("assignment_id");
CREATE INDEX "submissions_user_id_idx" ON "submissions"("user_id");
CREATE INDEX "submissions_status_idx" ON "submissions"("status");
CREATE UNIQUE INDEX "run_results_submission_id_key" ON "run_results"("submission_id");
CREATE UNIQUE INDEX "scores_assignment_id_user_id_key" ON "scores"("assignment_id", "user_id");
CREATE INDEX "scores_section_id_idx" ON "scores"("section_id");
CREATE UNIQUE INDEX "reports_submission_id_key" ON "reports"("submission_id");
CREATE INDEX "reports_author_id_idx" ON "reports"("author_id");
CREATE INDEX "manual_grades_submission_id_idx" ON "manual_grades"("submission_id");
CREATE INDEX "manual_grades_grader_id_idx" ON "manual_grades"("grader_id");

ALTER TABLE "terms" ADD CONSTRAINT "terms_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates" ADD CONSTRAINT "templates_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "run_results" ADD CONSTRAINT "run_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scores" ADD CONSTRAINT "scores_best_submission_id_fkey" FOREIGN KEY ("best_submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_grades" ADD CONSTRAINT "manual_grades_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_grades" ADD CONSTRAINT "manual_grades_grader_id_fkey" FOREIGN KEY ("grader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
