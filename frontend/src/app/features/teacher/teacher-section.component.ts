import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { TeacherAssignmentOverviewDto, TeacherCaseReleaseOverviewDto, TeacherSectionStudentDto } from '@decision-lab/shared';
import { finalize, forkJoin } from 'rxjs';
import { ApiClientService } from '../../core/api-client.service';
import { hasValidReleaseWindow, toggleReleaseSelection } from './teacher-section-policy';

type Tab = 'students' | 'cases' | 'assignments';

@Component({
  selector: 'dol-teacher-section', standalone: true, imports: [FormsModule, RouterLink],
  template: `
    <section class="teacher-page section-management-page">
      <header class="page-heading teacher-heading">
        <div><p class="section-kicker">教学班管理</p><h1>{{ overview()?.section?.name ?? '教学班' }}</h1><p>管理学生名单、案例可见范围和已发布作业。</p></div>
        <a class="secondary-button" routerLink="/teacher">返回进度面板</a>
      </header>
      <nav class="management-tabs" aria-label="教学班管理">
        <button type="button" [class.active]="tab() === 'students'" (click)="tab.set('students')">学生名单</button>
        <button type="button" [class.active]="tab() === 'cases'" (click)="tab.set('cases')">可见案例</button>
        <button type="button" [class.active]="tab() === 'assignments'" (click)="tab.set('assignments')">已发布作业</button>
      </nav>
      @if (loading()) { <div class="status-strip">正在读取教学班设置...</div> }
      @else if (error()) { <div class="status-strip error">{{ error() }}</div> }
      @else {
        @switch (tab()) {
          @case ('students') {
            <section class="content-band teacher-section"><div class="band-heading"><div><p class="section-kicker">学生名单</p><h2>{{ students().length }} 名学生</h2></div></div>
              <div class="teacher-table-wrap"><table class="teacher-table"><thead><tr><th>学号</th><th>姓名</th><th>邮箱</th><th>状态</th></tr></thead><tbody>
                @for (item of students(); track item.enrollmentId) { <tr><td>{{ item.student.studentNo ?? '-' }}</td><td><strong>{{ item.student.name }}</strong></td><td>{{ item.student.email }}</td><td><span class="status-label" [class.success]="item.status === 'ACTIVE'">{{ item.status === 'ACTIVE' ? '在读' : '停用' }}</span></td></tr> }
                @empty { <tr><td colspan="4" class="empty-cell">当前教学班没有学生。</td></tr> }
              </tbody></table></div>
            </section>
          }
          @case ('cases') {
            <section class="content-band teacher-section">
              <div class="band-heading teacher-section-heading"><div><p class="section-kicker">发布案例</p><h2>选择学生可阅读的案例</h2></div><button class="primary-button" type="button" [disabled]="selectedCaseIds().size === 0 || saving()" (click)="publishSelected()">发布所选案例</button></div>
              <div class="release-controls"><label>搜索案例<input type="search" [(ngModel)]="keyword" placeholder="案例编码或标题"></label><label>开始时间<input type="datetime-local" [(ngModel)]="visibleFrom"></label><label>结束时间<input type="datetime-local" [(ngModel)]="visibleUntil"></label></div>
              @if (actionMessage()) { <div class="status-strip" [class.error]="actionError()">{{ actionMessage() }}</div> }
              <div class="release-catalog">
                @for (item of selectableCases(); track item.id) { <label class="release-choice"><input type="checkbox" [checked]="selectedCaseIds().has(item.id)" (change)="toggleCase(item.id)"><span><strong>{{ item.code }} · {{ item.title }}</strong><small>{{ item.subtitle ?? '暂无副标题' }}</small></span></label> }
                @empty { <p class="empty-state">没有可新增的已发布案例。</p> }
              </div>
              <div class="teacher-table-wrap"><table class="teacher-table"><thead><tr><th>案例</th><th>状态</th><th>开始时间</th><th>结束时间</th><th>排序</th><th></th></tr></thead><tbody>
                @for (release of overview()?.releases ?? []; track release.id) { <tr><td><strong>{{ release.case?.code }} · {{ release.case?.title }}</strong></td><td><span class="status-label" [class.success]="release.status === 'PUBLISHED'">{{ releaseStatus(release.status) }}</span></td><td><input class="table-input" type="datetime-local" [disabled]="release.status === 'ARCHIVED'" [ngModel]="releaseDraft(release.id).visibleFrom" (ngModelChange)="setReleaseDraft(release.id, 'visibleFrom', $event)"></td><td><input class="table-input" type="datetime-local" [disabled]="release.status === 'ARCHIVED'" [ngModel]="releaseDraft(release.id).visibleUntil" (ngModelChange)="setReleaseDraft(release.id, 'visibleUntil', $event)"></td><td><input class="table-input sort-input" type="number" [disabled]="release.status === 'ARCHIVED'" [ngModel]="releaseDraft(release.id).sortOrder" (ngModelChange)="setReleaseDraft(release.id, 'sortOrder', $event)"></td><td><div class="table-actions">@if (release.status !== 'ARCHIVED') { <button class="table-action" type="button" (click)="saveRelease(release.id)">保存</button><button class="table-action danger" type="button" (click)="archive(release.id)">归档</button> }</div></td></tr> }
                @empty { <tr><td colspan="5" class="empty-cell">当前教学班还没有发布案例。</td></tr> }
              </tbody></table></div>
            </section>
          }
          @case ('assignments') {
            <section class="content-band teacher-section"><div class="band-heading teacher-section-heading"><div><p class="section-kicker">作业管理</p><h2>{{ assignmentOverview()?.assignments?.length ?? 0 }} 个作业</h2></div><a class="primary-button" [routerLink]="['/teacher/assignments/new']" [queryParams]="{ sectionId }">新建作业</a></div>
              <div class="teacher-table-wrap"><table class="teacher-table"><thead><tr><th>案例 / 练习</th><th>作业</th><th>状态</th><th>开放时间</th><th>截止时间</th><th></th></tr></thead><tbody>
                @for (item of assignmentOverview()?.assignments ?? []; track item.id) { <tr><td><span class="case-code">{{ item.exercise?.case?.code }}</span><small>{{ item.exercise?.title }}</small></td><td><strong>{{ item.title }}</strong></td><td><span class="status-label" [class.success]="item.status === 'PUBLISHED'">{{ assignmentStatus(item.status) }} · {{ availabilityStatus(item.availability) }}</span></td><td>{{ item.opensAt ? date(item.opensAt) : '立即' }}</td><td>{{ item.dueAt ? date(item.dueAt) : '不限' }}</td><td><a class="table-link" [routerLink]="['/teacher/assignments', item.id, 'edit']">管理</a></td></tr> }
                @empty { <tr><td colspan="6" class="empty-cell">当前教学班还没有作业。</td></tr> }
              </tbody></table></div>
            </section>
          }
        }
      }
    </section>`,
})
export class TeacherSectionComponent implements OnInit {
  private readonly api = inject(ApiClientService); private readonly route = inject(ActivatedRoute);
  protected readonly tab = signal<Tab>((this.route.snapshot.data['tab'] as Tab | undefined) ?? 'students'); protected readonly loading = signal(true); protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null); protected readonly actionMessage = signal<string | null>(null); protected readonly actionError = signal(false);
  protected readonly overview = signal<TeacherCaseReleaseOverviewDto | null>(null); protected readonly students = signal<TeacherSectionStudentDto[]>([]); protected readonly assignmentOverview = signal<TeacherAssignmentOverviewDto | null>(null);
  protected readonly selectedCaseIds = signal(new Set<string>()); protected keyword = ''; protected visibleFrom = ''; protected visibleUntil = '';
  protected readonly releaseDrafts = signal<Record<string, { visibleFrom: string; visibleUntil: string; sortOrder: number }>>({});
  protected readonly selectableCases = computed(() => { const value = this.keyword.trim().toLowerCase(); const released = new Set(this.overview()?.releases.map((item) => item.caseId)); return (this.overview()?.availableCases ?? []).filter((item) => !released.has(item.id) && (!value || item.code.toLowerCase().includes(value) || item.title.toLowerCase().includes(value))); });
  private readonly sectionId = this.route.snapshot.paramMap.get('sectionId') ?? '';
  ngOnInit() { this.reload(); }
  protected toggleCase(id: string) { this.selectedCaseIds.set(toggleReleaseSelection(this.selectedCaseIds(), id)); }
  protected publishSelected() { if (!this.sectionId || this.selectedCaseIds().size === 0) return; if (!hasValidReleaseWindow(this.visibleFrom, this.visibleUntil)) { this.showAction('结束时间不能早于开始时间。', true); return; } this.saving.set(true); this.api.batchCreateTeacherCaseReleases(this.sectionId, { caseIds: [...this.selectedCaseIds()], visibleFrom: this.toIso(this.visibleFrom), visibleUntil: this.toIso(this.visibleUntil), sortOrder: (this.overview()?.releases.length ?? 0) + 1 }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.selectedCaseIds.set(new Set()); this.showAction('所选案例已发布。', false); this.reloadOverview(); }, error: () => this.showAction('案例发布失败，请检查是否重复或状态已变化。', true) }); }
  protected releaseDraft(id: string) { return this.releaseDrafts()[id] ?? { visibleFrom: '', visibleUntil: '', sortOrder: 0 }; }
  protected setReleaseDraft(id: string, key: 'visibleFrom' | 'visibleUntil' | 'sortOrder', value: string | number) { const current = this.releaseDraft(id); this.releaseDrafts.update((all) => ({ ...all, [id]: { ...current, [key]: key === 'sortOrder' ? Number(value) : value } })); }
  protected saveRelease(id: string) { const draft = this.releaseDraft(id); if (!hasValidReleaseWindow(draft.visibleFrom, draft.visibleUntil)) { this.showAction('结束时间不能早于开始时间。', true); return; } this.api.updateTeacherCaseRelease(id, { visibleFrom: draft.visibleFrom ? this.toIso(draft.visibleFrom) : null, visibleUntil: draft.visibleUntil ? this.toIso(draft.visibleUntil) : null, sortOrder: draft.sortOrder }).subscribe({ next: () => { this.showAction('发布设置已保存。', false); this.reloadOverview(); }, error: () => this.showAction('发布设置保存失败。', true) }); }
  protected archive(id: string) { if (!window.confirm('归档后，该案例将从学生当前案例列表中移除。确认归档？')) return; this.api.updateTeacherCaseReleaseStatus(id, { status: 'ARCHIVED' }).subscribe({ next: () => { this.showAction('案例发布已归档。', false); this.reloadOverview(); }, error: () => this.showAction('归档失败。', true) }); }
  protected releaseStatus(value: string) { return ({ DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' } as Record<string,string>)[value] ?? value; }
  protected assignmentStatus(value: string) { return ({ DRAFT: '草稿', PUBLISHED: '已发布', CLOSED: '已关闭', ARCHIVED: '已归档' } as Record<string,string>)[value] ?? value; }
  protected availabilityStatus(value: string) { return ({ UPCOMING: '未开放', OPEN: '开放中', LATE: '迟交', CLOSED: '不可提交' } as Record<string,string>)[value] ?? value; }
  protected windowText(from?: string, until?: string) { return `${from ? this.date(from) : '立即'} 至 ${until ? this.date(until) : '不限'}`; }
  private reload() { if (!this.sectionId) { this.error.set('缺少教学班编号。'); this.loading.set(false); return; } forkJoin({ overview: this.api.teacherCaseReleases(this.sectionId), students: this.api.teacherSectionStudents(this.sectionId), assignments: this.api.teacherAssignments(this.sectionId) }).pipe(finalize(() => this.loading.set(false))).subscribe({ next: ({overview,students,assignments}) => { this.applyOverview(overview); this.students.set(students); this.assignmentOverview.set(assignments); }, error: () => this.error.set('教学班数据读取失败。') }); }
  private reloadOverview() { this.api.teacherCaseReleases(this.sectionId).subscribe((value) => this.applyOverview(value)); }
  private applyOverview(value: TeacherCaseReleaseOverviewDto) { this.overview.set(value); this.releaseDrafts.set(Object.fromEntries(value.releases.map((item) => [item.id, { visibleFrom: this.toLocalInput(item.visibleFrom), visibleUntil: this.toLocalInput(item.visibleUntil), sortOrder: item.sortOrder }]))); }
  private showAction(message: string, error: boolean) { this.actionMessage.set(message); this.actionError.set(error); }
  private toIso(value: string) { return value ? new Date(value).toISOString() : undefined; }
  private toLocalInput(value?: string) { if (!value) return ''; const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
  protected date(value: string) { return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
}
