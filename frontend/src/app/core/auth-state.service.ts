import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, finalize } from 'rxjs';
import type { AuthLoginRequest, UserDto } from '@decision-lab/shared';
import { ApiClientService } from './api-client.service';
import { homePathForRole } from './auth-policy';

export const ACCESS_TOKEN_KEY = 'decision-lab.access-token';
export const USER_KEY = 'decision-lab.user';
export const AUTH_UNAUTHORIZED_EVENT = 'decision-lab:unauthorized';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly api = inject(ApiClientService);
  private readonly userSignal = signal<UserDto | null>(this.readUser());
  private readonly tokenSignal = signal<string | null>(this.readStorage(ACCESS_TOKEN_KEY));
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userSignal() && this.tokenSignal()));

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_UNAUTHORIZED_EVENT, () => this.logout());
    }
  }

  async restore() {
    if (!this.tokenSignal()) {
      this.userSignal.set(null);
      this.ready.set(true);
      return;
    }

    try {
      const user = await firstValueFrom(this.api.me());
      this.userSignal.set(user);
      this.writeStorage(USER_KEY, JSON.stringify(user));
    } catch {
      this.logout();
    } finally {
      this.ready.set(true);
    }
  }

  login(body: AuthLoginRequest) {
    this.loading.set(true);
    this.error.set(null);

    return this.api.login(body).pipe(
      finalize(() => this.loading.set(false)),
    );
  }

  applyLogin(user: UserDto, accessToken: string) {
    this.userSignal.set(user);
    this.tokenSignal.set(accessToken);
    this.writeStorage(USER_KEY, JSON.stringify(user));
    this.writeStorage(ACCESS_TOKEN_KEY, accessToken);
  }

  logout() {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    this.removeStorage(USER_KEY);
    this.removeStorage(ACCESS_TOKEN_KEY);
  }

  setError(message: string) {
    this.error.set(message);
  }

  homePath() {
    return homePathForRole(this.userSignal()?.role);
  }

  private readUser() {
    const raw = this.readStorage(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserDto;
    } catch {
      this.removeStorage(USER_KEY);
      return null;
    }
  }

  private readStorage(key: string) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private removeStorage(key: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}
