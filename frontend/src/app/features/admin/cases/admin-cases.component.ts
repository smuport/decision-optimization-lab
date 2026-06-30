import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { AdminCaseListItemDto, CaseStatus, PaginationMeta } from '@decision-lab/shared';
import { finalize } from 'rxjs';
import { ApiClientService } from '../../../core/api-client.service';

@Component({
  selector: 'dol-admin-cases',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="admin-page">
      <header class="page-heading">
        <div>
          <p class="section-kicker">内容管理</p>
          <h1>案例目录</h1>
          <p>维护课程共享案例的元数据、发布状态和练习入口。</p>
        </div>
        <a class="primary-link" routerLink="/admin/cases/new">新建案例</a>
      </header>

      <section class="admin-toolbar" aria-label="案例筛选">
        <label>搜索
          <input [(ngModel)]="keyword" (keyup.enter)="applyFilters()" placeholder="案例编码或标题" />
        </label>
        <label>状态
          <select [(ngModel)]="status" (ngModelChange)="applyFilters()">
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已发布</option>
            <option value="ARCHIVED">已归档</option>
          </select>
        </label>
        <button class="secondary-button" type="button" (click)="applyFilters()">查询</button>
      </section>

      @if (loading()) {
        <div class="status-strip">正在读取案例目录...</div>
      } @else if (error()) {
        <div class="status-strip error">{{ error() }}</div>
      } @else {
        <section class="content-band admin-table-band">
          <div class="band-heading">
            <h2>案例</h2>
            <span>共 {{ pagination().total }} 条</span>
          </div>
          <div class="teacher-table-wrap">
            <table class="teacher-table admin-case-table">
              <thead><tr><th>排序</th><th>案例</th><th>分类</th><th>难度</th><th>练习</th><th>状态</th><th>更新时间</th><th></th></tr></thead>
              <tbody>
                @for (item of cases(); track item.id) {
                  <tr>
                    <td>{{ item.sortOrder }}</td>
                    <td><span class="case-code">{{ item.code }}</span><strong>{{ item.title }}</strong><small>{{ item.subtitle ?? '-' }}</small></td>
                    <td>{{ categoryText(item.category) }}</td>
                    <td>{{ difficultyText(item.difficulty) }}</td>
                    <td>{{ item.exerciseCount }}</td>
                    <td><span class="status-label" [class.success]="item.status === 'PUBLISHED'">{{ statusText(item.status) }}</span></td>
                    <td>{{ formatDate(item.updatedAt) }}</td>
                    <td><a class="table-link" [routerLink]="['/admin/cases', item.id]">管理</a></td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="empty-cell">没有符合条件的案例。</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (pagination().totalPages > 1) {
            <nav class="pagination" aria-label="案例分页">
              <button class="ghost-button" type="button" [disabled]="pagination().page <= 1" (click)="changePage(pagination().page - 1)">上一页</button>
              <span>第 {{ pagination().page }} / {{ pagination().totalPages }} 页</span>
              <button class="ghost-button" type="button" [disabled]="pagination().page >= pagination().totalPages" (click)="changePage(pagination().page + 1)">下一页</button>
            </nav>
          }
        </section>
      }
    </section>
  `,
})
export class AdminCasesComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  protected keyword = '';
  protected status: '' | CaseStatus = '';
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cases = signal<AdminCaseListItemDto[]>([]);
  protected readonly pagination = signal<PaginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  ngOnInit() { this.load(1); }
  protected applyFilters() { this.load(1); }
  protected changePage(page: number) { this.load(page); }
  protected statusText(status: CaseStatus) { return { DRAFT: '草稿', PUBLISHED: '已发布', ARCHIVED: '已归档' }[status]; }
  protected difficultyText(value: string) { return { EASY: '入门', MEDIUM: '中等', HARD: '进阶' }[value] ?? value; }
  protected categoryText(value: string) { return { LINEAR_PROGRAMMING: '线性规划', INTEGER_PROGRAMMING: '整数规划', HEURISTIC: '启发式', META_HEURISTIC: '元启发式', REPORT_ANALYSIS: '报告分析' }[value] ?? value; }
  protected formatDate(value: string) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)); }

  private load(page: number) {
    this.loading.set(true);
    this.error.set(null);
    this.api.adminCases({ page, pageSize: 20, keyword: this.keyword.trim() || undefined, status: this.status || undefined }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (result) => { this.cases.set(result.list); this.pagination.set(result.pagination); },
      error: () => this.error.set('案例目录读取失败，请稍后重试。'),
    });
  }
}
