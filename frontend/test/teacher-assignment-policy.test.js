import assert from 'node:assert/strict';
import test from 'node:test';
import { canArchiveAssignment, canCloseAssignment, canEditAssignment, canPublishAssignment, validAssignmentWindow } from '../out-tsc/app/app/features/teacher/teacher-assignment-policy.js';

test('assignment window accepts open bounds and rejects inversion', () => {
  assert.equal(validAssignmentWindow('', ''), true);
  assert.equal(validAssignmentWindow('2026-07-01T08:00', '2026-07-02T08:00'), true);
  assert.equal(validAssignmentWindow('2026-07-03T08:00', '2026-07-02T08:00'), false);
});

test('assignment actions follow the strict state machine and readiness', () => {
  assert.equal(canEditAssignment('DRAFT'), true);
  assert.equal(canPublishAssignment('DRAFT', false), false);
  assert.equal(canPublishAssignment('DRAFT', true), true);
  assert.equal(canCloseAssignment('PUBLISHED'), true);
  assert.equal(canArchiveAssignment('CLOSED'), true);
  assert.equal(canArchiveAssignment('PUBLISHED'), false);
});
