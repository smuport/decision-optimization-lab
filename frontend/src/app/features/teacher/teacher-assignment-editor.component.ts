import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { TeacherAssignmentDto, TeacherAssignmentOverviewDto } from '@decision-lab/shared';
import { finalize, switchMap } from 'rxjs';
import { ApiClientService } from '../../core/api-client.service';
import { canArchiveAssignment, canCloseAssignment, canEditAssignment, canPublishAssignment, validAssignmentWindow } from './teacher-assignment-policy';

@Component({
  selector: 'dol-teacher-assignment-editor', standalone: true, imports: [FormsModule, RouterLink],
  template: `
    <section class="teacher-page assignment-editor-page">
      <header class="page-heading teacher-heading"><div><p class="section-kicker">{{ isNew ? '新建作业' : '作业管理' }}</p><h1>{{ title || '配置练习作业' }}</h1><p>作业发布后，学生将按开放时间、次数和迟交规则进入工作区。</p></div><a class="secondary-button" [routerLink]="['/teacher/sections', sectionId, 'assignments']">返回作业列表</a></header>
      @if (loading()) { <div class="status-strip">正在读取作业设置...</div> } @else if (error()) { <div class="status-strip error">{{ error() }}</div> } @else {
        <section class="content-band assignment-form-band">
          @if (actionMessage()) { <div class="status-strip" [class.error]="actionError()">{{ actionMessage() }}</div> }
          <div class="assignment-form-grid">
            <label>练习<select [(ngModel)]="exerciseId" [disabled]="!isNew || !editable()"><option value="">请选择本班已发布案例下的练习</option>@for (item of overview()?.availableExercises ?? []; track item.id) { <option [value]="item.id">{{ item.case.code }} · {{ item.title }}</option> }</select></label>
            <label>作业标题<input [(ngModel)]="title" [disabled]="!editable()" maxlength="200"></label>
            <label class="wide-field">作业说明<textarea [(ngModel)]="description" [disabled]="!editable()" rows="4"></textarea></label>
            <label>开放时间<input type="datetime-local" [(ngModel)]="opensAt" [disabled]="!editable()"></label>
            <label>截止时间<input type="datetime-local" [(ngModel)]="dueAt" [disabled]="!editable()"></label>
            <label>最多提交次数<input type="number" min="1" [(ngModel)]="maxAttempts" [disabled]="!editable()" placeholder="留空表示不限"></label>
            <label class="checkbox-field"><input type="checkbox" [(ngModel)]="allowLate" [disabled]="!editable()">允许截止后迟交</label>
          </div>
          @if (selectedExercise()) { <section class="resource-readiness"><div><p class="section-kicker">发布检查</p><h2>{{ selectedExercise()?.case?.code }} · {{ selectedExercise()?.title }}</h2></div><span class="status-label" [class.success]="selectedExercise()?.resourceCheck?.ready">{{ selectedExercise()?.resourceCheck?.ready ? '资源完整，可以发布' : '资源不完整' }}</span>@if (!selectedExercise()?.resourceCheck?.ready) { <ul>@for (message of selectedExercise()?.resourceCheck?.messages ?? []; track message) { <li>{{ message }}</li> }</ul> }</section> }
          <div class="form-actions"><button class="secondary-button" type="button" [disabled]="saving() || !editable()" (click)="save()">{{ isNew ? '创建草稿' : '保存草稿' }}</button>@if (!isNew && assignment()) { <button class="primary-button" type="button" [disabled]="!canPublish() || saving()" (click)="publish()">发布作业</button><button class="secondary-button" type="button" [disabled]="!canClose() || saving()" (click)="close()">关闭作业</button><button class="secondary-button" type="button" [disabled]="!canArchive() || saving()" (click)="archive()">归档作业</button> }</div>
        </section>
      }
    </section>`,
})
export class TeacherAssignmentEditorComponent implements OnInit {
  private readonly api = inject(ApiClientService); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router);
  protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly error = signal<string | null>(null); protected readonly actionMessage = signal<string | null>(null); protected readonly actionError = signal(false);
  protected readonly overview = signal<TeacherAssignmentOverviewDto | null>(null); protected readonly assignment = signal<TeacherAssignmentDto | null>(null);
  protected readonly isNew = this.route.snapshot.paramMap.get('assignmentId') === null; protected sectionId = this.route.snapshot.queryParamMap.get('sectionId') ?? '';
  protected exerciseId = ''; protected title = ''; protected description = ''; protected opensAt = ''; protected dueAt = ''; protected maxAttempts: number | null = null; protected allowLate = false;
  private readonly assignmentId = this.route.snapshot.paramMap.get('assignmentId') ?? '';
  protected readonly selectedExercise = computed(() => this.overview()?.availableExercises.find((item) => item.id === this.exerciseId) ?? null);
  protected readonly editable = computed(() => this.isNew || canEditAssignment(this.assignment()?.status ?? 'DRAFT'));
  protected readonly canPublish = computed(() => canPublishAssignment(this.assignment()?.status ?? 'DRAFT', Boolean(this.selectedExercise()?.resourceCheck.ready)));
  protected readonly canClose = computed(() => canCloseAssignment(this.assignment()?.status ?? 'DRAFT'));
  protected readonly canArchive = computed(() => canArchiveAssignment(this.assignment()?.status ?? 'DRAFT'));
  ngOnInit() { if (this.isNew) { if (!this.sectionId) { this.error.set('缺少教学班编号。'); this.loading.set(false); return; } this.loadOverview(); return; } this.api.teacherAssignment(this.assignmentId).pipe(switchMap((assignment) => { this.applyAssignment(assignment); return this.api.teacherAssignments(assignment.sectionId); }), finalize(() => this.loading.set(false))).subscribe({ next: (overview) => this.overview.set(overview), error: () => this.error.set('作业读取失败或无权管理。') }); }
  protected save() { if (!this.exerciseId || !this.title.trim()) { this.show('请选择练习并填写作业标题。', true); return; } if (!validAssignmentWindow(this.opensAt, this.dueAt)) { this.show('截止时间不能早于开放时间。', true); return; } this.saving.set(true); const input = { title: this.title.trim(), description: this.description.trim() || null, opensAt: this.opensAt ? new Date(this.opensAt).toISOString() : null, dueAt: this.dueAt ? new Date(this.dueAt).toISOString() : null, maxAttempts: this.maxAttempts || null, allowLate: this.allowLate }; const request = this.isNew ? this.api.createTeacherAssignment(this.sectionId, { ...input, exerciseId: this.exerciseId, description: input.description ?? undefined, opensAt: input.opensAt ?? undefined, dueAt: input.dueAt ?? undefined, maxAttempts: input.maxAttempts ?? undefined }) : this.api.updateTeacherAssignment(this.assignmentId, input); request.pipe(finalize(() => this.saving.set(false))).subscribe({ next: (assignment) => { if (this.isNew) { void this.router.navigate(['/teacher/assignments', assignment.id, 'edit']); } else { this.applyAssignment(assignment); this.show('作业草稿已保存。', false); } }, error: (error) => this.show(error?.error?.message ?? '作业保存失败。', true) }); }
  protected publish() { this.runAction('publish', '作业已发布。'); }
  protected close() { if (window.confirm('关闭后学生将不能继续提交，确认关闭？')) this.runAction('close', '作业已关闭。'); }
  protected archive() { if (window.confirm('归档后仍保留历史提交，确认归档？')) this.runAction('archive', '作业已归档。'); }
  private runAction(action: 'publish'|'close'|'archive', message: string) { this.saving.set(true); const request = action === 'publish' ? this.api.publishTeacherAssignment(this.assignmentId) : action === 'close' ? this.api.closeTeacherAssignment(this.assignmentId) : this.api.archiveTeacherAssignment(this.assignmentId); request.pipe(finalize(() => this.saving.set(false))).subscribe({ next: (assignment) => { this.applyAssignment(assignment); this.show(message, false); }, error: (error) => this.show(error?.error?.message ?? '状态变更失败。', true) }); }
  private loadOverview() { this.api.teacherAssignments(this.sectionId).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (overview) => this.overview.set(overview), error: () => this.error.set('可发布练习读取失败。') }); }
  private applyAssignment(item: TeacherAssignmentDto) { this.assignment.set(item); this.sectionId = item.sectionId; this.exerciseId = item.exerciseId; this.title = item.title; this.description = item.description ?? ''; this.opensAt = this.toLocal(item.opensAt); this.dueAt = this.toLocal(item.dueAt); this.maxAttempts = item.maxAttempts ?? null; this.allowLate = item.allowLate; }
  private toLocal(value?: string) { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  private show(message: string, error: boolean) { this.actionMessage.set(message); this.actionError.set(error); }
}
