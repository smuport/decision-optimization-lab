import { JsonPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { RunResultDto, StudentAssignmentDetailDto } from '@decision-lab/shared';
import { finalize, switchMap } from 'rxjs';
import { ApiClientService } from '../../core/api-client.service';
import { AuthStateService } from '../../core/auth-state.service';
import { saveDownload } from '../../core/file-download';

@Component({
  selector: 'dol-workspace', standalone: true, imports: [FormsModule, JsonPipe, RouterLink],
  template: `
    <section class="workspace-page">
      @if (loading()) { <div class="status-strip">正在准备实验工作区...</div> }
      @else if (loadError()) { <div class="status-strip error">{{ loadError() }}</div> }
      @else if (assignment()) {
        <header class="workspace-header"><div><p class="section-kicker">{{ assignment()?.exercise?.case?.code }} · {{ availabilityText() }}</p><h1>{{ assignment()?.title }}</h1><p>{{ assignment()?.description ?? assignment()?.exercise?.description }}</p></div><div class="workspace-header-actions"><a class="secondary-button" [routerLink]="['/cases', assignment()?.exercise?.case?.id]">查看教学指南</a><button class="secondary-button" type="button" (click)="downloadResources()">下载练习资源包</button></div></header>
        @if (!assignment()?.canSubmit) { <div class="status-strip">{{ unavailableReason() }}</div> }
        <div class="workspace-layout">
          <aside class="workspace-sidebar"><section><p class="section-kicker">任务信息</p><h2>{{ assignment()?.exercise?.title }}</h2><dl class="detail-list"><div><dt>提交次数</dt><dd>{{ assignment()?.attemptCount }} / {{ assignment()?.maxAttempts ?? '不限' }}</dd></div><div><dt>剩余次数</dt><dd>{{ assignment()?.remainingAttempts ?? '不限' }}</dd></div><div><dt>截止时间</dt><dd>{{ formatDate(assignment()?.dueAt) }}</dd></div><div><dt>总分</dt><dd>{{ assignment()?.rubric?.totalScore ?? 100 }}</dd></div></dl></section><section><h3>公开数据集</h3><label>本次评测数据集<select [(ngModel)]="datasetKey">@for (dataset of assignment()?.datasets ?? []; track dataset.id) { <option [value]="dataset.key">{{ dataset.label }}</option> }</select></label></section><section><h3>输入输出规范</h3><pre class="json-summary">{{ assignment()?.outputSchema | json }}</pre></section><section><h3>评分规则</h3><pre class="json-summary">{{ assignment()?.rubric?.rules | json }}</pre></section></aside>
          <section class="workspace-editor"><div class="panel-toolbar"><div><strong>{{ assignment()?.template?.filename ?? 'solution.py' }}</strong><span>{{ draftState() }}</span></div><button class="secondary-button" type="button" (click)="resetTemplate()">重置模板</button></div><textarea class="code-editor" aria-label="Python 提交代码" spellcheck="false" [(ngModel)]="code" (ngModelChange)="saveDraft($event)"></textarea><div class="submit-bar"><span>使用 {{ datasetKey }} 数据集进行同步评测</span><button class="primary-button" type="button" [disabled]="submitting() || !code.trim() || !assignment()?.canSubmit" (click)="submit()">{{ submitting() ? '评测中...' : '提交评测' }}</button></div></section>
          <aside class="workspace-results"><div class="panel-toolbar"><div><strong>评测结果</strong><span>{{ result() ? statusText(result()?.status) : '等待提交' }}</span></div></div>@if (submitError()) { <div class="result-empty error">{{ submitError() }}</div> } @else if (result()) { <div class="result-status" [class.success]="result()?.status === 'SUCCESS'"><span>{{ statusText(result()?.status) }}</span><strong>{{ formatScore(result()?.score) }}</strong></div><dl class="detail-list result-metrics"><div><dt>目标值</dt><dd>{{ formatNumber(result()?.objective) }}</dd></div><div><dt>最优值</dt><dd>{{ formatNumber(result()?.optimalObjective) }}</dd></div><div><dt>GAP</dt><dd>{{ formatGap(result()?.gap) }}</dd></div><div><dt>可行性</dt><dd>{{ result()?.isFeasible ? '可行' : '未通过' }}</dd></div></dl><section class="message-list"><h3>评测消息</h3>@for (message of result()?.messages ?? []; track $index) { <p>{{ message }}</p> } @empty { <p>评测器未返回额外消息。</p> }</section>@if (submissionId()) { <a class="primary-button full-width" [routerLink]="['/submissions', submissionId()]">查看提交详情</a> } } @else { <div class="result-empty">提交代码后，这里会显示状态、分数、目标值、GAP 和评测消息。</div> }<section class="report-placeholder"><h3>实验报告</h3><p>报告入口已预留，将在后续版本开放编辑与提交。</p><button class="secondary-button full-width" type="button" disabled>报告功能待开放</button></section></aside>
        </div>
      }
    </section>`,
})
export class WorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly api = inject(ApiClientService); private readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true); protected readonly loadError = signal<string | null>(null); protected readonly submitting = signal(false); protected readonly submitError = signal<string | null>(null);
  protected readonly assignment = signal<StudentAssignmentDetailDto | null>(null); protected readonly result = signal<RunResultDto | null>(null); protected readonly submissionId = signal<string | null>(null); protected readonly draftState = signal('模板已加载');
  protected code = ''; protected datasetKey = 'small'; private assignmentId = '';
  ngOnInit() { this.assignmentId = this.route.snapshot.paramMap.get('assignmentId') ?? ''; if (!this.assignmentId) { this.loadError.set('缺少作业编号。'); this.loading.set(false); return; } this.api.studentAssignment(this.assignmentId).subscribe({ next: (assignment) => { this.applyAssignment(assignment); this.loading.set(false); }, error: () => { this.loadError.set('作业不存在或当前账号无权访问。'); this.loading.set(false); } }); }
  protected saveDraft(value: string) { if (typeof localStorage !== 'undefined') { localStorage.setItem(this.draftKey(), value); this.draftState.set('草稿已保存到本机'); } }
  protected resetTemplate() { this.code = this.assignment()?.template?.content ?? ''; this.saveDraft(this.code); this.draftState.set('已重置为默认模板'); }
  protected submit() { if (!this.assignment()?.canSubmit) return; this.submitting.set(true); this.submitError.set(null); this.result.set(null); this.api.createSubmission(this.assignmentId, { code: this.code, datasetKey: this.datasetKey }).pipe(switchMap((submission) => { this.submissionId.set(submission.submissionId); return this.api.submissionResult(submission.submissionId); }), finalize(() => this.submitting.set(false))).subscribe({ next: (result) => { this.result.set(result); this.api.studentAssignment(this.assignmentId).subscribe((assignment) => this.assignment.set(assignment)); }, error: (error) => this.submitError.set(error?.error?.message ?? '提交或评测失败，请检查作业状态和代码后重试。') }); }
  protected downloadResources() { this.api.assignmentResources(this.assignmentId).subscribe({ next: (blob) => saveDownload(blob, `${this.assignment()?.exercise.case.code ?? 'exercise'}-resources.zip`), error: () => this.submitError.set('练习资源包下载失败。') }); }
  protected availabilityText() { return ({ UPCOMING: '尚未开放', OPEN: '开放中', LATE: '迟交阶段', CLOSED: '已关闭' } as Record<string,string>)[this.assignment()?.availability ?? ''] ?? ''; }
  protected unavailableReason() { const item = this.assignment(); if (!item) return ''; if (item.remainingAttempts === 0) return '已达到最大提交次数，仍可查看作业和历史提交。'; if (item.availability === 'UPCOMING') return `作业将在 ${this.formatDate(item.opensAt)} 开放。`; return '当前作业不可继续提交，仍可查看内容和历史提交。'; }
  protected statusText(status?: string) { return status ? ({ QUEUED: '排队中', RUNNING: '评测中', SUCCESS: '评测通过', FAILED: '评测失败', RUNTIME_ERROR: '运行错误', INVALID_OUTPUT: '输出无效' } as Record<string,string>)[status] ?? status : '未知状态'; }
  protected formatDate(value?: string) { return value ? new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '未设置'; }
  protected formatNumber(value?: number) { return value === undefined ? '-' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value); }
  protected formatScore(value?: number) { return value === undefined ? '-- 分' : `${this.formatNumber(value)} 分`; }
  protected formatGap(value?: number) { return value === undefined ? '-' : `${this.formatNumber(value * 100)}%`; }
  private applyAssignment(assignment: StudentAssignmentDetailDto) { this.assignment.set(assignment); this.datasetKey = assignment.datasets[0]?.key ?? 'small'; const draft = this.readDraft(); this.code = draft ?? assignment.template?.content ?? ''; this.draftState.set(draft === null ? '模板已加载' : '已恢复本地草稿'); }
  private draftKey() { return `decision-lab.workspace.draft:${this.auth.user()?.id ?? 'anonymous'}:${this.assignmentId}`; }
  private readDraft() { return typeof localStorage === 'undefined' ? null : localStorage.getItem(this.draftKey()); }
}
