import { JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { SubmissionDetailResponse } from '@decision-lab/shared';
import { ApiClientService } from '../../core/api-client.service';

@Component({
  selector: 'dol-submission-detail',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  template: `
    <section class="submission-detail-page">
      @if (loading()) {
        <div class="status-strip">正在读取提交详情...</div>
      } @else if (error()) {
        <div class="status-strip error">{{ error() }}</div>
      } @else if (submission()) {
        <header class="page-heading">
          <div>
            <p class="section-kicker">{{ submission()?.exercise?.caseCode }} · 第 {{ submission()?.attemptNumber }} 次提交</p>
            <h1>{{ submission()?.exercise?.title }}</h1>
            <p>提交于 {{ formatDate(submission()?.submittedAt) }} · {{ submission()?.isLate ? '迟交' : '按时提交' }}</p>
          </div>
          <div class="hero-actions">
            <a class="secondary-button" routerLink="/">返回课程首页</a>
            <a class="primary-button" [routerLink]="['/exercises', submission()?.exercise?.id, 'workspace']">返回工作区</a>
          </div>
        </header>

        <div class="submission-summary-grid">
          <section class="metric-card"><span>状态</span><strong>{{ statusText(submission()?.status) }}</strong></section>
          <section class="metric-card"><span>分数</span><strong>{{ formatNumber(submission()?.result?.score) }}</strong></section>
          <section class="metric-card"><span>目标值</span><strong>{{ formatNumber(submission()?.result?.objective) }}</strong></section>
          <section class="metric-card"><span>GAP</span><strong>{{ formatGap(submission()?.result?.gap) }}</strong></section>
        </div>

        <div class="submission-detail-layout">
          <div>
            <section class="content-band submission-section">
              <div class="band-heading"><div><p class="section-kicker">提交代码</p><h2>只读回显</h2></div></div>
              <pre class="code-block"><code>{{ submission()?.codeText ?? '未保存代码文本' }}</code></pre>
            </section>

            <section class="content-band submission-section">
              <div class="band-heading"><div><p class="section-kicker">结构化结果</p><h2>评测摘要</h2></div></div>
              <dl class="detail-list result-detail-list">
                <div><dt>最优目标值</dt><dd>{{ formatNumber(submission()?.result?.optimalObjective) }}</dd></div>
                <div><dt>可行性</dt><dd>{{ submission()?.result?.isFeasible ? '可行' : '未通过' }}</dd></div>
                <div><dt>完成时间</dt><dd>{{ formatDate(submission()?.completedAt) }}</dd></div>
              </dl>
              <div class="message-list">
                <h3>评测消息</h3>
                @for (message of submission()?.result?.messages ?? []; track $index) {
                  <p>{{ message }}</p>
                } @empty {
                  <p>评测器未返回额外消息。</p>
                }
              </div>
            </section>
          </div>

          <aside>
            <section class="content-band submission-section">
              <p class="section-kicker">Metrics</p>
              <h2>指标摘要</h2>
              <pre class="json-summary">{{ submission()?.result?.metrics | json }}</pre>
            </section>
            <section class="content-band submission-section">
              <p class="section-kicker">Artifacts</p>
              <h2>产物摘要</h2>
              <pre class="json-summary">{{ submission()?.result?.artifacts | json }}</pre>
            </section>
            <section class="content-band submission-section report-placeholder">
              <h2>实验报告</h2>
              <p>报告入口已预留，将在后续版本开放编辑与提交。</p>
              <button class="secondary-button full-width" type="button" disabled>报告功能待开放</button>
            </section>
          </aside>
        </div>
      }
    </section>
  `,
})
export class SubmissionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClientService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submission = signal<SubmissionDetailResponse | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('submissionId');
    if (!id) {
      this.error.set('缺少提交编号。');
      this.loading.set(false);
      return;
    }

    this.api.submission(id).subscribe({
      next: (submission) => {
        this.submission.set(submission);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('提交详情读取失败，请确认提交编号和后端服务状态。');
        this.loading.set(false);
      },
    });
  }

  protected statusText(status?: string) {
    const labels: Record<string, string> = {
      QUEUED: '排队中', RUNNING: '评测中', SUCCESS: '评测通过', FAILED: '评测失败',
      RUNTIME_ERROR: '运行错误', INVALID_OUTPUT: '输出无效',
    };
    return status ? labels[status] ?? status : '-';
  }

  protected formatNumber(value?: number) {
    return value === undefined ? '-' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value);
  }

  protected formatGap(value?: number) {
    return value === undefined ? '-' : `${this.formatNumber(value * 100)}%`;
  }

  protected formatDate(value?: string) {
    return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
  }
}
