import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import {
  ApiClientService,
  type DatasetDownloadInfo,
  type ExerciseDetail,
  type ExerciseListItem,
} from '../../core/api-client.service';
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
            @if (isCase01() && exerciseDetail()?.id) {
              <a class="primary-button" [routerLink]="['/exercises', exerciseDetail()?.id, 'workspace']">
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

                  <section class="resource-package">
                    <div>
                      <p class="section-kicker">案例资源包</p>
                      <h3>下载模板和公开数据集</h3>
                      <p>{{ case01.resourcePackage.description }}</p>
                    </div>
                    <a class="primary-button" [href]="resourcePackagePath()">下载本案例资源包</a>
                  </section>

                  <div class="resource-list">
                    @for (item of case01.resourcePackage.items; track item.name) {
                      <div>
                        <strong>{{ item.name }}</strong>
                        <span>{{ item.description }}</span>
                      </div>
                    }
                  </div>
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
                    <a class="secondary-button" [href]="resourcePackagePath()">下载资源包</a>
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
                        Day6 将实现在线工作区和真实提交页面；Day5 先把进入工作区的路径、输出结构和评分理解准备好。
                      </p>
                    </div>
                    @if (exerciseDetail()?.id) {
                      <a class="primary-button" [routerLink]="['/exercises', exerciseDetail()?.id, 'workspace']">
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
  protected readonly exercise = signal<ExerciseListItem | null>(null);
  protected readonly exerciseDetail = signal<ExerciseDetail | null>(null);
  protected readonly datasetDownloads = signal<DatasetDownloadInfo[]>([]);
  protected readonly templateContent = signal<string | null>(null);
  protected readonly caseSummary = computed<CaseSummaryContent | null>(() => {
    const exercise = this.exercise();
    if (exercise) {
      return {
        code: exercise.case.code,
        title: exercise.case.title,
        subtitle: exercise.case.subtitle ?? '',
        difficulty: exercise.case.difficulty as CaseSummaryContent['difficulty'],
        knowledgePoints: exercise.case.knowledgePoints,
        summary: exercise.case.subtitle ?? '',
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
      .exercises()
      .pipe(
        switchMap((exercises) => {
          const exercise =
            exercises.find((item) => item.case.code === caseId || item.case.id === caseId) ?? null;
          this.exercise.set(exercise);

          if (!exercise) {
            return of({ detail: null, datasets: [], template: null });
          }

          return forkJoin({
            detail: this.api.exercise(exercise.id),
            datasets: this.api.exerciseDatasets(exercise.id),
            template: this.api.exerciseTemplate(exercise.id),
          });
        }),
      )
      .subscribe({
        next: ({ detail, datasets, template }) => {
          this.exerciseDetail.set(detail);
          this.datasetDownloads.set(datasets);
          this.templateContent.set(template?.content ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('案例内容读取失败，请确认后端和数据库已启动。');
          this.loading.set(false);
        },
      });
  }

  protected isCase01() {
    return this.currentCaseId() === CASE_01_CONTENT.code;
  }

  protected difficultyText(value?: string) {
    const map: Record<string, string> = {
      EASY: '简单',
      MEDIUM: '中等',
      HARD: '困难',
    };

    return value ? map[value] ?? value : '未设置';
  }

  protected templateFilename() {
    return this.exerciseDetail()?.template?.filename ?? 'template.py';
  }

  protected resourcePackagePath() {
    const id = this.exerciseDetail()?.id;
    return id ? `/api/v1/exercises/${id}/resources/download` : '#';
  }

  private currentCaseId() {
    return this.route.snapshot.paramMap.get('caseId');
  }
}
