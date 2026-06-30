# 决策与优化实验平台 (Decision & Optimization Lab)

> **定位修订**: 本平台优先服务课程教学闭环，而不是一开始就建设完整竞赛 OJ。
> **推荐路线**: 课程资产标准化 → 静态课程门户 → 本地评测原型 → 最小在线提交平台 → 沙箱与教学管理增强。
> **技术栈建议**: Angular 当前 LTS/活跃版本 + NestJS + PostgreSQL + Docker；Redis/MinIO/BullMQ 在 MVP 后按并发和运维需要引入。
> **课程**: 工程系统决策与优化（研究生）
> **案例覆盖**: case_01 ~ case_18，共 18 个实验案例

## 当前版本

Week2 MVP（Version 1.1）已完成学生与教师最小教学闭环：课程首页、case01 教学指南、实验工作区、同步自动评测、提交详情和教师进度面板。当前仍是本地教学试运行版本，鉴权、报告和人工评分保留为后续入口。

Week3 已完成设计，下一步建设 ADMIN 案例/练习目录、TEACHER 教学班案例发布与作业管理，以及 STUDENT 严格班级可见性。Week3 继续使用 case01，不扩展其他案例。

---

## 重要修订说明

原始方案较完整，但偏向“企业级在线评测系统”一次性建设。结合当前课程案例资源，建议把第一目标改为：

1. 让学生能在线阅读案例、下载数据和模板。
2. 让教师能把案例逐步整理成可自动评测的实验任务。
3. 先跑通少量代表案例的评测闭环，再扩展到全部案例。
4. 把排行榜、复杂对象存储、分布式队列、监控告警等能力后置。

当前真实案例并非天然统一：线性规划、运输问题、分配问题、TSP 模拟退火、遗传算法等案例的输入、输出、评分逻辑不同。因此平台必须先建立“课程资产标准化”层，否则后端和前端即使搭好也难以稳定接入案例。

详细实施路径见新增文档：

- `AGENTS.md`：AI/Codex 项目级实施指令
- `docs/PROJECT_STATE.md`：当前阶段、已完成事项、下一步和未决问题
- `docs/plans/IMPLEMENTATION_PLAN.md`：总体递进式实施路线
- `docs/plans/WEEK1_BUILD_PLAN.md`：第一周 1.0 Demo 构建计划
- `docs/acceptance/VERSION_1_ACCEPTANCE.md`：第一周 1.0 验收记录
- `docs/plans/WEEK2_BUILD_PLAN.md`：下周真实系统骨架建设计划
- `docs/plans/WEEK3_BUILD_PLAN.md`：案例、练习、班级可见性与作业管理计划
- `docs/acceptance/VERSION_1_2_ACCEPTANCE.md`：Week3 管理控制面验收计划

## 快速启动

首次进入项目后：

```bash
corepack enable
pnpm install
```

启动本地 PostgreSQL 14 开发数据库：

```bash
pnpm db:up
pnpm --filter backend prisma:generate
pnpm --filter backend exec prisma db push --schema prisma/schema.prisma
pnpm --filter backend prisma:seed
```

默认数据库端口为 `55432`，用于避开本机可能已有的 PostgreSQL `5432`。

同时启动前端和后端：

```bash
pnpm dev:app
```

默认地址：

- 前端：`http://localhost:4300`
- 后端健康检查：`http://localhost:3002/api/v1/health`

如果本机已有服务占用端口：

```bash
FRONTEND_PORT=4301 BACKEND_PORT=3003 pnpm dev:app
```

Codex 沙箱内启动 dev server 或访问 localhost 可能需要按需审批；本地终端可直接执行上述命令。

Version 1.1 主要页面：

- `/`：当前课程与实验任务
- `/cases/case_01`：case01 教学指南与资源包
- `/exercises/exercise-case01-production-planning/workspace`：代码提交工作区
- `/submissions/:submissionId`：提交详情与结构化反馈
- `/teacher`：班级进度、平均分和提交列表

详细验收结果见 `docs/acceptance/VERSION_1_1_ACCEPTANCE.md`。

## 一、项目概述

本实验平台是《工程系统决策与优化》课程的配套在线实验系统，支持学生：

- **理论学习**：在线阅读数学建模入门、PuLP 编程入门、各案例理论文档
- **数据下载**：下载已发布练习的小/中/大规模公开数据集
- **代码框架下载**：获取已发布练习的代码基础框架（Python 空函数 + 测试接口）
- **在线实验**：上传 Python 代码，后台按案例评测规则运行公开/隐藏算例
- **成绩评测**：根据可行性、目标值、GAP、运行时间、鲁棒性、实验报告等综合评分
- **教学反馈**：教师查看班级进度、常见错误、提交记录和报告质量

### 核心功能矩阵

| 功能 | 学生端 | 教师端 | 后台系统 |
|------|--------|--------|----------|
| 课程文档阅读 | ✅ | ✅ | — |
| 数据集下载 | ✅ | ✅ | — |
| 代码框架下载 | ✅ | ✅ | — |
| 代码上传与运行 | ✅ | ✅ 查看 | ✅ |
| 自动评分 | ✅ 查看成绩 | ✅ 查看全班 | ✅ |
| 实验报告/反思 | ✅ 提交 | ✅ 批注/补评分 | ✅ |
| 班级/学期管理 | — | ✅ | ✅ |
| 案例管理 | — | ✅ | — |
| 用户管理 | — | ✅ | — |
| 运行日志审计 | — | ✅ | ✅ |

---

## 二、课程资产标准化优先级

在正式开发在线平台前，应先为每个案例补齐如下文件或字段：

| 资产 | 说明 | 优先级 |
|------|------|--------|
| `case_manifest.json` | 案例编号、标题、分类、难度和知识点 | P0 |
| `exercise_manifest.json` | 练习编码、入口函数、输出规范和资产路径 | P0 |
| `README.md` | 学生可读的理论、建模、算法与实验说明 | P0 |
| `exercises/<code>/datasets/public/*.json` | 公开数据集，供下载和本地调试 | P0 |
| `exercises/<code>/datasets/hidden/*.json` | 隐藏评测数据，只在服务端使用 | P1 |
| `exercises/<code>/template.py` | 学生提交代码模板，定义统一函数接口 | P0 |
| `exercises/<code>/validator.py` | 该练习的评测器，负责可行性与指标计算 | P0 |
| `exercises/<code>/rubric.json` | 评分规则版本，支持自动评分和教师补评分 | P0 |
| `reference_solution.py` | 教师参考实现，不对学生公开 | P1 |
| `visualization_schema.json` | 路线图、收敛曲线、资源利用率等可视化数据格式 | P2 |

案例建议分为三类接入：

| 类型 | 代表案例 | 评测方式 |
|------|----------|----------|
| 精确建模题 | case_01 线性规划、case_03 运输、case_04 分配 | 最优目标值、变量可行性、约束违反量、影子价格等 |
| 启发式/元启发式题 | case_16 模拟退火、case_17 遗传算法 | 路线合法性、目标值、GAP、运行时间、收敛数据 |
| 理解分析题 | 对偶、影子价格、算法解释类内容 | 选择题/填空/报告/教师补评分，不强行代码评测 |

## 三、技术栈选型

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Angular | 使用当前活跃支持版本 | 单页应用框架 |
| TypeScript | 5.x | 类型安全 |
| Angular Material | 与 Angular 主版本一致 | UI 组件库 |
| RxJS | 7.x | 响应式编程 |
| Monaco Editor | 0.47 | 在线代码编辑器（VS Code 同款） |
| ECharts | 5.x | 数据可视化（收敛曲线、路线图） |
| Markdown + KaTeX/MathJax | 与前端框架兼容 | Markdown 与数学公式渲染 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 10.x | Node.js 服务端框架 |
| TypeScript | 5.x | 类型安全 |
| Prisma | 5.x | ORM 数据库访问层 |
| PostgreSQL | 16+ | 关系型数据库 |
| Redis | 7.x | 缓存 + 任务队列（MVP 后引入） |
| BullMQ | 5.x | 基于 Redis 的任务队列（MVP 后引入） |
| Docker SDK | — | 容器化执行学生代码（沙箱安全） |
| JWT | — | 用户认证 |
| Swagger | — | API 文档自动生成 |
| Winston | — | 日志系统 |

### 基础设施

| 技术 | 用途 |
|------|------|
| Docker + Docker Compose | 开发/部署容器化 |
| Nginx | 反向代理 + 静态文件服务 |
| 本地文件存储 | MVP 阶段保存提交、数据集、日志 |
| MinIO | 对象存储（并发或多机部署后引入） |
| Prometheus + Grafana | 监控告警（正式运行后可选） |

---

## 四、目录结构

```
decision-optimization-lab/
├── AGENTS.md                          ← AI/Codex 项目级实施指令
├── README.md                          ← 本文件
├── package.json                       ← pnpm workspace 根配置
├── pnpm-workspace.yaml                ← workspace 包范围
├── turbo.json                         ← Turborepo 任务编排
├── tsconfig.base.json                 ← 前后端共享 TypeScript 基础配置
├── .npmrc                             ← npm/pnpm 国内镜像源配置
├── .nvmrc                             ← 推荐 Node LTS 版本
├── .gitignore                         ← Git 忽略规则
├── docker-compose.yml                 ← Docker 编排配置
├── setup.sh                           ← 一键初始化脚本
│
├── docs/
│   ├── README.md                      ← 文档索引
│   ├── PROJECT_STATE.md               ← 当前项目状态与下一步
│   ├── design/                        ← 设计文档
│   │   ├── ARCHITECTURE.md
│   │   ├── DATABASE_DESIGN.md
│   │   ├── BACKEND_API_DESIGN.md
│   │   ├── FRONTEND_DESIGN.md
│   │   ├── AUTO_EVALUATION_DESIGN.md
│   │   └── PROJECT_STRUCTURE.md
│   ├── plans/                         ← 工作计划
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   ├── WEEK1_BUILD_PLAN.md
│   │   └── WEEK2_BUILD_PLAN.md
│   ├── acceptance/                    ← 验收记录
│   │   └── VERSION_1_ACCEPTANCE.md
│   ├── guides/                        ← 操作指南
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── GIT_WORKFLOW.md
│   │   └── IMPLEMENTATION_GUARDRAILS.md
│   └── decisions/                     ← 架构决策记录 ADR
│       ├── ADR-0001-mvp-architecture.md
│       ├── ADR-0002-monorepo-strategy.md
│       ├── ADR-0003-shared-api-models.md
│       └── ADR-0004-github-and-ai-collaboration.md
│
├── course-assets/                     ← 标准化课程资产
│   ├── cases/
│   │   ├── case_01/
│   │   │   ├── case_manifest.json
│   │   │   ├── README.md
│   │   │   └── exercises/
│   │   │       └── production_planning/
│   │   │           ├── exercise_manifest.json
│   │   │           ├── template.py
│   │   │           ├── validator.py
│   │   │           ├── rubric.json
│   │   │           └── datasets/
│   │   └── ...
│   └── manifests/
│
├── backend/                           ← NestJS 后端项目
│   ├── prisma/
│   │   └── .gitkeep
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── health/
│   ├── storage/                       ← MVP 本地提交与结果文件
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                          ← Angular 前端项目
│   ├── src/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   ├── tsconfig.app.json
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   └── shared/                        ← 前后台共享 DTO/schema/type
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── frontend-static/                   ← Week1 legacy 静态门户 demo
│   ├── index.html
│   ├── app.js
│   ├── portal-data.js
│   └── styles.css
│
├── runner/                            ← Week1 本地评测 Runner
├── submission-service/                ← Week1 过渡提交服务
└── storage/                           ← 根级本地运行文件占位
```

---

## 五、快速启动（开发环境）

> 注意：`docker-compose.yml` 描述的是完整形态。第一阶段建议先按 `docs/plans/IMPLEMENTATION_PLAN.md` 做静态门户和本地评测原型，不必一次启动全部服务。

### 前置依赖

- Docker & Docker Compose
- Node.js 20+ (用于本地开发，非必须)
- Python 3.11+ (用于 evaluator 开发)

### 一键启动

```bash
# 1. 克隆项目
git clone <repo-url> decision-optimization-lab
cd decision-optimization-lab

# 2. 初始化环境
chmod +x setup.sh
./setup.sh

# 3. 启动 PostgreSQL 并初始化
pnpm db:up
pnpm --filter backend exec prisma db push --schema prisma/schema.prisma
pnpm --filter backend prisma:seed

# 4. 启动前后端
pnpm dev:app
```

### 服务端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 (Angular) | 4300 | 开发服务器 |
| 后端 (NestJS) | 3002 | REST API |
| 数据库 (PostgreSQL) | 55432 | Docker Compose 开发端口 |

Week2 不启动 Redis、BullMQ、MinIO、独立 Evaluator 或 Nginx；本地 runner 由 NestJS 同步调用。

---

## 六、核心模块说明

### 5.1 案例管理模块

每个案例包含：
- **元数据**: 编号、名称、分类、难度、知识点标签
- **理论文档**: Markdown 格式的数学模型、算法讲解
- **数据集**: small / medium / large 三种规模（JSON 格式）
- **代码框架**: 含空函数和接口定义的 Python 模板文件
- **评测脚本**: 标准答案生成 + 结果比对逻辑
- **参考实现**: 教师端可见的标准答案（可选）
- **评分规则**: 自动评分权重、阈值、人工评分项、版本号
- **教学任务**: 截止时间、可提交次数、公开/隐藏数据配置

### 5.2 自动评测引擎

评测流程：

```
学生上传代码 → 存储到 MinIO → 提交评测任务到 BullMQ
                                            ↓
                                    Evaluator 消费任务
                                            ↓
                                    Docker 沙箱执行代码
                                            ↓
                                    对比标准结果 → 生成评分
                                            ↓
                                    写回数据库 + 推送 WebSocket
```

评测维度：
- **可行性**: 是否满足约束、路线/分配/流量是否合法
- **正确性**: 结果与标准答案或基准答案的误差（GAP）
- **效率**: 运行时间是否超时
- **鲁棒性**: 不同规模算例是否都能求解
- **解释能力**: 实验报告、关键指标解读、参数分析（部分案例）
- **代码质量**: 语法检查、危险导入检查、风格检查（可选）

### 5.3 沙箱安全机制

学生代码在 Docker 容器中运行，限制：
- **CPU**: 限制核心数（如 2 核）
- **内存**: 限制最大内存（如 512MB）
- **时间**: 最大运行时间（如 60 秒）
- **网络**: 禁止网络访问
- **文件系统**: 只读挂载数据集，只写输出目录
- **依赖白名单**: 统一冻结课程允许使用的 Python 包版本
- **宿主隔离**: 生产环境应评估 rootless Docker、独立评测机或更强隔离，避免直接把 Docker socket 暴露给不可信路径

---

## 六、用户角色

| 角色 | 权限 |
|------|------|
| **学生** | 阅读文档、下载数据/框架、上传代码、查看个人成绩 |
| **助教** | 学生权限 + 查看全班提交、手动重评、成绩导出 |
| **教师** | 助教权限 + 案例 CRUD、用户管理、系统配置 |
| **管理员** | 全部权限 + 日志审计、系统监控 |

---

## 七、开发规范

### 7.1 Git 工作流

本项目采用轻量分支策略和 Conventional Commits 风格。详细规则见 [Git 工作流与提交规范](docs/guides/GIT_WORKFLOW.md)。

### 7.2 提交规范

```text
docs(plans): add week2 daily implementation plan
chore(repo): initialize pnpm workspace and turbo config
feat(shared): add submission result dto
fix(runner): normalize invalid output messages
```

### 7.3 代码规范

- **后端**: ESLint + Prettier + NestJS 官方规范
- **前端**: ESLint + Prettier + Angular 官方规范
- **Python 评测脚本**: Black + isort + flake8

---

## 八、相关文档索引

| 文档 | 内容 | 阅读建议 |
|------|------|----------|
| [docs/README.md](docs/README.md) | 文档总索引 | 所有人必读 |
| [AGENTS.md](AGENTS.md) | AI/Codex 项目级实施指令 | AI 协作必读 |
| [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) | 当前阶段、已完成、下一步、未决问题 | 每次实施前必读 |
| [docs/design/ARCHITECTURE.md](docs/design/ARCHITECTURE.md) | 系统架构、模块划分、数据流 | 所有人必读 |
| [docs/design/DATABASE_DESIGN.md](docs/design/DATABASE_DESIGN.md) | E-R 图、表结构、Prisma schema | 后端开发必读 |
| [docs/design/BACKEND_API_DESIGN.md](docs/design/BACKEND_API_DESIGN.md) | REST API 定义、DTO、Swagger | 前后端开发必读 |
| [docs/design/FRONTEND_DESIGN.md](docs/design/FRONTEND_DESIGN.md) | 页面路由、组件结构、状态管理 | 前端开发必读 |
| [docs/design/AUTO_EVALUATION_DESIGN.md](docs/design/AUTO_EVALUATION_DESIGN.md) | 评测流程、沙箱安全、评分标准 | 评测引擎开发必读 |
| [docs/guides/DEPLOYMENT_GUIDE.md](docs/guides/DEPLOYMENT_GUIDE.md) | 生产环境部署、SSL、备份 | 运维必读 |
| [docs/guides/GIT_WORKFLOW.md](docs/guides/GIT_WORKFLOW.md) | Git 工作流、提交规范、GitHub 安全协作 | 协作者必读 |
| [docs/guides/IMPLEMENTATION_GUARDRAILS.md](docs/guides/IMPLEMENTATION_GUARDRAILS.md) | 实施范围、技术栈和停止确认条件 | AI 协作必读 |

---

## 九、联系与贡献

- 课程教师: [联系邮箱]
- 技术负责人: [联系邮箱]
- 问题反馈: 提交 GitHub Issue

---

> 本实验平台基于 Docker 容器化部署，支持本地开发、服务器部署、云原生部署（K8s）等多种模式。
