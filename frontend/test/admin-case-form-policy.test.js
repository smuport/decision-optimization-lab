import assert from 'node:assert/strict';
import test from 'node:test';
import { canArchiveCase, canPublishCase, shouldConfirmCaseExit } from '../out-tsc/app/app/features/admin/cases/admin-case-form-policy.js';

test('case actions follow status and dirty-form rules', () => {
  assert.equal(canPublishCase({ status: 'DRAFT', title: '案例' }, false), true);
  assert.equal(canPublishCase({ status: 'DRAFT', title: '案例' }, true), false);
  assert.equal(canPublishCase({ status: 'ARCHIVED', title: '案例' }, false), false);
  assert.equal(canArchiveCase('PUBLISHED', false), true);
  assert.equal(canArchiveCase('PUBLISHED', true), false);
  assert.equal(canArchiveCase('ARCHIVED', false), false);
});

test('dirty case forms ask before leaving', () => {
  let confirmations = 0;
  globalThis.window = { confirm: () => { confirmations += 1; return false; } };
  assert.equal(shouldConfirmCaseExit(false), true);
  assert.equal(confirmations, 0);
  assert.equal(shouldConfirmCaseExit(true), false);
  assert.equal(confirmations, 1);
});
