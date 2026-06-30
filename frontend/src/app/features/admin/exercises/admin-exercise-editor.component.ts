import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { AdminExerciseDetailDto, ExerciseResourceCheckDto, UpdateExerciseRequest } from '@decision-lab/shared';
import { finalize } from 'rxjs';
import { ApiClientService } from '../../../core/api-client.service';
import { canArchiveExercise, canPublishExercise, parseJsonObject } from './admin-exercise-form-policy';
import { shouldConfirmCaseExit } from '../cases/admin-case-form-policy';

type ExerciseForm = {
  title: string;
  description: string;
  kind: UpdateExerciseRequest['kind'];
  entrypoint: string;
  outputSchema: string;
  guide: string;
  assetPath: string;
  sortOrder: number;
};

@Component({
  selector: 'dol-admin-exercise-editor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="admin-page">
      <header class="page-heading admin-editor-heading">
        <div>
          <p class="section-kicker">练习管理 · {{ statusText(item()?.status) }}</p>
          <h1>{{ item()?.title ?? '练习详情' }}</h1>
          <p>{{ item()?.case?.code }} / {{ item()?.code }}</p>
        </div>
        <div class="hero-actions">
          @if (item()?.case; as parent) { <a class="ghost-button" [routerLink]="['/admin/cases', parent.id]">返回案例</a> }
          <button class="secondary-button" type="button" [disabled]="saving() || !valid() || item()?.status === 'ARCHIVED'" (click)="save()">保存修改</button>
          @if (item()?.status === 'DRAFT') { <button class="primary-button" type="button" [disabled]="!canPublish()" (click)="changeStatus('PUBLISHED')">发布</button> }
          @if (item()?.status === 'PUBLISHED') { <button class="danger-button" type="button" [disabled]="!canArchive()" (click)="changeStatus('ARCHIVED')">归档</button> }
        </div>
      </header>

      @if (loading()) { <div class="status-strip">正在读取练习...</div> }
      @else {
        @if (message()) { <div class="status-strip" [class.error]="messageType() === 'error'">{{ message() }}</div> }
        <div class="admin-editor-layout exercise-editor-layout">
          <section class="content-band admin-form-band">
            <div class="band-heading"><h2>练习元数据</h2><span>评测资产由仓库维护</span></div>
            <form class="admin-case-form" (ngSubmit)="save()">
              <label>练习编码<input [value]="item()?.code ?? ''" disabled /></label>
              <label>标题 *<input name="title" [(ngModel)]="form.title" (ngModelChange)="markDirty()" [disabled]="readonly()" required /></label>
              <label>类型 *<select name="kind" [(ngModel)]="form.kind" (ngModelChange)="markDirty()" [disabled]="readonly()"><option value="EXACT_MODELING">精确建模</option><option value="HEURISTIC">启发式</option><option value="REPORT">报告</option><option value="MIXED">混合</option></select></label>
              <label>排序<input name="sortOrder" type="number" min="0" [(ngModel)]="form.sortOrder" (ngModelChange)="markDirty()" [disabled]="readonly()" /></label>
              <label class="full-width">说明<textarea name="description" rows="3" [(ngModel)]="form.description" (ngModelChange)="markDirty()" [disabled]="readonly()"></textarea></label>
              <label>Entrypoint *<input name="entrypoint" [(ngModel)]="form.entrypoint" (ngModelChange)="markDirty()" [disabled]="readonly()" placeholder="solve" /></label>
              <label>资源目录 *<input name="assetPath" [(ngModel)]="form.assetPath" (ngModelChange)="markDirty()" [disabled]="readonly()" /></label>
              <label class="full-width">Output schema (JSON) *<textarea class="json-editor" name="outputSchema" rows="10" [(ngModel)]="form.outputSchema" (ngModelChange)="markDirty()" [disabled]="readonly()"></textarea></label>
              <label class="full-width">教学引导 (JSON)<textarea class="json-editor" name="guide" rows="8" [(ngModel)]="form.guide" (ngModelChange)="markDirty()" [disabled]="readonly()"></textarea></label>
            </form>
          </section>

          <aside class="admin-editor-aside">
            <section class="content-band resource-check-panel">
              <div class="band-heading"><h2>资源完整性</h2><button class="table-action" type="button" [disabled]="checking()" (click)="refreshCheck()">重新检查</button></div>
              @if (resourceCheck(); as check) {
                <div class="resource-check-summary" [class.ready]="check.ready"><strong>{{ check.ready ? '可以发布' : '资源未就绪' }}</strong><span>{{ formatDate(check.checkedAt) }}</span></div>
                <div class="resource-check-list">
                  @for (row of checkRows(check); track row.key) { <div><span>{{ row.label }}</span><strong [class.pass]="row.pass">{{ row.pass ? '通过' : '缺失' }}</strong></div> }
                </div>
                @if (check.messages.length) { <ul class="check-messages">@for (message of check.messages; track message) { <li>{{ message }}</li> }</ul> }
              }
            </section>

            <section class="content-band student-preview">
              <p class="section-kicker">学生工作区预览</p>
              <h2>{{ form.title || '练习标题' }}</h2>
              <p>{{ form.description || '练习说明将在这里显示。' }}</p>
              <dl class="preview-contract"><div><dt>入口函数</dt><dd>{{ form.entrypoint || '-' }}</dd></div><div><dt>资源包</dt><dd>说明、模板、公开数据和输出规范</dd></div></dl>
            </section>
          </aside>
        </div>
      }
    </section>
  `,
})
export class AdminExerciseEditorComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly route = inject(ActivatedRoute);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly checking = signal(false);
  protected readonly dirty = signal(false);
  protected readonly item = signal<AdminExerciseDetailDto | null>(null);
  protected readonly resourceCheck = signal<ExerciseResourceCheckDto | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly messageType = signal<'success' | 'error'>('success');
  protected readonly readonly = computed(() => this.item()?.status === 'ARCHIVED');
  protected readonly canPublish = computed(() => canPublishExercise(this.item(), this.dirty()));
  protected readonly canArchive = computed(() => canArchiveExercise(this.item()?.status, this.dirty()));
  protected form: ExerciseForm = { title: '', description: '', kind: 'EXACT_MODELING', entrypoint: '', outputSchema: '{}', guide: '{}', assetPath: '', sortOrder: 0 };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('exerciseId')!;
    this.api.adminExercise(id).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (item) => this.applyItem(item), error: () => this.showError('练习读取失败。') });
  }

  canDeactivate() { return shouldConfirmCaseExit(this.dirty()); }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) { if (this.dirty()) event.preventDefault(); }
  protected markDirty() { this.dirty.set(true); this.message.set(null); }
  protected valid() { return Boolean(this.form.title.trim() && this.form.entrypoint.trim() && this.form.assetPath.trim() && this.form.sortOrder >= 0); }

  protected save() {
    const current = this.item();
    if (!current || !this.valid() || this.readonly() || this.saving()) return;
    let outputSchema: Record<string, unknown>;
    let guide: Record<string, unknown>;
    try { outputSchema = parseJsonObject(this.form.outputSchema, 'Output schema'); guide = parseJsonObject(this.form.guide || '{}', '教学引导'); }
    catch (error) { this.showError(error instanceof Error ? error.message : 'JSON 格式错误'); return; }
    this.saving.set(true);
    this.api.updateAdminExercise(current.id, { title: this.form.title.trim(), description: this.form.description.trim() || undefined, kind: this.form.kind, entrypoint: this.form.entrypoint.trim(), outputSchema, guide, assetPath: this.form.assetPath.trim(), sortOrder: this.form.sortOrder }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: (item) => { this.applyItem(item); this.showSuccess('练习已保存。'); }, error: (error) => this.showError(error?.error?.message ?? '练习保存失败。') });
  }

  protected refreshCheck() {
    const current = this.item(); if (!current) return;
    this.checking.set(true);
    this.api.adminExerciseResourceCheck(current.id).pipe(finalize(() => this.checking.set(false))).subscribe({ next: (check) => { this.resourceCheck.set(check); this.item.update((item) => item ? { ...item, resourceCheck: check } : item); }, error: () => this.showError('资源完整性检查失败。') });
  }

  protected changeStatus(status: 'PUBLISHED' | 'ARCHIVED') {
    const current = this.item(); if (!current || this.dirty()) return;
    const action = status === 'PUBLISHED' ? '发布' : '归档';
    if (!window.confirm(`确定${action}练习“${current.title}”吗？`)) return;
    this.saving.set(true);
    this.api.updateAdminExerciseStatus(current.id, { status }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: (item) => { this.applyItem(item); this.showSuccess(`练习已${action}。`); }, error: (error) => this.showError(error?.error?.message ?? `练习${action}失败。`) });
  }

  protected checkRows(check: ExerciseResourceCheckDto) { return [{ key: 'entrypoint', label: 'Entrypoint', pass: check.checks.entrypoint }, { key: 'outputSchema', label: 'Output schema', pass: check.checks.outputSchema }, { key: 'defaultTemplate', label: '默认模板', pass: check.checks.defaultTemplate }, { key: 'publicDataset', label: '公开数据集', pass: check.checks.publicDataset }, { key: 'activeRubric', label: 'Active rubric', pass: check.checks.activeRubric }, { key: 'validator', label: 'Validator', pass: check.checks.validator }]; }
  protected statusText(status?: string) { return ({ DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' } as Record<string, string>)[status ?? ''] ?? ''; }
  protected formatDate(value: string) { return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

  private applyItem(item: AdminExerciseDetailDto) { this.item.set(item); this.resourceCheck.set(item.resourceCheck); this.form = { title: item.title, description: item.description ?? '', kind: item.kind, entrypoint: item.entrypoint ?? '', outputSchema: JSON.stringify(item.outputSchema ?? {}, null, 2), guide: JSON.stringify(item.guide ?? {}, null, 2), assetPath: item.assetPath, sortOrder: item.sortOrder }; this.dirty.set(false); }
  private showSuccess(message: string) { this.messageType.set('success'); this.message.set(message); }
  private showError(message: string) { this.messageType.set('error'); this.message.set(message); this.loading.set(false); }
}
