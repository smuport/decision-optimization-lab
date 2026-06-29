import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStateService } from '../../core/auth-state.service';

@Component({
  selector: 'dol-access-status',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="status-page">
      <p class="section-kicker">{{ statusCode }}</p>
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <a class="primary-button" [routerLink]="target">{{ action }}</a>
    </section>
  `,
})
export class AccessStatusComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStateService);
  protected readonly statusCode = Number(this.route.snapshot.data['status'] ?? 403);
  protected readonly title = this.statusCode === 401 ? '登录已失效' : this.statusCode === 404 ? '页面不存在' : '无权访问';
  protected readonly message =
    this.statusCode === 401
      ? '请重新登录后继续。'
      : this.statusCode === 404
        ? '请求的页面不存在。'
        : '当前账号角色或教学班归属不允许访问此页面。';
  protected readonly target = this.statusCode === 401 ? '/auth/login' : this.auth.homePath();
  protected readonly action = this.statusCode === 401 ? '重新登录' : '返回首页';
}
