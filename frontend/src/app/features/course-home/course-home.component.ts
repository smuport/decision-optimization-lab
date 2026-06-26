import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ApiClientService,
  type CurrentCourseResponse,
  type ExerciseListItem,
} from '../../core/api-client.service';
import { AuthStateService } from '../../core/auth-state.service';

@Component({
  selector: 'dol-course-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="course-dashboard">
      <div class="page-heading">
        <div>
          <p class="section-kicker">当前课程</p>
          <h1>{{ course()?.name ?? '工程系统决策与优化' }}</h1>
          <p>{{ course()?.description ?? '加载课程数据后，将展示本周实验任务和教学班信息。' }}</p>
        </div>
        <a class="primary-button" routerLink="/auth/login">
          {{ auth.isAuthenticated() ? '切换账号' : '演示登录' }}
        </a>
      </div>

      @if (loading()) {
        <div class="status-strip">正在读取课程和实验任务...</div>
      } @else if (error()) {
        <div class="status-strip error">{{ error() }}</div>
      } @else {
        <div class="summary-grid">
          <section class="metric-card">
            <span>学期</span>
            <strong>{{ course()?.currentTerm?.name ?? '未配置' }}</strong>
          </section>
          <section class="metric-card">
            <span>教学班</span>
            <strong>{{ sectionCount() }}</strong>
          </section>
          <section class="metric-card">
            <span>本周实验</span>
            <strong>{{ assignmentCount() }}</strong>
          </section>
          <section class="metric-card">
            <span>登录状态</span>
            <strong>{{ auth.isAuthenticated() ? '已登录' : '演示可浏览' }}</strong>
          </section>
        </div>

        <section class="content-band">
          <div class="band-heading">
            <div>
              <p class="section-kicker">本周实验任务</p>
              <h2>从课程首页进入 case01</h2>
            </div>
          </div>

          <div class="assignment-list">
            @for (assignment of assignments(); track assignment.id) {
              <article class="assignment-row">
                <div>
                  <span class="case-code">{{ assignment.exercise.caseCode }}</span>
                  <h3>{{ assignment.exercise.caseTitle }}</h3>
                  <p>{{ assignment.title }} · {{ assignment.exercise.title }}</p>
                </div>
                <div class="assignment-meta">
                  <span>截止：{{ formatDate(assignment.dueAt) }}</span>
                  <a class="primary-button" [routerLink]="['/cases', assignment.exercise.caseCode]">
                    进入案例
                  </a>
                </div>
              </article>
            } @empty {
              <p class="empty-state">当前教学班还没有发布实验任务。</p>
            }
          </div>
        </section>

        <section class="content-band">
          <div class="band-heading">
            <div>
              <p class="section-kicker">教学班</p>
              <h2>课程组织</h2>
            </div>
          </div>

          <div class="section-list">
            @for (section of course()?.currentTerm?.sections ?? []; track section.id) {
              <div class="section-row">
                <strong>{{ section.name }}</strong>
                <span>{{ section.assignments.length }} 个任务</span>
              </div>
            } @empty {
              <p class="empty-state">暂无教学班信息。</p>
            }
          </div>
        </section>

        <section class="content-band">
          <div class="band-heading">
            <div>
              <p class="section-kicker">实验索引</p>
              <h2>已接入 API 的实验</h2>
            </div>
          </div>

          <div class="exercise-grid">
            @for (exercise of exercises(); track exercise.id) {
              <article class="exercise-card">
                <span>{{ exercise.case.code }}</span>
                <h3>{{ exercise.case.title }}</h3>
                <p>{{ exercise.title }}</p>
                <small>{{ exercise.case.knowledgePoints.join(' / ') }}</small>
              </article>
            } @empty {
              <p class="empty-state">暂无实验数据。</p>
            }
          </div>
        </section>
      }
    </section>
  `,
})
export class CourseHomeComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly course = signal<CurrentCourseResponse | null>(null);
  protected readonly exercises = signal<ExerciseListItem[]>([]);
  protected readonly assignments = computed(() =>
    this.course()?.currentTerm?.sections.flatMap((section) => section.assignments) ?? [],
  );
  protected readonly sectionCount = computed(() => this.course()?.currentTerm?.sections.length ?? 0);
  protected readonly assignmentCount = computed(() => this.assignments().length);

  ngOnInit() {
    forkJoin({
      course: this.api.currentCourse(),
      exercises: this.api.exercises(),
    }).subscribe({
      next: ({ course, exercises }) => {
        this.course.set(course);
        this.exercises.set(exercises);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('课程首页数据读取失败，请确认后端、数据库和前端代理已启动。');
        this.loading.set(false);
      },
    });
  }

  protected formatDate(value?: string) {
    if (!value) {
      return '未设置';
    }

    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
