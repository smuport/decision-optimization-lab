import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import type { StudentAssignmentDetailDto, StudentCaseDetailDto } from '@decision-lab/shared';
import { ApiClientService } from '../../core/api-client.service';
import { saveDownload } from '../../core/file-download';
import {
  CASE_01_CONTENT,
  CASE_SUMMARIES,
  CASE_TABS,
  type Case01Content,
  type CaseSummaryContent,
  type CaseTabKey,
} from './case-content';

@Component({
  selector: 'dol-case-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="case-detail-page">
      @if (loading()) {
        <div class="status-strip">正在读取案例内容...</div>
      } @else if (error()) {
        <div class="status-strip error">{{ error() }}</div>
      } @else if (caseSummary()) {
        <div class="page-heading case-hero">
          <div>
            <p class="section-kicker">{{ caseSummary()?.code }}</p>
            <h1>{{ caseSummary()?.title }}</h1>
            <p>{{ caseSummary()?.subtitle }}</p>
            <div class="tag-row">
              <span class="difficulty">{{ difficultyText(caseSummary()?.difficulty) }}</span>
              @for (point of caseSummary()?.knowledgePoints ?? []; track point) {
                <span>{{ point }}</span>
              }
            </div>
          </div>
          <div class="hero-actions">
            <a class="secondary-button" routerLink="/">返回课程首页</a>
            @if (isCase01() && primaryAssignment()) {
              <a class="primary-button" [routerLink]="['/assignments', primaryAssignment()?.id, 'workspace']">
                进入工作区
              </a>
            }
          </div>
        </div>

        @if (isCase01()) {
          <section class="content-band case-content-band">
            <div class="case-tabs" role="tablist" aria-label="case01 教学内容">
              @for (tab of tabs; track tab.key) {
                <button
                  type="button"
                  role="tab"
                  [class.active]="activeTab() === tab.key"
                  [attr.aria-selected]="activeTab() === tab.key"
                  (click)="activeTab.set(tab.key)"
                >
                  {{ tab.label }}
                </button>
              }
            </div>

            @switch (activeTab()) {
              @case ('intro') {
                <article class="case-section">
                  <div class="section-layout">
                    <div>
                      <p class="section-kicker">业务场景</p>
                      <h2>从生产描述到优化问题</h2>
                      <p>{{ case01.scenario }}</p>
                      <p>{{ case01.summary }}</p>
                    </div>
                    <aside class="compact-panel">
                      <strong>本页学习目标</strong>
                      <ul>
                        <li>识别决策变量</li>
                        <li>写出目标函数和资源约束</li>
                        <li>理解提交结果的结构</li>
                      </ul>
                    </aside>
                  </div>

                  <h3>small 数据集</h3>
                  <div class="data-table-wrap">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>项目</th>
                          <th>资源1消耗</th>
                          <th>资源2消耗</th>
                          <th>单位利润</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of case01.datasetRows; track row.product) {
                          <tr>
                            <td>{{ row.product }}</td>
                            <td>{{ row.resource1 }}</td>
                            <td>{{ row.resource2 }}</td>
                            <td>{{ row.profit }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  @if (primaryAssignment()) { <section class="resource-package">
                    <div>
                      <p class="section-kicker">练习资源包</p>
                      <h3>下载模板和公开数据集</h3>
                      <p>{{ case01.resourcePackage.description }}</p>
                    </div>
                    <button class="primary-button" type="button" (click)="downloadResources()">下载练习资源包</button>
                  </section> }

                  @if (primaryAssignment()) { <div class="resource-list">
                    @for (item of case01.resourcePackage.items; track item.name) {
                      <div>
                        <strong>{{ item.name }}</strong>
                        <span>{{ item.description }}</span>
                      </div>
                    }
                  </div> } @else { <div class="status-strip">该案例当前暂无已发布练习，可先阅读教学内容。</div> }
                </article>
              }

              @case ('modeling') {
                <article class="case-section">
                  <p class="section-kicker">规划模型构建指南</p>
                  <h2>把业务语言翻译为数学模型</h2>

                  <div class="model-grid">
                    <section class="formula-panel">
                      <h3>决策变量</h3>
                      <ul>
                        @for (item of case01.decisionVariables; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </section>
                    <section class="formula-panel emphasis">
                      <h3>目标函数</h3>
                      <code>{{ case01.objective }}</code>
                    </section>
                    <section class="formula-panel">
                      <h3>资源约束</h3>
                      <ul>
                        @for (constraint of case01.constraints; track constraint) {
                          <li><code>{{ constraint }}</code></li>
                        }
                      </ul>
                    </section>
                  </div>

                  <div class="explain-list">
                    @for (note of case01.modelingNotes; track note) {
                      <p>{{ note }}</p>
                    }
                  </div>
                </article>
              }

              @case ('pulp') {
                <article class="case-section">
                  <div class="section-layout">
                    <div>
                      <p class="section-kicker">PuLP 求解构建指南</p>
                      <h2>用代码表达线性规划模型</h2>
                      <p>
                        下面代码与 small 数据集中的利润和资源约束一致，可作为学生理解 PuLP 建模语法的最小样例。
                      </p>
                    </div>
                    @if (primaryAssignment()) { <button class="secondary-button" type="button" (click)="downloadResources()">下载练习资源包</button> }
                  </div>

                  <pre class="code-block"><code>{{ case01.pulpCode }}</code></pre>

                  <div class="explain-list two-column">
                    @for (note of case01.pulpNotes; track note) {
                      <p>{{ note }}</p>
                    }
                  </div>

                  @if (templateContent()) {
                    <details class="template-details">
                      <summary>查看平台提交模板 {{ templateFilename() }}</summary>
                      <pre class="code-block"><code>{{ templateContent() }}</code></pre>
                    </details>
                  }
                </article>
              }

              @case ('submission') {
                <article class="case-section">
                  <div class="section-layout">
                    <div>
                      <p class="section-kicker">提交实验</p>
                      <h2>提交前检查输入、输出与评分规则</h2>
                      <p>
                        在线工作区已接入模板、草稿保存、数据集选择和真实评测，可在提交前先核对输出结构与评分规则。
                      </p>
                    </div>
                    @if (primaryAssignment()) {
                      <a class="primary-button" [routerLink]="['/assignments', primaryAssignment()?.id, 'workspace']">
                        进入工作区
                      </a>
                    }
                  </div>

                  <div class="submission-grid">
                    <section class="compact-panel">
                      <h3>提交清单</h3>
                      <ul>
                        @for (item of case01.submissionChecklist; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </section>
                    <section class="compact-panel">
                      <h3>输出结构</h3>
                      <dl class="output-schema">
                        @for (item of case01.expectedOutput; track item.field) {
                          <div>
                            <dt>{{ item.field }}</dt>
                            <dd>{{ item.meaning }}</dd>
                          </div>
                        }
                      </dl>
                    </section>
                    <section class="compact-panel">
                      <h3>资源包使用步骤</h3>
                      <ul>
                        @for (item of case01.resourcePackage.usage; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </section>
                    <section class="compact-panel">
                      <h3>评分理解</h3>
                      <ul>
                        @for (item of case01.scoringNotes; track item) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </section>
                  </div>
                </article>
              }
            }
          </section>
        } @else {
          <section class="content-band">
            <div class="case-preview">
              <h2>{{ caseSummary()?.title }}</h2>
              <p>{{ caseSummary()?.summary }}</p>
              <dl>
                <div>
                  <dt>难度</dt>
                  <dd>{{ difficultyText(caseSummary()?.difficulty) }}</dd>
                </div>
                <div>
                  <dt>知识点</dt>
                  <dd>{{ caseSummary()?.knowledgePoints?.join(' / ') }}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>基础信息已接入，深度内容后置</dd>
                </div>
              </dl>
            </div>
          </section>
        }
      } @else {
        <div class="status-strip error">没有找到对应案例。</div>
      }
    </section>
  `,
})
export class CaseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiClientService);
  protected readonly tabs = CASE_TABS;
  protected readonly case01: Case01Content = CASE_01_CONTENT;
  protected readonly activeTab = signal<CaseTabKey>('intro');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly studentCase = signal<StudentCaseDetailDto | null>(null);
  protected readonly assignmentDetail = signal<StudentAssignmentDetailDto | null>(null);
  protected readonly templateContent = signal<string | null>(null);
  protected readonly caseSummary = computed<CaseSummaryContent | null>(() => {
    const item = this.studentCase();
    if (item) {
      return {
        code: item.code, title: item.title, subtitle: item.subtitle ?? '',
        difficulty: item.difficulty as CaseSummaryContent['difficulty'], knowledgePoints: item.knowledgePoints,
        summary: item.summary ?? item.subtitle ?? '',
      };
    }

    const caseId = this.currentCaseId();
    if (caseId === CASE_01_CONTENT.code) {
      return CASE_01_CONTENT;
    }

    return caseId ? CASE_SUMMARIES[caseId] ?? null : null;
  });

  ngOnInit() {
    const caseId = this.currentCaseId();
    if (!caseId) {
      this.error.set('缺少案例编号。');
      this.loading.set(false);
      return;
    }

    this.api
      .studentCase(caseId)
      .pipe(
        switchMap((item) => {
          this.studentCase.set(item);
          const assignmentId = item.assignments[0]?.id;
          if (!assignmentId) {
            return of(null);
          }
          return this.api.studentAssignment(assignmentId);
        }),
      )
      .subscribe({
        next: (assignment) => {
          this.assignmentDetail.set(assignment);
          this.templateContent.set(assignment?.template?.content ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('案例内容读取失败，请确认后端和数据库已启动。');
          this.loading.set(false);
        },
      });
  }

  protected isCase01() {
    return this.studentCase()?.code === CASE_01_CONTENT.code;
  }

  protected primaryAssignment() { return this.studentCase()?.assignments[0] ?? null; }

  protected difficultyText(value?: string) {
    const map: Record<string, string> = {
      EASY: '简单',
      MEDIUM: '中等',
      HARD: '困难',
    };

    return value ? map[value] ?? value : '未设置';
  }

  protected templateFilename() {
    return this.assignmentDetail()?.template?.filename ?? 'template.py';
  }

  protected downloadResources() {
    const id = this.primaryAssignment()?.id;
    if (!id) return;
    this.api.assignmentResources(id).subscribe({
      next: (blob) => saveDownload(blob, `${this.currentCaseId() ?? 'exercise'}-resources.zip`),
      error: () => this.error.set('练习资源包下载失败。'),
    });
  }

  private currentCaseId() {
    return this.route.snapshot.paramMap.get('caseId');
  }
}
