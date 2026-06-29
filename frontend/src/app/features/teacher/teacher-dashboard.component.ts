import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type {
  CurrentSectionsResponse,
  TeacherProgressResponse,
  TeacherSubmissionListItem,
} from '@decision-lab/shared';
import { finalize, of, switchMap } from 'rxjs';
import { ApiClientService } from '../../core/api-client.service';

@Component({
  selector: 'dol-teacher-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="teacher-page">
      <header class="page-heading teacher-heading">
        <div>
          <p class="section-kicker">教师面板 · {{ termName() }}</p>
          <h1>班级实验进度</h1>
          <p>查看教学班整体完成情况、作业表现和学生提交记录。</p>
        </div>
        @if (sections().length > 0) {
          <label class="section-selector">
            教学班
            <select [ngModel]="selectedSectionId()" (ngModelChange)="selectSection($event)">
              @for (section of sections(); track section.id) {
                <option [value]="section.id">{{ section.name }}</option>
              }
            </select>
          </label>
        }
      </header>

      @if (loading()) {
        <div class="status-strip">正在读取班级进度...</div>
      } @else if (error()) {
        <div class="status-strip error">{{ error() }}</div>
      } @else if (progress()) {
        <div class="summary-grid teacher-summary">
          <section class="metric-card"><span>选课人数</span><strong>{{ progress()?.enrollmentCount }}</strong></section>
          <section class="metric-card"><span>提交总数</span><strong>{{ progress()?.submissionCount }}</strong></section>
          <section class="metric-card"><span>通过率</span><strong>{{ formatPercent(progress()?.passRate) }}</strong></section>
          <section class="metric-card"><span>平均分</span><strong>{{ formatScore(progress()?.averageScore) }}</strong></section>
        </div>

        <section class="content-band teacher-section">
          <div class="band-heading teacher-section-heading">
            <div>
              <p class="section-kicker">作业概览</p>
              <h2>{{ progress()?.section?.name }}</h2>
            </div>
            <span>{{ progress()?.assignmentCount }} 个作业</span>
          </div>
          <div class="teacher-table-wrap">
            <table class="teacher-table">
              <thead><tr><th>案例</th><th>作业</th><th>提交</th><th>通过</th><th>平均分</th><th></th></tr></thead>
              <tbody>
                @for (assignment of progress()?.assignments ?? []; track assignment.id) {
                  <tr [class.selected]="selectedAssignmentId() === assignment.id">
                    <td><span class="case-code">{{ assignment.caseCode }}</span></td>
                    <td><strong>{{ assignment.title }}</strong><small>{{ assignment.exerciseTitle }}</small></td>
                    <td>{{ assignment.submissionCount }}</td>
                    <td>{{ assignment.successCount }}</td>
                    <td>{{ formatScore(assignment.averageScore) }}</td>
                    <td><button class="table-action" type="button" (click)="selectAssignment(assignment.id)">查看提交</button></td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="empty-cell">当前教学班没有作业。</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="content-band teacher-section">
          <div class="band-heading teacher-section-heading">
            <div>
              <p class="section-kicker">提交记录</p>
              <h2>{{ selectedAssignment()?.title ?? '请选择作业' }}</h2>
            </div>
            <label class="assignment-selector">
              作业
              <select [ngModel]="selectedAssignmentId()" (ngModelChange)="selectAssignment($event)">
                @for (assignment of progress()?.assignments ?? []; track assignment.id) {
                  <option [value]="assignment.id">{{ assignment.caseCode }} · {{ assignment.title }}</option>
                }
              </select>
            </label>
          </div>

          @if (submissionsLoading()) {
            <div class="table-status">正在读取提交记录...</div>
          } @else if (submissionsError()) {
            <div class="table-status error">{{ submissionsError() }}</div>
          } @else {
            <div class="teacher-table-wrap">
              <table class="teacher-table submission-table">
                <thead><tr><th>学生</th><th>次数</th><th>状态</th><th>分数</th><th>目标值</th><th>提交时间</th><th>报告</th><th></th></tr></thead>
                <tbody>
                  @for (submission of submissions(); track submission.id) {
                    <tr>
                      <td><strong>{{ submission.student.name }}</strong><small>{{ submission.student.studentNo ?? '-' }}</small></td>
                      <td>第 {{ submission.attemptNumber }} 次</td>
                      <td><span class="status-label" [class.success]="submission.status === 'SUCCESS'">{{ statusText(submission.status) }}</span></td>
                      <td>{{ formatScore(submission.score) }}</td>
                      <td>{{ formatNumber(submission.objective) }}</td>
                      <td>{{ formatDate(submission.submittedAt) }}</td>
                      <td><button class="placeholder-action" type="button" disabled>人工评分待开放</button></td>
                      <td><a class="table-link" [routerLink]="['/submissions', submission.id]">查看详情</a></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="8" class="empty-cell">该作业暂无提交记录。</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <div class="status-strip">当前学期没有可查看的教学班。</div>
      }
    </section>
  `,
})
export class TeacherDashboardComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  protected readonly loading = signal(true);
  protected readonly submissionsLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submissionsError = signal<string | null>(null);
  protected readonly termName = signal('当前学期');
  protected readonly sections = signal<CurrentSectionsResponse['sections']>([]);
  protected readonly progress = signal<TeacherProgressResponse | null>(null);
  protected readonly submissions = signal<TeacherSubmissionListItem[]>([]);
  protected readonly selectedSectionId = signal('');
  protected readonly selectedAssignmentId = signal('');
  protected readonly selectedAssignment = computed(() =>
    this.progress()?.assignments.find((item) => item.id === this.selectedAssignmentId()) ?? null,
  );

  ngOnInit() {
    this.api.currentSections().pipe(
      switchMap((response) => {
        this.termName.set(response.term.name);
        this.sections.set(response.sections);
        const firstSectionId = response.sections[0]?.id;
        if (!firstSectionId) {
          return of(null);
        }
        this.selectedSectionId.set(firstSectionId);
        return this.api.teacherProgress(firstSectionId);
      }),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (progress) => this.applyProgress(progress),
      error: () => this.error.set('教师面板数据读取失败，请确认后端和数据库已启动。'),
    });
  }

  protected selectSection(sectionId: string) {
    this.selectedSectionId.set(sectionId);
    this.loading.set(true);
    this.error.set(null);
    this.api.teacherProgress(sectionId).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (progress) => this.applyProgress(progress),
      error: () => this.error.set('教学班进度读取失败。'),
    });
  }

  protected selectAssignment(assignmentId: string) {
    this.selectedAssignmentId.set(assignmentId);
    this.submissionsLoading.set(true);
    this.submissionsError.set(null);
    this.api.teacherSubmissions(assignmentId).pipe(
      finalize(() => this.submissionsLoading.set(false)),
    ).subscribe({
      next: (submissions) => this.submissions.set(submissions),
      error: () => this.submissionsError.set('提交列表读取失败。'),
    });
  }

  protected formatPercent(value?: number) {
    return `${this.formatNumber((value ?? 0) * 100)}%`;
  }

  protected formatScore(value?: number) {
    return value === undefined ? '-' : `${this.formatNumber(value)} 分`;
  }

  protected formatNumber(value?: number) {
    return value === undefined ? '-' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
  }

  protected formatDate(value: string) {
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  protected statusText(status: string) {
    const labels: Record<string, string> = {
      QUEUED: '排队中', RUNNING: '评测中', SUCCESS: '通过', FAILED: '失败',
      RUNTIME_ERROR: '运行错误', INVALID_OUTPUT: '输出无效',
    };
    return labels[status] ?? status;
  }

  private applyProgress(progress: TeacherProgressResponse | null) {
    this.progress.set(progress);
    this.submissions.set([]);
    const firstAssignmentId = progress?.assignments[0]?.id ?? '';
    this.selectedAssignmentId.set(firstAssignmentId);
    if (firstAssignmentId) {
      this.selectAssignment(firstAssignmentId);
    }
  }
}
