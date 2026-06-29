# 项目目录结构设计

> 本文档记录当前项目基础目录结构和后续扩展方向。实施时以 `../plans/WEEK3_BUILD_PLAN.md` 和本文件为准，不再沿用旧版一次性完整 OJ 目录。

---

## 1. 当前基础结构

```text
decision-optimization-lab/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── .codex/
│   └── config.toml
├── .npmrc
├── .nvmrc
├── .gitignore
├── docker-compose.yml
├── setup.sh
├── scripts/
│   └── dev.sh
│
├── docs/
│   ├── README.md
│   ├── PROJECT_STATE.md
│   ├── design/
│   │   ├── ARCHITECTURE.md
│   │   ├── DATABASE_DESIGN.md
│   │   ├── BACKEND_API_DESIGN.md
│   │   ├── FRONTEND_DESIGN.md
│   │   ├── AUTO_EVALUATION_DESIGN.md
│   │   └── PROJECT_STRUCTURE.md
│   ├── plans/
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   ├── WEEK1_BUILD_PLAN.md
│   │   ├── WEEK2_BUILD_PLAN.md
│   │   └── WEEK3_BUILD_PLAN.md
│   ├── acceptance/
│   │   ├── VERSION_1_ACCEPTANCE.md
│   │   ├── VERSION_1_1_ACCEPTANCE.md
│   │   └── VERSION_1_2_ACCEPTANCE.md
│   ├── guides/
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── GIT_WORKFLOW.md
│   │   └── IMPLEMENTATION_GUARDRAILS.md
│   ├── references/
│   │   └── angular/
│   │       ├── README.md
│   │       └── llms.txt
│   └── decisions/
│       ├── ADR-0001-mvp-architecture.md
│       ├── ADR-0002-monorepo-strategy.md
│       ├── ADR-0003-shared-api-models.md
│       ├── ADR-0004-github-and-ai-collaboration.md
│       └── ADR-0005-case-exercise-release-assignment-model.md
│
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── styles.css
│   │   └── app/
│   │       ├── app.component.ts
│   │       ├── app.routes.ts
│   │       ├── core/
│   │       │   ├── api-client.service.ts
│   │       │   └── auth-state.service.ts
│   │       └── features/
│   │           ├── login/
│   │           ├── course-home/
│   │           ├── cases/
│   │           ├── submissions/
│   │           ├── teacher/
│   │           └── workspace/
│   ├── angular.json
│   ├── proxy.conf.json
│   ├── tsconfig.app.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── prisma.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   ├── common/
│   │   ├── courses/
│   │   ├── enrollments/
│   │   ├── exercises/
│   │   ├── health/
│   │   ├── prisma/
│   │   ├── reports/
│   │   ├── runner-adapter/
│   │   ├── submissions/
│   │   └── teacher/
│   ├── storage/
│   │   ├── submissions/
│   │   └── results/
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── course-assets/
│   ├── cases/
│   │   └── case_01/
│   │       ├── datasets/
│   │       ├── template.py
│   │       ├── validator.py
│   │       ├── rubric.json
│   │       └── case_manifest.json
│   └── manifests/
│
├── runner/
│   ├── evaluate.py
│   ├── schemas/
│   ├── tests/
│   ├── demo_submissions/
│   └── output/
│
├── frontend-static/
├── submission-service/
└── storage/
    ├── submissions/
    └── results/
```

---

## 2. 目录职责

| 目录 | 职责 | 当前阶段 |
|------|------|----------|
| `docs/design` | 系统架构、数据库、API、前端、评测和项目结构设计 | 设计依据 |
| `docs/plans` | 总体计划和各周实施计划；当前 active plan 为 Week3 | 工作计划 |
| `docs/acceptance` | 阶段验收记录 | 验收归档 |
| `docs/guides` | 部署、操作、运维指南 | 后续完善 |
| `docs/references` | 外部官方参考资料归档，例如 Angular 官方 LLM 文档索引 | Day4 前端参考 |
| `docs/decisions` | ADR 架构决策记录 | 防止决策漂移 |
| `docs/PROJECT_STATE.md` | 当前阶段、已完成、下一步、未决问题 | 项目外部记忆 |
| `AGENTS.md` | AI/Codex 项目级实施指令 | 防偏离入口 |
| `.codex/config.toml` | 项目级 Codex 权限意图：工作区权限、按需审批、有限网络/localhost | 沙箱问题处理 |
| `.env.example` | 本地开发数据库连接示例，默认 PostgreSQL 映射到 `55432` | Day2 数据库配置 |
| `docker-compose.yml` | Week2 本地 PostgreSQL 14 开发数据库，不包含 Redis/MinIO/evaluator | Day2 数据库配置 |
| `frontend` | Angular 主前端；已包含 app shell、登录、课程首页、case01 详情页、实验工作区、提交详情页、教师面板、API client 和 auth state | Week2 已完成，Week3 待扩展管理页 |
| `backend` | NestJS 主后端；Week2 API 与同步 runner 已完成 | Week3 待新增管理模块 |
| `backend/prisma` | Prisma schema、migration 和 seed | Week2 Day2 初始化 |
| `backend/src/prisma` | 后端唯一 Prisma Client 访问层，前端禁止直接使用 Prisma Client | Week2 Day3 初始化 |
| `backend/src/runner-adapter` | Week2 同步调用 `runner/evaluate.py` 的本地评测适配层 | Week2 Day3 初始化 |
| `backend/src/auth` | JWT 登录、当前用户、全局认证/角色 guard、装饰器和教学班归属服务 | Week3 Day2 已完成 |
| `backend/src/courses` | 当前课程、学期、班级和任务读取接口 | Week2 Day3 初始化 |
| `backend/src/enrollments` | 教师端学生名单导入接口 | Week2 Day3 初始化 |
| `backend/src/exercises` | 实验列表、详情、数据集、模板读取接口 | Week2 Day3 初始化 |
| `backend/src/submissions` | 提交创建、状态、结果查询接口 | Week2 Day3 初始化 |
| `backend/src/reports` | 实验报告入口预留接口，不实现完整报告流程 | Week2 Day3 初始化 |
| `backend/src/teacher` | 教师端进度、提交列表、人工评分入口预留接口 | Week2 Day3 初始化 |
| `packages/shared` | 前后台共享 DTO、枚举、schema、API 类型 | Week2 已接通，Week3 待补管理契约 |
| `.nvmrc` | 固定推荐 Node LTS 版本 | Day1 验收环境 |
| `.npmrc` | 固定 npm/pnpm 国内镜像源 | 中国网络环境依赖安装 |
| `scripts/dev.sh` | 一键启动 Angular 前端和 NestJS 后端 | 本地开发入口 |
| `course-assets` | 标准化课程资产；Case 保存通用内容，Exercise 子目录保存模板、公开/隐藏数据、rubric 和 validator | Week3 调整目标 |
| `runner` | Week1 本地评测 Runner | Week2 由 backend adapter 调用 |
| `frontend-static` | Week1 静态门户 demo | legacy，仅保留参考 |
| `submission-service` | Week1 过渡提交服务 | legacy，后续并入 backend |
| `storage` | 本地运行文件占位 | MVP 本地文件策略 |

---

## 3. Monorepo 规则

前期使用 `pnpm workspace + Turborepo`：

```text
pnpm-workspace.yaml 负责声明 workspace 包
turbo.json          负责 dev/build/typecheck/test 任务编排
tsconfig.base.json  负责共享 TypeScript 基础配置
```

本地包引用必须使用 workspace 包名：

```json
{
  "dependencies": {
    "@decision-lab/shared": "workspace:*"
  }
}
```

前后端代码必须这样引用 shared：

```ts
import type { RunResultDto } from '@decision-lab/shared';
```

禁止这样跨包引用：

```ts
import type { RunResultDto } from '../../packages/shared/src';
```

---

## 4. Week2 目标结构

Week2 完成后，目标结构应进一步变为：

```text
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   ├── shared/
│   │   └── features/
│   │       ├── auth/
│   │       ├── course-home/
│   │       ├── cases/
│   │       ├── workspace/
│   │       ├── submissions/
│   │       └── teacher/
│   └── environments/
├── angular.json
├── package.json
└── tsconfig.json

backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   ├── prisma/
│   ├── auth/
│   ├── courses/
│   ├── enrollments/
│   ├── cases/
│   ├── exercises/
│   ├── assignments/
│   ├── submissions/
│   ├── reports/
│   ├── teacher/
│   └── runner-adapter/
├── storage/
│   ├── submissions/
│   └── results/
├── package.json
└── tsconfig.json

packages/shared/
├── src/
│   ├── index.ts
│   ├── api.ts
│   ├── enums.ts
│   ├── dto/
│   └── schemas/
├── package.json
└── tsconfig.json
```

---

## 5. Week3 目标增量

Week3 实施完成后新增以下目录，不在文档调整阶段提前创建空模块：

```text
frontend/src/app/features/
├── admin/
│   ├── cases/
│   └── exercises/
└── teacher/
    ├── sections/
    └── assignments/

backend/src/
├── cases/
├── case-releases/
└── assignments/

course-assets/cases/case_01/
├── case_manifest.json
├── README.md
└── exercises/
    └── production_planning/
        ├── exercise_manifest.json
        ├── datasets/
        ├── template.py
        ├── validator.py
        └── rubric.json
```

case01 资产迁移必须保留兼容读取，不能在数据库迁移和 runner 切换完成前删除旧路径。

---

## 6. 后置结构

以下目录或模块只在后续阶段引入：

- `evaluator/`：独立评测服务。
- `nginx/`：生产反向代理配置。
- `scripts/`：正式 seed、备份、恢复、运维脚本。
- `infra/`：部署环境、监控、CI/CD 配置。
- `frontend` 中的 Monaco、多文件工程、复杂可视化模块。
- `backend` 中的 Redis/BullMQ、MinIO、WebSocket、排行榜、审计日志模块。

后置能力不应进入 Week3 主线，除非计划文档更新并明确调整范围。

---

## 7. 本地 Node 版本说明

- `.nvmrc` 保留 Node 22 LTS 作为推荐环境和后续 CI 基线。
- 当前本机默认 `node v23.5.0` 已验证可运行 backend/shared 构建，并可在非沙箱环境完成 Angular build。
- 如果 Codex 沙箱内 `pnpm --filter frontend build` 出现 `SIGABRT`，优先按沙箱/进程权限问题处理，不要直接判定为 Node 版本不兼容。

---

## 8. 本地开发端口

为避免与用户本地已有服务冲突，当前 Week2 开发端口约定为：

- Backend NestJS: `PORT=3002 pnpm --filter backend dev`
- Frontend Angular: `pnpm --filter frontend dev`，脚本固定使用 `--port 4300`
- Frontend dev proxy: `frontend/proxy.conf.json` 将 `/api` 转发到 `http://localhost:3002`

如果后续端口再次冲突，应优先调整本项目端口和 proxy 配置，不要误判为 Angular 或 NestJS 代码问题。
