import assert from 'node:assert/strict';
import test from 'node:test';
import { canArchiveExercise, canPublishExercise, parseJsonObject } from '../out-tsc/app/app/features/admin/exercises/admin-exercise-form-policy.js';

const exercise = { status: 'DRAFT', resourceCheck: { ready: true } };

test('Exercise actions require ready resources and a clean form', () => {
  assert.equal(canPublishExercise(exercise, false), true);
  assert.equal(canPublishExercise({ ...exercise, resourceCheck: { ready: false } }, false), false);
  assert.equal(canPublishExercise(exercise, true), false);
  assert.equal(canArchiveExercise('PUBLISHED', false), true);
  assert.equal(canArchiveExercise('PUBLISHED', true), false);
});

test('Exercise JSON fields only accept JSON objects', () => {
  assert.deepEqual(parseJsonObject('{"objective":"number"}', 'Output schema'), { objective: 'number' });
  assert.throws(() => parseJsonObject('[]', 'Output schema'), /JSON 对象/);
  assert.throws(() => parseJsonObject('{', 'Output schema'), /JSON 对象/);
});
