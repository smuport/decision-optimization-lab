import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyWorkspaceTarget } from '../out-tsc/app/app/features/workspace/legacy-workspace-policy.js';

const assignment = (id, exerciseId) => ({ id, exercise: { id: exerciseId } });

test('legacy workspace redirects a unique assignment match', () => {
  assert.deepEqual(legacyWorkspaceTarget([assignment('a1', 'e1')], 'e1'), { commands: ['/assignments', 'a1', 'workspace'], notice: undefined });
});

test('legacy workspace sends no match and multiple matches to assignment selection', () => {
  assert.match(legacyWorkspaceTarget([], 'e1').notice, /没有找到/);
  assert.match(legacyWorkspaceTarget([assignment('a1', 'e1'), assignment('a2', 'e1')], 'e1').notice, /多个作业/);
});
