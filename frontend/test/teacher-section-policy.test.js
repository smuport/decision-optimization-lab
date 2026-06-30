import assert from 'node:assert/strict';
import test from 'node:test';
import { canPublishCaseSelection, hasValidReleaseWindow, toggleReleaseSelection } from '../out-tsc/app/app/features/teacher/teacher-section-policy.js';

test('release window accepts open bounds and rejects inverted dates', () => {
  assert.equal(hasValidReleaseWindow('', ''), true);
  assert.equal(hasValidReleaseWindow('2026-07-01T08:00', '2026-07-01T08:00'), true);
  assert.equal(hasValidReleaseWindow('2026-07-02T08:00', '2026-07-01T08:00'), false);
});

test('case selection is immutable and publishing requires a selection', () => {
  const initial = new Set(['case-1']);
  const removed = toggleReleaseSelection(initial, 'case-1');
  const added = toggleReleaseSelection(removed, 'case-2');
  assert.deepEqual([...initial], ['case-1']);
  assert.equal(removed.size, 0);
  assert.deepEqual([...added], ['case-2']);
  assert.equal(canPublishCaseSelection(added, false), true);
  assert.equal(canPublishCaseSelection(added, true), false);
  assert.equal(canPublishCaseSelection(new Set(), false), false);
});
