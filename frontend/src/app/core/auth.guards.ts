import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import type { UserRole } from '@decision-lab/shared';
import { AuthStateService } from './auth-state.service';
import { canAccessRole } from './auth-policy';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  const roles = (route.data['roles'] ?? []) as UserRole[];
  return canAccessRole(auth.user()?.role, roles) ? true : router.parseUrl('/forbidden');
};
