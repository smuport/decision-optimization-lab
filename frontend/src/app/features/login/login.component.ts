import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { ApiError, UserRole } from '@decision-lab/shared';
import { AuthStateService } from '../../core/auth-state.service';
import { canUseReturnUrl } from '../../core/auth-policy';

const DEMO_ACCOUNTS: Record<'student' | 'teacher' | 'admin', string> = {
  student: 'S2026001',
  teacher: 'teacher.demo@decision-lab.local',
  admin: 'admin.demo@decision-lab.local',
};

@Component({
  selector: 'dol-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="login-page">
      <div class="login-copy">
        <p class="section-kicker">工程系统决策与优化</p>
        <h1>进入课程实验环境</h1>
        <p>使用课程账号访问所属教学班、案例和作业。</p>
      </div>

      <form class="login-panel" (ngSubmit)="submit()">
        <h2>账号登录</h2>

        <label>
          学号或邮箱
          <input name="identifier" [(ngModel)]="identifier" autocomplete="username" />
        </label>

        <label>
          密码
          <input
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            type="password"
          />
        </label>

        <label>
          演示身份
          <select name="demoRole" [(ngModel)]="demoRole" (ngModelChange)="useDemoAccount()">
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
        </label>

        @if (auth.error()) {
          <p class="inline-error">{{ auth.error() }}</p>
        }

        <button class="primary-button" type="submit" [disabled]="auth.loading()">
          {{ auth.loading() ? '登录中...' : '登录' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected identifier = DEMO_ACCOUNTS.student;
  protected password = 'DecisionLab2026!';
  protected demoRole: 'student' | 'teacher' | 'admin' = 'student';

  protected useDemoAccount() {
    this.identifier = DEMO_ACCOUNTS[this.demoRole];
    this.password = 'DecisionLab2026!';
  }

  protected submit() {
    const identifier = this.identifier.trim();
    const body = identifier.includes('@')
      ? { email: identifier, password: this.password }
      : { studentNo: identifier, password: this.password };

    this.auth.login(body).subscribe({
      next: ({ user, tokens }) => {
        this.auth.applyLogin(user, tokens.accessToken);
        const returnUrl = this.allowedReturnUrl(user.role);
        void this.router.navigateByUrl(returnUrl ?? this.auth.homePath());
      },
      error: (error: unknown) => {
        const body = error instanceof HttpErrorResponse ? (error.error as ApiError | undefined) : undefined;
        this.auth.setError(body?.message ?? '登录失败，请检查账号和密码。');
      },
    });
  }

  private allowedReturnUrl(role: UserRole) {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl && canUseReturnUrl(role, returnUrl) ? returnUrl : undefined;
  }
}
