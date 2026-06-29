import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ACCESS_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT, USER_KEY } from './auth-state.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem(ACCESS_TOKEN_KEY);
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.endsWith('/auth/login')
      ) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
        }
        void router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
