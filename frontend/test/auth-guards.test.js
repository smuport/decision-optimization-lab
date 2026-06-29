import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard, roleGuard } from '../out-tsc/app/app/core/auth.guards.js';
import { AuthStateService } from '../out-tsc/app/app/core/auth-state.service.js';

test('auth guard redirects an unauthenticated route to login with returnUrl', () => {
  const router = {
    createUrlTree: (commands, options) => ({ commands, options }),
    parseUrl: (url) => ({ url }),
  };
  const injector = createEnvironmentInjector([
    { provide: AuthStateService, useValue: { isAuthenticated: () => false } },
    { provide: Router, useValue: router },
  ]);

  const result = runInInjectionContext(injector, () => authGuard({}, { url: '/cases/case_01' }));
  assert.deepEqual(result, {
    commands: ['/auth/login'],
    options: { queryParams: { returnUrl: '/cases/case_01' } },
  });
  injector.destroy();
});

test('role guard sends a wrong role to the forbidden page', () => {
  const injector = createEnvironmentInjector([
    {
      provide: AuthStateService,
      useValue: { user: () => ({ role: 'STUDENT' }), isAuthenticated: () => true },
    },
    {
      provide: Router,
      useValue: { parseUrl: (url) => ({ url }), createUrlTree: () => ({}) },
    },
  ]);

  const result = runInInjectionContext(injector, () =>
    roleGuard({ data: { roles: ['TEACHER'] } }, { url: '/teacher' }),
  );
  assert.deepEqual(result, { url: '/forbidden' });
  injector.destroy();
});
