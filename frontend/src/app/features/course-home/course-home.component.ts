import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { CurrentCourseResponse, StudentAssignmentDto, StudentCaseDto } from '@decision-lab/shared';
import { ApiClientService } from '../../core/api-client.service';
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
        @if (notice()) { <div class="status-strip">{{ notice() }}</div> }
        <div class="summary-grid">
          <section class="metric-card">
            <span>学期</span>
            <strong>{{ course()?.currentTerm?.name ?? '未配置' }}</strong>
          </section>
          <section class="metric-card">
            <span>教学班</span>
            <strong>{{ sectionCount() }}</strong>
          </section>
          <section class="metric-card"><span>可见案例</span><strong>{{ cases().length }}</strong></section>
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
            @for (item of cases(); track item.id) {
              <article class="assignment-row">
                <div>
                  <span class="case-code">{{ item.code }}</span>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.summary ?? item.subtitle }}</p>
                </div>
                <div class="assignment-meta">
                  <span>{{ item.assignments.length ? item.assignments.length + ' 个已发布练习' : '暂无已发布练习' }}</span>
                  <a class="primary-button" [routerLink]="['/cases', item.id]">
                    进入案例
                  </a>
                </div>
              </article>
            } @empty {
              <p class="empty-state">当前教学班还没有可见案例。</p>
            }
          </div>
        </section>

        <section class="content-band"><div class="band-heading"><div><p class="section-kicker">我的作业</p><h2>按作业规则进入工作区</h2></div></div><div class="assignment-list">@for (item of assignments(); track item.id) { <article class="assignment-row"><div><span class="case-code">{{ item.exercise.case.code }}</span><h3>{{ item.title }}</h3><p>{{ item.exercise.title }} · {{ availabilityText(item.availability) }}</p></div><div class="assignment-meta"><span>剩余次数：{{ item.remainingAttempts ?? '不限' }}</span><a class="primary-button" [routerLink]="['/assignments', item.id, 'workspace']">{{ item.canSubmit ? '进入工作区' : '查看作业' }}</a></div></article> } @empty { <p class="empty-state">当前没有已发布作业。</p> }</div></section>

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

      }
    </section>
  `,
})
export class CourseHomeComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthStateService);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly course = signal<CurrentCourseResponse | null>(null);
  protected readonly cases = signal<StudentCaseDto[]>([]);
  protected readonly assignments = signal<StudentAssignmentDto[]>([]);
  protected readonly notice = signal(this.route.snapshot.queryParamMap.get('notice'));
  protected readonly sectionCount = computed(() => this.course()?.currentTerm?.sections.length ?? 0);

  ngOnInit() {
    forkJoin({
      course: this.api.currentCourse(),
      cases: this.api.studentCases(),
      assignments: this.api.studentAssignments(),
    }).subscribe({
      next: ({ course, cases, assignments }) => {
        this.course.set(course);
        this.cases.set(cases);
        this.assignments.set(assignments);
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

  protected availabilityText(value: string) { return ({ UPCOMING: '尚未开放', OPEN: '开放中', LATE: '迟交阶段', CLOSED: '已关闭' } as Record<string,string>)[value] ?? value; }
}
