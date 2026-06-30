import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { AdminCaseDetailDto, CreateCaseRequest, CreateExerciseRequest } from '@decision-lab/shared';
import { finalize } from 'rxjs';
import { ApiClientService } from '../../../core/api-client.service';
import { canArchiveCase, canPublishCase, shouldConfirmCaseExit } from './admin-case-form-policy';

type CaseForm = Omit<CreateCaseRequest, 'knowledgePoints' | 'content'> & { knowledgePoints: string };

@Component({
  selector: 'dol-admin-case-editor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="admin-page">
      <header class="page-heading admin-editor-heading">
        <div>
          <p class="section-kicker">案例管理 · {{ isNew() ? '新建草稿' : statusText(item()?.status) }}</p>
          <h1>{{ isNew() ? '新建案例' : item()?.title }}</h1>
          <p>{{ isNew() ? '先维护案例元数据，创建后可继续发布。' : item()?.code }}</p>
        </div>
        <div class="hero-actions">
          <a class="ghost-button" routerLink="/admin/cases">返回目录</a>
          <button class="secondary-button" type="button" [disabled]="saving() || !valid() || item()?.status === 'ARCHIVED'" (click)="save()">{{ isNew() ? '创建草稿' : '保存修改' }}</button>
          @if (!isNew() && item()?.status === 'DRAFT') {
            <button class="primary-button" type="button" [disabled]="!canPublish()" (click)="changeStatus('PUBLISHED')">发布</button>
          }
          @if (!isNew() && item()?.status === 'PUBLISHED') {
            <button class="danger-button" type="button" [disabled]="!canArchive()" (click)="changeStatus('ARCHIVED')">归档</button>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="status-strip">正在读取案例...</div>
      } @else {
        @if (message()) { <div class="status-strip" [class.error]="messageType() === 'error'">{{ message() }}</div> }
        <div class="admin-editor-layout">
          <section class="content-band admin-form-band">
            <div class="band-heading"><h2>案例元数据</h2><span>* 为必填项</span></div>
            <form class="admin-case-form" (ngSubmit)="save()">
              <label>案例编码 *<input name="code" [(ngModel)]="form.code" (ngModelChange)="markDirty()" required maxlength="100" [disabled]="!isNew()" placeholder="case_02" /></label>
              <label>标题 *<input name="title" [(ngModel)]="form.title" (ngModelChange)="markDirty()" required maxlength="200" [disabled]="item()?.status === 'ARCHIVED'" /></label>
              <label class="full-width">副标题<input name="subtitle" [(ngModel)]="form.subtitle" (ngModelChange)="markDirty()" maxlength="300" [disabled]="item()?.status === 'ARCHIVED'" /></label>
              <label>分类 *<select name="category" [(ngModel)]="form.category" (ngModelChange)="markDirty()" [disabled]="item()?.status === 'ARCHIVED'"><option value="LINEAR_PROGRAMMING">线性规划</option><option value="INTEGER_PROGRAMMING">整数规划</option><option value="HEURISTIC">启发式</option><option value="META_HEURISTIC">元启发式</option><option value="REPORT_ANALYSIS">报告分析</option></select></label>
              <label>难度 *<select name="difficulty" [(ngModel)]="form.difficulty" (ngModelChange)="markDirty()" [disabled]="item()?.status === 'ARCHIVED'"><option value="EASY">入门</option><option value="MEDIUM">中等</option><option value="HARD">进阶</option></select></label>
              <label>排序<input name="sortOrder" type="number" [(ngModel)]="form.sortOrder" (ngModelChange)="markDirty()" [disabled]="item()?.status === 'ARCHIVED'" /></label>
              <label class="full-width">知识点（逗号分隔）<input name="knowledgePoints" [(ngModel)]="form.knowledgePoints" (ngModelChange)="markDirty()" [disabled]="item()?.status === 'ARCHIVED'" placeholder="线性规划, PuLP" /></label>
              <label class="full-width">案例摘要<textarea name="summary" rows="5" [(ngModel)]="form.summary" (ngModelChange)="markDirty()" [disabled]="item()?.status === 'ARCHIVED'"></textarea></label>
            </form>
          </section>

          <aside class="admin-editor-aside">
            <section class="content-band student-preview">
              <p class="section-kicker">学生视角预览</p>
              <span class="case-code">{{ form.code || 'CASE CODE' }}</span>
              <h2>{{ form.title || '案例标题' }}</h2>
              <p>{{ form.subtitle || form.summary || '案例简介将在这里显示。' }}</p>
              <div class="tag-row"><span class="difficulty">{{ difficultyText(form.difficulty) }}</span>@for (point of knowledgePointList(); track point) { <span>{{ point }}</span> }</div>
            </section>

            @if (!isNew()) {
              <section class="content-band exercise-summary">
                <div class="band-heading"><h2>练习</h2><button class="table-action" type="button" [disabled]="item()?.status === 'ARCHIVED'" (click)="showExerciseForm.set(!showExerciseForm())">{{ showExerciseForm() ? '取消' : '新建练习' }}</button></div>
                @if (showExerciseForm()) {
                  <div class="inline-exercise-form">
                    <label>练习编码 *<input [(ngModel)]="exerciseDraft.code" placeholder="production_planning" /></label>
                    <label>标题 *<input [(ngModel)]="exerciseDraft.title" /></label>
                    <label>类型<select [(ngModel)]="exerciseDraft.kind"><option value="EXACT_MODELING">精确建模</option><option value="HEURISTIC">启发式</option><option value="REPORT">报告</option><option value="MIXED">混合</option></select></label>
                    <label>资源目录 *<input [(ngModel)]="exerciseDraft.assetPath" placeholder="course-assets/cases/.../exercises/..." /></label>
                    <label>Entrypoint<input [(ngModel)]="exerciseDraft.entrypoint" placeholder="solve" /></label>
                    <button class="primary-button" type="button" [disabled]="creatingExercise() || !exerciseDraft.code.trim() || !exerciseDraft.title.trim() || !exerciseDraft.assetPath.trim()" (click)="createExercise()">创建练习草稿</button>
                  </div>
                }
                @for (exercise of item()?.exercises ?? []; track exercise.id) {
                  <div class="exercise-summary-row"><div><strong>{{ exercise.title }}</strong><small>{{ exercise.code }}</small></div><div class="exercise-row-actions"><span class="status-label" [class.success]="exercise.status === 'PUBLISHED'">{{ statusText(exercise.status) }}</span><a class="table-link" [routerLink]="['/admin/exercises', exercise.id]">管理</a></div></div>
                } @empty { <p class="empty-state">该案例下暂无练习。</p> }
              </section>
            }
          </aside>
        </div>
      }
    </section>
  `,
})
export class AdminCaseEditorComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = signal(false);
  protected readonly item = signal<AdminCaseDetailDto | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly messageType = signal<'success' | 'error'>('success');
  protected readonly showExerciseForm = signal(false);
  protected readonly creatingExercise = signal(false);
  protected readonly isNew = computed(() => this.route.snapshot.paramMap.get('caseId') === null);
  protected readonly canPublish = computed(() => canPublishCase(this.item(), this.dirty()));
  protected readonly canArchive = computed(() => canArchiveCase(this.item()?.status, this.dirty()));
  protected form: CaseForm = { courseId: '', code: '', title: '', subtitle: '', category: 'LINEAR_PROGRAMMING', difficulty: 'EASY', knowledgePoints: '', summary: '', sortOrder: 0 };
  protected exerciseDraft: CreateExerciseRequest = { code: '', title: '', kind: 'EXACT_MODELING', entrypoint: 'solve', outputSchema: {}, assetPath: '', sortOrder: 0 };

  ngOnInit() {
    const caseId = this.route.snapshot.paramMap.get('caseId');
    if (caseId) {
      this.api.adminCase(caseId).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (item) => this.applyItem(item), error: () => this.showError('案例读取失败。') });
      return;
    }
    this.api.currentCourse().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (course) => { this.form.courseId = course.id; }, error: () => this.showError('当前课程读取失败。') });
  }

  canDeactivate() { return shouldConfirmCaseExit(this.dirty()); }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) { if (this.dirty()) event.preventDefault(); }
  protected markDirty() { this.dirty.set(true); this.message.set(null); }

  protected save() {
    if (!this.valid() || this.saving() || this.item()?.status === 'ARCHIVED') return;
    this.saving.set(true);
    this.message.set(null);
    const body: CreateCaseRequest = { ...this.form, subtitle: this.form.subtitle?.trim() || undefined, summary: this.form.summary?.trim() || undefined, knowledgePoints: this.knowledgePointList() };
    const { courseId: _courseId, code: _code, ...updateBody } = body;
    const request = this.isNew() ? this.api.createAdminCase(body) : this.api.updateAdminCase(this.item()!.id, updateBody);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (item) => { this.applyItem(item); this.messageType.set('success'); this.message.set('案例已保存。'); if (this.isNew()) this.router.navigate(['/admin/cases', item.id], { replaceUrl: true }); },
      error: (error) => this.showError(error?.error?.message ?? '案例保存失败。'),
    });
  }

  protected changeStatus(status: 'PUBLISHED' | 'ARCHIVED') {
    const current = this.item();
    if (!current || this.dirty()) return;
    const action = status === 'PUBLISHED' ? '发布' : '归档';
    if (!window.confirm(`确定${action}案例“${current.title}”吗？`)) return;
    this.saving.set(true);
    this.api.updateAdminCaseStatus(current.id, { status }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: (item) => { this.applyItem(item); this.messageType.set('success'); this.message.set(`案例已${action}。`); }, error: (error) => this.showError(error?.error?.message ?? `案例${action}失败。`) });
  }

  protected createExercise() {
    const current = this.item();
    if (!current || current.status === 'ARCHIVED' || this.creatingExercise()) return;
    this.creatingExercise.set(true);
    this.api.createAdminExercise(current.id, this.exerciseDraft).pipe(finalize(() => this.creatingExercise.set(false))).subscribe({
      next: (exercise) => { this.showExerciseForm.set(false); this.router.navigate(['/admin/exercises', exercise.id]); },
      error: (error) => this.showError(error?.error?.message ?? '练习草稿创建失败。'),
    });
  }

  protected statusText(status?: string) { return ({ DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' } as Record<string, string>)[status ?? ''] ?? status ?? '' ; }
  protected difficultyText(value: string) { return ({ EASY: '入门', MEDIUM: '中等', HARD: '进阶' } as Record<string, string>)[value] ?? value; }
  protected knowledgePointList() { return this.form.knowledgePoints.split(/[,，]/).map((value) => value.trim()).filter(Boolean); }
  protected valid() { return Boolean(this.form.courseId && this.form.code.trim() && this.form.title.trim()); }

  private applyItem(item: AdminCaseDetailDto) {
    this.item.set(item);
    this.form = { courseId: item.courseId, code: item.code, title: item.title, subtitle: item.subtitle ?? '', category: item.category, difficulty: item.difficulty, knowledgePoints: item.knowledgePoints.join(', '), summary: item.summary ?? '', sortOrder: item.sortOrder };
    this.dirty.set(false);
  }
  private showError(message: string) { this.messageType.set('error'); this.message.set(message); this.loading.set(false); }
}
