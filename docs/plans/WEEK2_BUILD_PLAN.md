# Week2 构建计划：从 Demo 升级到可操作教学平台骨架

## 1. 目标

Week1 已完成“课程资产 + 本地评测 + 静态门户”的验证闭环，但还不是设计文档定义的基本系统架构。Week2 的目标是进入 S2 MVP 阶段：按修订后的架构搭建 Angular + NestJS + Prisma + PostgreSQL 平台骨架，建立前后台共享数据模型，实现可操作前端，并把 `case_01` 做成第一个高质量教学样板案例。

Week2 不追求完整在线评测平台，而是追求真实教学闭环：

```text
登录/进入课程 → 查看本周实验 → 阅读 case01 指南
→ 进入实验工作区 → 提交代码 → 查看结构化反馈
→ 查看提交详情 → 教师查看进度与提交列表
```

---

## 2. 设计文档依据

本计划严格以修订后的设计文档为准：

- `../design/ARCHITECTURE.md`：采用 S2 MVP 架构，即 Angular 前端 + NestJS 后端 + Prisma + PostgreSQL + 本地评测 Runner。
- `../design/DATABASE_DESIGN.md`：MVP 建表覆盖教学组织、实验内容、提交评测、成绩反馈四个域。
- `../design/BACKEND_API_DESIGN.md`：提交 API 使用 assignment-centric 路由，即 `POST /api/v1/assignments/:id/submissions`。
- `../design/FRONTEND_DESIGN.md`：MVP 页面围绕课程首页、案例详情、实验工作区、提交详情和教师面板展开。

旧版一次性建设 Redis、BullMQ、MinIO、独立 FastAPI Evaluator 的架构不作为 Week2 实施依据。

---

## 3. 技术栈与工程结构

### 3.1 技术栈

- 前端：Angular 当前 active support 主版本。实施时优先使用最新 active 版本；若本机 Node 版本不满足，则选择兼容的 active support 版本。
- 后端：NestJS + Prisma。
- 数据库：PostgreSQL。
- 共享模型：`packages/shared`，存放 DTO、枚举、Zod schema、API response 类型。
- Monorepo 管理：前期使用 `pnpm workspace + Turborepo`；中后期可迁移到 Nx。
- 评测：复用 Week1 `runner/evaluate.py`，通过 NestJS `runner-adapter` 同步调用。
- 文件：Week2 使用后端本地目录保存提交代码和结果文件。

### 3.2 Monorepo 结构

```text
decision-optimization-lab/
├── frontend/              # Angular app
├── backend/               # NestJS app
├── packages/shared/       # 前后台共享 DTO/schema/type
├── course-assets/         # 已有案例资产
├── runner/                # 已有本地评测器
├── frontend-static/       # Week1 legacy demo
├── submission-service/    # Week1 过渡服务，Week2 不再作为主入口
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

共享模型规则：

- `packages/shared` 是唯一前后台 DTO 来源。
- 后端 Prisma schema 负责数据库持久化模型。
- 后端 Controller 输入输出必须使用 shared DTO 或由 shared schema 推导。
- 前端 API client、表单、页面展示必须使用 shared DTO。
- 不允许前端手写一套与后端重复的接口类型。

Monorepo 工具规则：

- 使用 `pnpm workspace` 管理 `frontend`、`backend`、`packages/shared`。
- 使用 Turborepo 编排 `dev`、`build`、`typecheck`、`test`。
- 根目录脚本使用 `turbo` 调度，不再使用 `npm --workspace` 作为主命令。
- `frontend` 和 `backend` 通过 `"@decision-lab/shared": "workspace:*"` 引用 shared。
- 禁止通过 `../../packages/shared/src` 这类相对路径跨包引用 shared。
- 每个项目保留独立 `package.json`，并提供一致的 `dev`、`build`、`typecheck`、`test` 脚本。
- 根目录维护统一 `tsconfig.base.json`，为后续迁移 Nx 保持项目图清晰。
- Turborepo 只承担任务编排和缓存，不承担业务边界约束；中后期如需 affected build、module boundary 和 Angular/NestJS 生成器，再迁移 Nx。

---

## 4. Week2 数据模型范围

Week2 建立 Prisma schema、迁移和 seed，覆盖设计文档中的 MVP 表：

- `User`
- `Course`
- `Term`
- `ClassSection`
- `Enrollment`
- `Case`
- `Exercise`
- `Assignment`
- `Dataset`
- `Template`
- `Rubric`
- `Submission`
- `RunResult`
- `Score`
- `Report`
- `ManualGrade`

Week2 后置：

- `Leaderboard`
- `AuditLog`
- `SystemConfig`
- MinIO file object
- 完整 Feedback / 批注流

`Report` 和 `ManualGrade` 的 Week2 边界：

- 建表。
- shared 类型纳入。
- 提交详情页预留报告入口。
- 教师端预留人工评分入口。
- 不实现完整报告编辑、批注、附件上传和人工评分流程。

核心字段原则：

- 所有业务表用 `id String @id @default(uuid())`。
- 教学内容表保留 `sortOrder`。
- `Dataset.visibility` 使用 `PUBLIC | HIDDEN`。
- `Submission.status` 使用 `QUEUED | RUNNING | SUCCESS | FAILED | RUNTIME_ERROR | INVALID_OUTPUT`。
- `RunResult` 保存通用评测结果：`status`、`isFeasible`、`objective`、`optimalObjective`、`gap`、`score`、`metrics Json`、`messages Json`、`artifacts Json`。
- `Score` 记录 assignment、user、section 维度的当前最佳成绩，避免多学期成绩混淆。

---

## 5. Week2 API 范围

Week2 实现或预留以下 API：

```text
GET  /api/v1/health

POST /api/v1/auth/login
GET  /api/v1/auth/me

GET  /api/v1/courses/current
GET  /api/v1/terms/current/sections
POST /api/v1/admin/sections/:id/enrollments/import

GET  /api/v1/exercises
GET  /api/v1/exercises/:id
GET  /api/v1/exercises/:id/datasets
GET  /api/v1/exercises/:id/template

POST /api/v1/assignments/:id/submissions
GET  /api/v1/submissions/:id
GET  /api/v1/submissions/:id/results
POST /api/v1/submissions/:id/report

GET  /api/v1/teacher/sections/:id/progress
GET  /api/v1/teacher/assignments/:id/submissions
PATCH /api/v1/teacher/submissions/:id/manual-grade
```

Week2 可用同步 runner 返回结果，但接口结构必须保留状态查询和结果查询，避免后续改异步队列时破坏前端。

---

## 6. Week2 前端范围

前端必须从 Week1 静态门户升级为 Angular 可操作界面。MVP 页面：

```text
/auth/login
/
/cases/:caseId
/exercises/:exerciseId/workspace
/submissions/:submissionId
/teacher
```

页面行为：

- `/auth/login`：支持演示登录或学号登录，形成鉴权入口。
- `/`：课程首页，展示当前课程、教学班、本周实验、截止时间和进入按钮。
- `/cases/:caseId`：展示案例介绍、数据集、模板、学习路线。
- `/exercises/:exerciseId/workspace`：左侧教学指南，中间代码编辑/textarea，右侧运行结果和报告入口占位。
- `/submissions/:submissionId`：展示状态、分数、objective、optimalObjective、gap、messages、artifacts、报告入口占位。
- `/teacher`：展示班级进度、通过率、提交列表和人工评分入口占位。

前端组件要求：

- 代码编辑 Week2 先用 `<textarea>`，Monaco 后置。
- 评测结果必须展示：状态、分数、objective、optimalObjective、gap、messages。
- `case_01` 页面必须有 tabs：`问题介绍`、`模型构建`、`PuLP 求解`、`提交实验`。
- 前端所有 API 类型从 `packages/shared` 导入。

---

## 7. Case01 教学样板内容

Week2 将 `case_01` 打造成唯一深度样板案例，内容进入 seed 和前端页面。

### 7.1 问题介绍

包含：

- 工厂生产 A/B 产品场景。
- 产品利润。
- 资源约束。
- 决策目标。
- small 数据集表格化展示。

### 7.2 规划模型构建指南

必须展示：

```text
决策变量：
x_A >= 0, x_B >= 0

目标函数：
max Z = 4x_A + 3x_B

资源约束：
2x_A + x_B <= 20
x_A + 2x_B <= 20
```

必须解释：

- 决策变量是什么。
- 目标函数为什么这样写。
- 约束如何从资源消耗表得到。
- 非负约束的含义。
- 最优解和影子价格的教学意义。

### 7.3 PuLP 求解构建指南

必须提供可运行代码片段：

```python
from pulp import LpMaximize, LpProblem, LpVariable, value

model = LpProblem("production_planning", LpMaximize)
x_A = LpVariable("x_A", lowBound=0)
x_B = LpVariable("x_B", lowBound=0)

model += 4 * x_A + 3 * x_B
model += 2 * x_A + x_B <= 20
model += x_A + 2 * x_B <= 20

model.solve()

print(value(model.objective))
print(x_A.value(), x_B.value())
```

必须解释：

- `LpProblem`
- `LpVariable`
- `model +=`
- `model.solve()`
- `value(model.objective)`
- 如何读取变量值和约束影子价格。

### 7.4 提交模板

`case_01` workspace 默认代码：

```python
def solve(data, params=None):
    return {
        "objective": 0,
        "solution": {
            "产品A": 0,
            "产品B": 0
        },
        "metrics": {
            "shadow_prices": {},
            "resource_usage": {}
        }
    }
```

---

## 8. 每日实施计划

### Day 1：统一设计口径与搭建工程骨架

目标：

- 删除旧架构影响，确立 S2 MVP 为唯一 Week2 实施口径。
- 建立 Angular、NestJS、shared package 的 monorepo 基础。

交付：

- 初始化 `frontend/` Angular app。
- 初始化 `backend/` NestJS app。
- 初始化 `packages/shared/`。
- 配置 `pnpm-workspace.yaml`。
- 配置 `turbo.json`。
- 配置根目录 scripts：`dev`、`build`、`typecheck`、`test`。
- 配置各项目 scripts：`dev`、`build`、`typecheck`、`test`。
- 配置 `tsconfig.base.json`。
- `frontend-static/` 标记为 Week1 legacy demo，不再作为主平台入口。
- `backend` 实现 `GET /api/v1/health`。
- `packages/shared` 导出基础 `ApiResponse<T>`、分页类型、错误类型、枚举骨架。

验收：

- 前端能启动并显示基础布局。
- 后端 `/api/v1/health` 返回 OK。
- shared package 能被前后端 import。
- `pnpm --filter @decision-lab/shared build` 可执行。
- `pnpm turbo typecheck` 可执行。
- 根目录构建脚本不会与 Week1 文件冲突。

风险控制：

- 若本机 Node 不满足最新 Angular active 版本，先记录版本约束，再选择兼容的 active support 版本。
- Day 1 不做业务页面细节，避免工程初始化拖延后续数据模型。

### Day 2：Prisma 数据模型、迁移与 Seed

目标：

- 按数据库设计文档建立 MVP 核心表。
- 让前后端共享类型与数据库模型形成稳定映射。

交付：

- `backend/prisma/schema.prisma`。
- PostgreSQL 开发环境配置。
- Prisma migrate。
- seed 脚本导入：
  - 当前课程。
  - 当前学期。
  - 一个教学班。
  - demo teacher。
  - demo student。
  - demo enrollment。
  - `case_01`、`case_04`、`case_16`。
  - `case_01` exercise、assignment、datasets、template、rubric。
- `Report`、`ManualGrade` 建表和 Prisma relation。
- `packages/shared` 补齐 `UserRole`、`DatasetVisibility`、`SubmissionStatus`、`ExerciseKind`、`RunResultDto`、`ReportDto`、`ManualGradeDto`。

验收：

- `npx prisma validate` 成功。
- `prisma migrate dev` 成功。
- `prisma db seed` 成功。
- 查询脚本或 Prisma Studio 能看到课程、班级、学生、案例、任务、作业、提交相关空表。
- `Report` 和 `ManualGrade` 表存在，但功能入口仍为占位。

风险控制：

- 不把 Prisma Client 类型直接传给前端。
- 先保证 `case_01` seed 质量，`case_04` 和 `case_16` 只保证基础元数据可用。

### Day 3：NestJS MVP API 与 Runner Adapter

目标：

- 按 `../design/BACKEND_API_DESIGN.md` 的修订路由实现后端最小闭环。
- 将 Week1 runner 纳入 NestJS，而不是继续依赖独立过渡服务。

交付：

- Auth module：
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- Course module：
  - `GET /api/v1/courses/current`
  - `GET /api/v1/terms/current/sections`
- Enrollment admin module：
  - `POST /api/v1/admin/sections/:id/enrollments/import`
- Exercise module：
  - `GET /api/v1/exercises`
  - `GET /api/v1/exercises/:id`
  - `GET /api/v1/exercises/:id/datasets`
  - `GET /api/v1/exercises/:id/template`
- Submission module：
  - `POST /api/v1/assignments/:id/submissions`
  - `GET /api/v1/submissions/:id`
  - `GET /api/v1/submissions/:id/results`
- Report placeholder：
  - `POST /api/v1/submissions/:id/report`
- Teacher module：
  - `GET /api/v1/teacher/sections/:id/progress`
  - `GET /api/v1/teacher/assignments/:id/submissions`
  - `PATCH /api/v1/teacher/submissions/:id/manual-grade`
- `runner-adapter` 同步调用 `runner/evaluate.py`，保存 `Submission` 和 `RunResult`。

验收：

- `GET /api/v1/exercises` 返回 seed 中的实验任务。
- `GET /api/v1/exercises/:id` 返回 `case_01` 任务详情和教学内容索引。
- `POST /api/v1/assignments/:id/submissions` 提交 `case_01` demo code 后创建 Submission。
- `GET /api/v1/submissions/:id/results` 返回结构化 `RunResultDto`。
- 错误提交返回可读 `messages`。
- 报告和人工评分接口可以返回占位成功或明确的 `501/NOT_IMPLEMENTED`，但路由和类型存在。

风险控制：

- 即使 runner 同步执行，API response 也保留 `submissionId`、`statusUrl`、`resultUrl`。
- Day 3 不做 WebSocket，不做队列。

### Day 4：Angular 基础布局、登录与课程首页

目标：

- 建立可操作前端的入口，让学生从课程首页进入本周实验。
- 接入 shared DTO 和真实 API client。

交付：

- Angular app shell：顶部栏、主内容区、基础导航。
- `/auth/login` 页面。
- `/` 课程首页：
  - 当前课程。
  - 当前学期和教学班。
  - 本周实验任务。
  - 截止时间。
  - 进入 case01 按钮。
- API client service。
- Auth state 最小实现。
- 全局错误提示和加载状态。

验收：

- 可通过演示账号登录或进入演示登录态。
- 课程首页数据来自 `GET /api/v1/courses/current` 和 exercise/assignment API。
- 页面能跳转到 `case_01` 详情。
- 前端类型从 `packages/shared` 导入。

风险控制：

- 登录先满足教学演示，不扩展第三方登录、找回密码、复杂权限配置。
- 页面布局按工作台思路保持紧凑，不做营销式首页。

### Day 5：Case01 详情页与教学内容深化

目标：

- 把 `case_01` 做成可直接用于课堂的样板案例。
- 让学生在进入工作区前理解问题、模型和 PuLP 实现路径。

交付：

- `/cases/:caseId` 页面。
- `case_01` tabs：
  - `问题介绍`
  - `模型构建`
  - `PuLP 求解`
  - `提交实验`
- small 数据集表格展示。
- 资源约束、目标函数、决策变量说明。
- PuLP 示例代码块。
- 数据集下载入口。
- 模板查看或下载入口。
- case 资源包下载入口，资源包内包含文件说明。
- 进入工作区按钮。

验收：

- 浏览器可查看 `case_01` 完整教学内容。
- 学生能从页面理解输入、输出、评分规则。
- PuLP 示例代码与课程资产中的 `case_01` 数据一致。
- `case_04` 和 `case_16` 可显示基础信息，但不要求同等深度内容。

风险控制：

- Day 5 不扩展全部案例深度内容，集中把 `case_01` 打磨成标准样板。
- 教学内容进入 seed 或可维护的内容文件，避免硬编码散落在组件中。

### Day 6：实验工作区、提交详情与报告入口占位

状态：已于 2026-06-27 完成并通过类型检查、构建和真实 API 提交验证。

目标：

- 先补齐 shared/API 响应类型，消除前端 API response 本地重复定义。
- 跑通学生端核心实验闭环。
- 提交详情页预留报告入口，但不实现完整报告流程。

交付：

- shared 类型对齐：
  - `packages/shared` 补齐登录、课程首页、实验列表/详情、数据集入口、提交创建、提交详情、教师进度和教师提交列表响应类型。
  - `frontend/src/app/core/api-client.service.ts` 只从 `@decision-lab/shared` 导入 API 响应类型，不再定义重复的 response interface。
  - 组件内可保留纯 UI view model，但 API 契约必须来自 shared。
- `/exercises/:exerciseId/workspace`：
  - 左侧题目、数据、输入输出规范、评分规则。
  - 模板内容来自 `GET /api/v1/exercises/:id/template`。
  - 中间代码 textarea。
  - `localStorage` 草稿保存与恢复，key 固定为 `decision-lab.workspace.draft:{exerciseId}`。
  - 重置为模板按钮。
  - 数据集选择。
  - 资源包下载入口。
  - 提交按钮。
  - 右侧提交结果面板，展示 status、score、objective、optimalObjective、gap、messages。
  - 报告入口占位。
- `/submissions/:submissionId`：
  - 提交状态。
  - 分数。
  - `codeText` 只读回显。
  - objective、optimalObjective、gap。
  - messages。
  - artifacts/metrics JSON 或结构化摘要。
  - 报告入口占位。

验收：

- 可以在前端提交 `case_01` 默认代码。
- 正确代码返回 `SUCCESS`。
- 错误代码返回 `FAILED`、`RUNTIME_ERROR` 或 `INVALID_OUTPUT`，并显示可读消息。
- 提交后能跳转到提交详情。
- 提交详情页显示报告入口占位，不进入完整报告编辑。
- `api-client.service.ts` 不再定义与 shared 重复的 API response 类型。

风险控制：

- 先完成 shared 类型对齐，再实现页面，避免继续扩大前端类型漂移。
- 代码编辑先用 textarea，Monaco 后置。
- 不做多文件工程上传。
- 不做复杂可视化，只保证结构化反馈清楚。

### Day 7：教师面板、集成验收与文档收口

状态：已于 2026-06-28 完成。教师面板、真实数据库 API、精度修复后的提交链路和 Version 1.1 验收均已通过；当前运行环境未提供 in-app browser，因此未执行截图式视觉验收。

目标：

- 给教师提供最小可用的班级视图。
- 完成 Week2 版本验收文档和启动说明。

交付：

- `/teacher` 教师面板：
  - 从当前学期 section 列表默认选择第一个教学班。
  - 班级进度。
  - 提交总数。
  - 通过率。
  - 平均分 `averageScore`。
  - 提交列表。
  - 提交列表记录可跳转到 `/submissions/:submissionId`。
  - 人工评分入口占位。
- `VERSION_1_1_ACCEPTANCE.md`。
- 更新 `README.md` 的启动命令、Week2 状态、已知限制。
- 更新 API 列表。
- 更新数据模型说明。

验收：

- 教师面板数据来自后端 API。
- 可从教师面板进入某次提交详情。
- 人工评分入口存在但明确标记为后续完善。
- `case_01` 从“课程首页 → 案例详情 → workspace → 提交 → 结果 → 提交详情 → 教师查看”完整走通。

风险控制：

- 教师端只做进度与提交查看，不做完整成绩导出。
- Day 7 重点是集成验收，不再引入新技术栈。
- HTTP Authorization interceptor、全局错误提示和 404 页面仅作为时间允许时的增强，不作为 Week2 完成条件。

---

## 9. 测试计划

必须执行：

```bash
# shared
pnpm --filter @decision-lab/shared typecheck
pnpm --filter @decision-lab/shared build

# backend
pnpm --filter backend build
pnpm --filter backend test
npx prisma validate
npx prisma migrate status

# frontend
pnpm --filter frontend build
pnpm --filter frontend test -- --watch=false

# monorepo
pnpm turbo typecheck
pnpm turbo build
```

类型契约检查：

- `frontend/src/app/core/api-client.service.ts` 不应定义与后端响应重复的 API response interface。
- 前端 API client 使用的登录、课程、实验、提交、教师面板响应类型必须从 `@decision-lab/shared` 导入。

手动验收：

1. 打开 `/auth/login`，完成演示登录。
2. 进入课程首页，确认能看到当前课程与本周实验。
3. 进入 `case_01`，阅读问题介绍、模型构建与 PuLP 指南。
4. 进入 workspace。
5. 提交正确代码，确认 `SUCCESS`。
6. 提交错误代码，确认失败原因可读。
7. 打开提交详情，确认结果结构完整，报告入口占位存在。
8. 打开教师面板，确认进度、提交列表、人工评分入口占位存在。

核心验收场景：

- `case_01` 正确提交：`SUCCESS`，score >= 90，gap = 0。
- `case_01` 资源超限提交：失败或低分，messages 包含资源约束违反。
- `case_01` objective 不一致提交：失败或低分，messages 包含 objective 不一致。
- 前端刷新后仍能看到数据库中的提交详情。
- 前后端类型不重复手写，必须从 shared 导入。

---

## 10. Week2 明确不做

- Redis。
- BullMQ。
- MinIO。
- 独立 FastAPI Evaluator。
- Docker 沙箱。
- 排行榜。
- WebSocket 实时推送。
- Monaco Editor。
- 完整报告编辑、附件上传、批注流程。
- 完整人工评分工作流。
- 多课程管理。
- 正式生产部署。

---

## 11. 完成标准

Week2 完成时，应达到以下状态：

- 项目已经从 Week1 静态 demo 升级为真实 Angular + NestJS + PostgreSQL 平台骨架。
- Monorepo 采用 `pnpm workspace + Turborepo`，并保留未来迁移 Nx 的目录、脚本和 tsconfig 约束。
- 核心数据模型覆盖课程、学期、班级、名单、案例、实验、作业、提交、运行结果、成绩、报告、人工评分。
- API 路由与 `../design/BACKEND_API_DESIGN.md` 修订版保持一致。
- `case_01` 具备课堂可用的详细算例介绍、规划模型构建指南和 PuLP 求解指南。
- 学生端可以完成一次真实提交并查看结构化反馈。
- 教师端可以查看最小班级进度和提交列表。
- 报告和人工评分已建表、已入类型、已有入口，但完整功能后置。
