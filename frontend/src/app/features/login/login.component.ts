import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../core/auth-state.service';

@Component({
  selector: 'dol-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="login-page">
      <div class="login-copy">
        <p class="section-kicker">Week2 MVP</p>
        <h1>进入课程实验环境</h1>
        <p>
          使用演示账号进入当前课程，查看本周实验任务，并从课程首页进入 case01。
        </p>
      </div>

      <form class="login-panel" (ngSubmit)="submit()">
        <h2>演示登录</h2>

        <label>
          学号
          <input
            name="studentNo"
            [(ngModel)]="studentNo"
            autocomplete="username"
            placeholder="demo-student"
          />
        </label>

        <label>
          密码
          <input
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            type="password"
            placeholder="演示阶段可留空"
          />
        </label>

        @if (auth.error()) {
          <p class="inline-error">{{ auth.error() }}</p>
        }

        <button class="primary-button" type="submit" [disabled]="auth.loading()">
          {{ auth.loading() ? '登录中...' : '登录' }}
        </button>
        <button class="secondary-button" type="button" [disabled]="auth.loading()" (click)="demoLogin()">
          使用演示账号
        </button>

        <a routerLink="/" class="quiet-link">暂不登录，查看课程首页</a>
      </form>
    </section>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);
  protected studentNo = 'demo-student';
  protected password = '';

  submit() {
    this.auth.login({ studentNo: this.studentNo.trim() || undefined, password: this.password }).subscribe({
      next: ({ user, tokens }) => {
        this.auth.applyLogin(user, tokens.accessToken);
        void this.router.navigateByUrl('/');
      },
      error: () => {
        this.auth.setError('登录失败，请确认后端服务和数据库已启动。');
      },
    });
  }

  demoLogin() {
    this.studentNo = 'demo-student';
    this.password = '';
    this.submit();
  }
}
