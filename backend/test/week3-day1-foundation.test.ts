import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  ASSIGNMENT_AVAILABILITIES,
  ASSIGNMENT_STATUSES,
  CASE_RELEASE_STATUSES,
  EXERCISE_STATUSES,
  CreateAssignmentRequestSchema,
  CreateCaseReleaseRequestSchema,
} from '@decision-lab/shared';

const rootDir = resolve(__dirname, '..', '..');

test('Week3 management enums expose the documented values', () => {
  assert.deepEqual(CASE_RELEASE_STATUSES, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
  assert.deepEqual(EXERCISE_STATUSES, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
  assert.deepEqual(ASSIGNMENT_STATUSES, ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']);
  assert.deepEqual(ASSIGNMENT_AVAILABILITIES, ['UPCOMING', 'OPEN', 'LATE', 'CLOSED']);
});

test('Week3 request schemas enforce release and assignment windows', () => {
  assert.equal(
    CreateCaseReleaseRequestSchema.safeParse({
      caseId: 'case-01',
      visibleFrom: '2026-06-29T00:00:00.000Z',
      visibleUntil: '2026-06-30T00:00:00.000Z',
    }).success,
    true,
  );
  assert.equal(
    CreateCaseReleaseRequestSchema.safeParse({
      caseId: 'case-01',
      visibleFrom: '2026-07-01T00:00:00.000Z',
      visibleUntil: '2026-06-30T00:00:00.000Z',
    }).success,
    false,
  );
  assert.equal(
    CreateAssignmentRequestSchema.safeParse({
      exerciseId: 'exercise-01',
      title: 'Production planning',
      maxAttempts: 0,
    }).success,
    false,
  );
});

test('Week3 migration preserves assignment ids while replacing the old unique constraint', () => {
  const migration = readFileSync(
    resolve(
      rootDir,
      'backend/prisma/migrations/20260629000000_week3_day1_management_foundation/migration.sql',
    ),
    'utf8',
  );

  assert.match(migration, /UPDATE "assignments" AS assignment/);
  assert.match(migration, /"created_by_id" = section\."teacher_id"/);
  assert.match(migration, /DROP INDEX "assignments_section_id_exercise_id_key"/);
  assert.match(migration, /CREATE INDEX "assignments_section_id_exercise_id_idx"/);
  assert.doesNotMatch(migration, /UPDATE "submissions"/);
  assert.doesNotMatch(migration, /DELETE FROM "submissions"/);
});
