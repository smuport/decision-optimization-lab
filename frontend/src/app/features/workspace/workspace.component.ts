import { JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ExerciseDetail, RunResultDto, TemplateDto } from '@decision-lab/shared';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { ApiClientService } from '../../core/api-client.service';
import { saveDownload } from '../../core/file-download';

@Component({
  selector: 'dol-workspace',
  standalone: true,
  imports: [FormsModule, JsonPipe, RouterLink],
  template: `
    <section class="workspace-page">
      @if (loading()) {
        <div class="status-strip">正在准备实验工作区...</div>
      } @else if (loadError()) {
        <div class="status-strip error">{{ loadError() }}</div>
      } @else if (exercise()) {
        <header class="workspace-header">
          <div>
            <p class="section-kicker">{{ exercise()?.case?.code }} · 实验工作区</p>
            <h1>{{ exercise()?.title }}</h1>
            <p>{{ exercise()?.case?.summary }}</p>
          </div>
          <div class="workspace-header-actions">
            <a class="secondary-button" [routerLink]="['/cases', exercise()?.case?.code]">查看教学指南</a>
            <button class="secondary-button" type="button" (click)="downloadResources()">下载练习资源包</button>
          </div>
        </header>

        <div class="workspace-layout">
          <aside class="workspace-sidebar">
            <section>
              <p class="section-kicker">任务信息</p>
              <h2>{{ exercise()?.assignment?.title ?? '练习任务' }}</h2>
              <dl class="detail-list">
                <div><dt>入口函数</dt><dd>{{ exercise()?.entrypoint ?? 'solve' }}</dd></div>
                <div><dt>最多提交</dt><dd>{{ exercise()?.assignment?.maxAttempts ?? '不限' }}</dd></div>
                <div><dt>总分</dt><dd>{{ exercise()?.rubric?.totalScore ?? 100 }}</dd></div>
              </dl>
            </section>

            <section>
              <h3>公开数据集</h3>
              <label>
                本次评测数据集
                <select [(ngModel)]="datasetKey">
                  @for (dataset of exercise()?.datasets ?? []; track dataset.id) {
                    <option [value]="dataset.key">{{ dataset.label }}</option>
                  }
                </select>
              </label>
            </section>

            <section>
              <h3>输入输出规范</h3>
              <pre class="json-summary">{{ exercise()?.outputSchema | json }}</pre>
            </section>

            <section>
              <h3>评分规则</h3>
              <pre class="json-summary">{{ exercise()?.rubric?.rules | json }}</pre>
            </section>
          </aside>

          <section class="workspace-editor">
            <div class="panel-toolbar">
              <div>
                <strong>{{ template()?.filename ?? 'solution.py' }}</strong>
                <span>{{ draftState() }}</span>
              </div>
              <button class="secondary-button" type="button" (click)="resetTemplate()">重置模板</button>
            </div>
            <textarea
              class="code-editor"
              aria-label="Python 提交代码"
              spellcheck="false"
              [(ngModel)]="code"
              (ngModelChange)="saveDraft($event)"
            ></textarea>
            <div class="submit-bar">
              <span>使用 {{ datasetKey }} 数据集进行同步评测</span>
              <button class="primary-button" type="button" [disabled]="submitting() || !code.trim()" (click)="submit()">
                {{ submitting() ? '评测中...' : '提交评测' }}
              </button>
            </div>
          </section>

          <aside class="workspace-results">
            <div class="panel-toolbar">
              <div>
                <strong>评测结果</strong>
                <span>{{ result() ? statusText(result()?.status) : '等待提交' }}</span>
              </div>
            </div>

            @if (submitError()) {
              <div class="result-empty error">{{ submitError() }}</div>
            } @else if (result()) {
              <div class="result-status" [class.success]="result()?.status === 'SUCCESS'">
                <span>{{ statusText(result()?.status) }}</span>
                <strong>{{ formatScore(result()?.score) }}</strong>
              </div>
              <dl class="detail-list result-metrics">
                <div><dt>目标值</dt><dd>{{ formatNumber(result()?.objective) }}</dd></div>
                <div><dt>最优值</dt><dd>{{ formatNumber(result()?.optimalObjective) }}</dd></div>
                <div><dt>GAP</dt><dd>{{ formatGap(result()?.gap) }}</dd></div>
                <div><dt>可行性</dt><dd>{{ result()?.isFeasible ? '可行' : '未通过' }}</dd></div>
              </dl>
              <section class="message-list">
                <h3>评测消息</h3>
                @for (message of result()?.messages ?? []; track $index) {
                  <p>{{ message }}</p>
                } @empty {
                  <p>评测器未返回额外消息。</p>
                }
              </section>
              @if (submissionId()) {
                <a class="primary-button full-width" [routerLink]="['/submissions', submissionId()]">查看提交详情</a>
              }
            } @else {
              <div class="result-empty">提交代码后，这里会显示状态、分数、目标值、GAP 和评测消息。</div>
            }

            <section class="report-placeholder">
              <h3>实验报告</h3>
              <p>报告入口已预留，将在后续版本开放编辑与提交。</p>
              <button class="secondary-button full-width" type="button" disabled>报告功能待开放</button>
            </section>
          </aside>
        </div>
      }
    </section>
  `,
})
export class WorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClientService);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly exercise = signal<ExerciseDetail | null>(null);
  protected readonly template = signal<TemplateDto | null>(null);
  protected readonly result = signal<RunResultDto | null>(null);
  protected readonly submissionId = signal<string | null>(null);
  protected readonly draftState = signal('模板已加载');
  protected code = '';
  protected datasetKey = 'small';
  private exerciseId = '';

  ngOnInit() {
    this.exerciseId = this.route.snapshot.paramMap.get('exerciseId') ?? '';
    if (!this.exerciseId) {
      this.loadError.set('缺少实验编号。');
      this.loading.set(false);
      return;
    }

    forkJoin({
      exercise: this.api.exercise(this.exerciseId),
      template: this.api.exerciseTemplate(this.exerciseId),
    }).subscribe({
      next: ({ exercise, template }) => {
        this.exercise.set(exercise);
        this.template.set(template);
        this.datasetKey = exercise.datasets[0]?.key ?? 'small';
        const draft = this.readDraft();
        this.code = draft ?? template.content;
        this.draftState.set(draft === null ? '模板已加载' : '已恢复本地草稿');
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('工作区数据读取失败，请确认后端、数据库和前端代理已启动。');
        this.loading.set(false);
      },
    });
  }

  protected saveDraft(value: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.draftKey(), value);
      this.draftState.set('草稿已保存到本机');
    }
  }

  protected resetTemplate() {
    this.code = this.template()?.content ?? '';
    this.saveDraft(this.code);
    this.draftState.set('已重置为默认模板');
  }

  protected submit() {
    const assignmentId = this.exercise()?.assignment?.id;
    if (!assignmentId) {
      this.submitError.set('当前实验尚未绑定可提交的作业。');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.result.set(null);
    this.api
      .createSubmission(assignmentId, { code: this.code, datasetKey: this.datasetKey })
      .pipe(
        switchMap((submission) => {
          this.submissionId.set(submission.submissionId);
          return this.api.submissionResult(submission.submissionId);
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (result) => this.result.set(result),
        error: () => this.submitError.set('提交或评测失败，请检查代码后重试。'),
      });
  }

  protected downloadResources() {
    this.api.exerciseResources(this.exerciseId).subscribe({
      next: (blob) => saveDownload(blob, `${this.exercise()?.case?.code ?? 'exercise'}-resources.zip`),
      error: () => this.submitError.set('练习资源包下载失败。'),
    });
  }

  protected statusText(status?: string) {
    const labels: Record<string, string> = {
      QUEUED: '排队中',
      RUNNING: '评测中',
      SUCCESS: '评测通过',
      FAILED: '评测失败',
      RUNTIME_ERROR: '运行错误',
      INVALID_OUTPUT: '输出无效',
    };
    return status ? labels[status] ?? status : '未知状态';
  }

  protected formatNumber(value?: number) {
    return value === undefined ? '-' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value);
  }

  protected formatScore(value?: number) {
    return value === undefined ? '-- 分' : `${this.formatNumber(value)} 分`;
  }

  protected formatGap(value?: number) {
    return value === undefined ? '-' : `${this.formatNumber(value * 100)}%`;
  }

  private draftKey() {
    return `decision-lab.workspace.draft:${this.exerciseId}`;
  }

  private readDraft() {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(this.draftKey());
  }
}
