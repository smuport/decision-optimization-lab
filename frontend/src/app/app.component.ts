import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStateService } from './core/auth-state.service';

@Component({
  selector: 'dol-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" [routerLink]="auth.homePath()" aria-label="返回首页">
          <span class="brand-mark">DOL</span>
          <span>
            <strong>决策与优化实验平台</strong>
            <small>工程系统决策与优化</small>
          </span>
        </a>

        <nav class="topnav" aria-label="主导航">
          @if (auth.user()?.role === 'STUDENT') {
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">课程</a>
            <a routerLink="/cases/case_01" routerLinkActive="active">案例</a>
          } @else if (auth.user()?.role === 'TEACHER') {
            <a routerLink="/teacher" routerLinkActive="active">教学班管理</a>
          } @else if (auth.user()?.role === 'ADMIN') {
            <a routerLink="/admin/cases" routerLinkActive="active">内容管理</a>
          }
        </nav>

        <div class="account">
          @if (auth.isAuthenticated()) {
            <span>{{ auth.user()?.name }} · {{ roleLabel() }}</span>
            <button type="button" class="ghost-button" (click)="logout()">退出</button>
          } @else {
            <a class="primary-link" routerLink="/auth/login">登录</a>
          }
        </div>
      </header>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  protected roleLabel() {
    const labels = { STUDENT: '学生', TEACHER: '教师', ADMIN: '管理员', TA: '助教' } as const;
    const role = this.auth.user()?.role;
    return role ? labels[role] : '';
  }
}
