# 系统架构设计 (System Architecture)

> 本文档描述决策与优化实验平台的整体架构、模块划分、数据流和实施边界。当前版本以修订后的课程平台架构为唯一口径，旧版一次性建设 Redis、BullMQ、MinIO、独立 FastAPI Evaluator 的架构已删除。

---

## 1. 架构修订结论

实验平台不应从完整在线评测平台一次性起步，而应围绕课程资产和教学闭环递进建设。推荐采用三层架构路线：

| 阶段 | 架构目标 | 服务组成 | 适用场景 |
|------|----------|----------|----------|
| S1 静态课程门户 | 让课程资料可在线使用 | 前端静态站 + 标准化课程资产 | 资料阅读、数据下载、模板下载 |
| S2 最小评测闭环 | 跑通少量案例提交与评分 | Angular 前端 + NestJS 后端 + Prisma + PostgreSQL + 本地评测 Runner | 小班试点、3-5 个案例 |
| S3 完整平台 | 支持并发评测、队列、对象存储和运维 | S2 + Redis/BullMQ + 对象存储 + 独立评测节点 + Nginx | 全班正式使用、多学期复用 |

第一版的关键不是服务数量，而是课程资产接口稳定。所有架构都应围绕如下核心契约：

```text
Case Manifest + Dataset + Template + Validator + Rubric
        ↓
Submission Code
        ↓
Structured Evaluation Result
        ↓
Student Feedback + Teacher Dashboard
```

---

## 2. MVP 架构

Week2 起进入 S2 阶段，采用以下 MVP 架构：

```text
┌──────────────────────┐
│       Angular 前端    │
│ 登录/课程/案例/工作台 │
│ 提交详情/教师面板     │
└──────────┬───────────┘
           │ REST / JSON
┌──────────▼───────────┐
│       NestJS API      │
│ 用户/课程/案例/提交   │
│ 报告入口/人工评分入口 │
└──────────┬───────────┘
           │ Prisma
┌──────────▼───────────┐
│      PostgreSQL       │
│ 课程、班级、提交、成绩 │
│ 报告、人工评分记录     │
└──────────┬───────────┘
           │ local adapter
┌──────────▼───────────┐
│   本地评测 Runner     │
│ validator + sandbox   │
└──────────────────────┘
```

MVP 阶段暂不引入 Redis、BullMQ、MinIO、独立 Evaluator 服务和排行榜快照。提交代码、运行日志、公开数据集可先保存在服务器本地目录，并通过数据库记录路径、hash 和结构化结果。等评测并发、部署复杂度或多机需求出现后，再迁移到队列、对象存储和独立评测节点。

---

## 3. Monorepo 结构

```text
decision-optimization-lab/
├── frontend/              # Angular app
├── backend/               # NestJS app
├── packages/
│   └── shared/            # 前后台共享 DTO、枚举、Zod schema、API 类型
├── course-assets/         # 标准化课程资产
├── runner/                # 本地评测 Runner
├── frontend-static/       # Week1 legacy demo
└── docs / *.md            # 设计与实施文档
```

共享模型规则：

- `packages/shared` 是前后台 DTO、枚举、校验 schema 和 API response 类型的唯一来源。
- Prisma schema 只负责数据库持久化模型，不直接暴露给前端作为接口契约。
- NestJS Controller 的输入输出必须引用 shared DTO 或由 shared schema 推导。
- Angular API client、表单、页面展示必须引用 shared 类型。
- 不允许前端和后端各自手写一套含义相同但结构可能漂移的接口类型。

### 3.1 Monorepo 工具策略

前期采用 `pnpm workspace + Turborepo`，中后期如果项目规模和工程治理需求上升，再迁移到 Nx。

推荐演进路线：

```text
MVP / Week2：
pnpm workspace + Turborepo

平台稳定后：
pnpm workspace + Nx

多团队或多模块规模扩大后：
Nx + module boundary + affected build + CI 策略
```

选择理由：

- `pnpm workspace` 负责本地包管理和 workspace 依赖解析，适合 `frontend`、`backend`、`packages/shared` 的当前规模。
- Turborepo 负责任务编排、缓存和并行执行，保持轻量，不强制生成器或项目结构。
- Nx 适合中后期引入更强的项目图、affected build、模块边界约束和 Angular/NestJS 生成器。
- Week2 不直接采用 Nx，避免工程工具本身拖慢 MVP 建设。

基础配置要求：

```text
decision-optimization-lab/
├── frontend/
├── backend/
├── packages/
│   └── shared/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

根目录脚本建议：

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  }
}
```

本地包引用规则：

```json
{
  "dependencies": {
    "@decision-lab/shared": "workspace:*"
  }
}
```

前端和后端必须通过包名引用 shared：

```ts
import type { SubmissionResultDto } from '@decision-lab/shared';
```

禁止通过相对路径跨包引用 shared 源码：

```ts
import type { SubmissionResultDto } from '../../packages/shared/src';
```

为后续迁移 Nx 预留的约束：

- 每个项目必须有独立 `package.json`。
- 每个项目的脚本命名保持一致：`dev`、`build`、`typecheck`、`test`。
- `packages/shared` 必须能独立构建和类型检查。
- 根目录维护统一 `tsconfig.base.json`，前后端和 shared 继承它。
- Turborepo 只承担任务依赖、缓存和并行执行，不承载业务模块边界规则。
- 不把实现路径写死在 Turborepo 配置中，避免后续迁移 Nx 时重构目录。

---

## 4. 核心模块

### 4.1 前端模块

MVP 前端围绕课程实验路径组织：

```text
阅读题目 → 理解模型/算法 → 下载或在线编辑模板
→ 用公开数据调试 → 提交评测 → 查看反馈 → 预留报告入口
```

MVP 页面范围：

| 页面 | 路由建议 | Week2 目标 |
|------|----------|------------|
| 登录页 | `/auth/login` | 学号登录或演示登录，形成后续鉴权入口 |
| 课程首页 | `/courses/current` 或 `/` | 当前课程、实验任务、截止时间 |
| 案例详情 | `/cases/:id` | Markdown、公式、数据、模板、case01 深度指南 |
| 实验工作区 | `/exercises/:id/workspace` | 左题目、中代码、右结果/报告入口 |
| 提交详情 | `/submissions/:id` | 结果、日志、各数据集反馈、报告入口占位 |
| 教师面板 | `/teacher` | 进度、通过率、提交列表、人工评分入口占位 |

### 4.2 后端模块

MVP 后端采用 NestJS 模块化结构：

```text
backend/src/
├── main.ts
├── app.module.ts
├── common/
├── prisma/
├── auth/
├── courses/
├── enrollments/
├── cases/
├── exercises/
├── assignments/
├── submissions/
├── reports/
├── teacher/
└── runner-adapter/
```

模块边界：

- `auth`：登录、当前用户、演示账号或学生激活入口。
- `courses`：当前课程、当前学期、教学班。
- `enrollments`：名单导入和班级学生。
- `cases` / `exercises`：案例与实验任务。
- `assignments`：班级维度的实验发布、截止时间和提交入口。
- `submissions`：创建提交、状态、结果、提交详情。
- `reports`：Week2 只保留报告提交入口与数据模型，不做完整报告流程。
- `teacher`：班级进度、提交列表、人工评分入口。
- `runner-adapter`：同步调用本地 runner，后续可替换为队列或独立评测服务。

---

## 5. 数据域

数据库分为四个域：

| 域 | 关键实体 | 说明 |
|----|----------|------|
| 教学组织 | Course、Term、ClassSection、Enrollment | 管理课程、学期、教学班、学生名单 |
| 实验内容 | Case、Exercise、Dataset、Template、Rubric | 管理案例、具体实验任务、数据、模板、评分规则 |
| 提交评测 | Submission、RunResult、EvaluationArtifact | 管理代码提交、各数据集运行结果、日志和可视化数据 |
| 成绩反馈 | Score、Report、ManualGrade、Feedback | 管理最佳成绩、实验报告、人工补评分和教师反馈 |

MVP 第一版实现以下表：

```text
users
courses
terms
class_sections
enrollments
cases
exercises
assignments
datasets
templates
rubrics
submissions
run_results
scores
reports
manual_grades
```

`leaderboards`、`audit_logs`、`system_configs` 后置。

---

## 6. API 边界

MVP API 以 `BACKEND_API_DESIGN.md` 的修订版为准：

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

Week2 可以采用同步本地评测实现，但接口响应仍应保留状态查询和结果查询结构，避免未来从同步 runner 切换到异步队列时破坏前端契约。

---

## 7. 文件与评测策略

MVP 文件策略：

- 学生代码保存到 `backend/storage/submissions/<submissionId>/solution.py`。
- 运行日志保存到 `backend/storage/results/<submissionId>.json` 或同级日志文件。
- 公开数据集继续来自 `course-assets/cases/<caseId>/datasets`。
- 数据库记录提交路径、结果路径、hash、状态、评分和结构化反馈。

本地 Runner 策略：

- NestJS 通过 adapter 调用 `runner/evaluate.py`。
- adapter 将 runner 输出转换为 shared `RunResultDto`。
- 评测结果必须包含 `status`、`isFeasible`、`objective`、`optimalObjective`、`gap`、`score`、`metrics`、`messages`、`artifacts`。
- 不同案例允许 `metrics` 和 `artifacts` 有不同结构，但顶层 DTO 保持统一。

---

## 8. 后置能力

以下能力明确后置，不进入 Week2 MVP：

- Redis / BullMQ 异步队列。
- MinIO 或其他对象存储。
- 独立评测服务和多机评测节点。
- 排行榜、周榜、排行榜快照。
- WebSocket 实时推送。
- 完整实验报告批注流。
- 完整人工评分工作流。
- 审计日志和正式生产监控。

进入后置能力的触发条件：

- 同时提交人数增加，单机同步评测影响课堂体验。
- 需要多机部署或对象持久化。
- 需要正式对外开放和长期运维。
- 教师需要多班、多学期复用，并导出正式成绩。
