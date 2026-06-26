import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'dol-workspace-placeholder',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="content-band">
      <p class="section-kicker">实验工作区</p>
      <h1>工作区将在 Day6 实现</h1>
      <p>
        当前入口已保留，实验编号为 {{ exerciseId }}。Day6 将在这里加入题目侧栏、代码 textarea、数据集选择、
        提交按钮、评测结果面板和报告入口占位。
      </p>
      <a class="primary-button" routerLink="/cases/case_01">返回 case01 详情</a>
    </section>
  `,
})
export class WorkspacePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly exerciseId = this.route.snapshot.paramMap.get('exerciseId') ?? 'unknown';
}
