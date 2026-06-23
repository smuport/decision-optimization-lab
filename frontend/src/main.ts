import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import type { ApiResponse } from '@decision-lab/shared';

const health: ApiResponse<{ status: 'ready' }> = {
  code: 0,
  message: 'Day1 frontend shell ready',
  data: { status: 'ready' },
  timestamp: new Date().toISOString(),
};

@Component({
  selector: 'dol-root',
  standalone: true,
  template: `
    <main class="shell">
      <section class="masthead">
        <p class="eyebrow">工程系统决策与优化</p>
        <h1>决策与优化实验平台</h1>
        <p class="summary">
          Week2 Day1 已进入 Angular + NestJS + shared package 的平台骨架阶段。
        </p>
      </section>

      <section class="status-panel" aria-label="平台状态">
        <h2>当前骨架</h2>
        <ul>
          <li>Angular 前端入口已初始化</li>
          <li>NestJS 后端健康检查接口已初始化</li>
          <li>前后台共享类型来自 @decision-lab/shared</li>
        </ul>
        <pre>{{ healthText }}</pre>
      </section>
    </main>
  `,
})
class AppComponent {
  protected readonly healthText = JSON.stringify(health, null, 2);
}

bootstrapApplication(AppComponent).catch((error) => console.error(error));
