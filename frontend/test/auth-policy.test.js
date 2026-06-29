import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessRole,
  canUseReturnUrl,
  homePathForRole,
} from '../out-tsc/app/app/core/auth-policy.js';

test('role home paths lead to the correct control plane', () => {
  assert.equal(homePathForRole('STUDENT'), '/');
  assert.equal(homePathForRole('TEACHER'), '/teacher');
  assert.equal(homePathForRole('ADMIN'), '/admin/cases');
});

test('role policy rejects cross-role routes', () => {
  assert.equal(canAccessRole('STUDENT', ['STUDENT']), true);
  assert.equal(canAccessRole('STUDENT', ['TEACHER']), false);
  assert.equal(canAccessRole('TEACHER', ['ADMIN']), false);
  assert.equal(canAccessRole('ADMIN', ['ADMIN']), true);
});

test('return URLs stay inside the authenticated role area', () => {
  assert.equal(canUseReturnUrl('ADMIN', '/admin/cases'), true);
  assert.equal(canUseReturnUrl('ADMIN', '/teacher'), false);
  assert.equal(canUseReturnUrl('TEACHER', '/teacher'), true);
  assert.equal(canUseReturnUrl('TEACHER', '/teacher/sections/one'), true);
  assert.equal(canUseReturnUrl('STUDENT', '/cases/case_01'), true);
  assert.equal(canUseReturnUrl('STUDENT', '/admin/cases'), false);
  assert.equal(canUseReturnUrl('STUDENT', '//external.example'), false);
});
