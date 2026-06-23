# 项目目录结构设计

> 本文档记录当前项目基础目录结构和后续扩展方向。实施时以 `../plans/WEEK2_BUILD_PLAN.md` 和本文件为准，不再沿用旧版一次性完整 OJ 目录。

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
│   │   └── WEEK2_BUILD_PLAN.md
│   ├── acceptance/
│   │   └── VERSION_1_ACCEPTANCE.md
│   ├── guides/
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── GIT_WORKFLOW.md
│   │   └── IMPLEMENTATION_GUARDRAILS.md
│   └── decisions/
│       ├── ADR-0001-mvp-architecture.md
│       ├── ADR-0002-monorepo-strategy.md
│       ├── ADR-0003-shared-api-models.md
│       └── ADR-0004-github-and-ai-collaboration.md
│
├── frontend/
│   ├── src/
│   ├── angular.json
│   ├── tsconfig.app.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── health/
│   ├── storage/
│   │   ├── submissions/
│   │   └── results/
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
│   └── manifests/
│
├── runner/
│   ├── evaluate.py
│   ├── schemas/
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
| `docs/plans` | 总体计划、Week1 计划、Week2 计划 | 工作计划 |
| `docs/acceptance` | 阶段验收记录 | 验收归档 |
| `docs/guides` | 部署、操作、运维指南 | 后续完善 |
| `docs/decisions` | ADR 架构决策记录 | 防止决策漂移 |
| `docs/PROJECT_STATE.md` | 当前阶段、已完成、下一步、未决问题 | 项目外部记忆 |
| `AGENTS.md` | AI/Codex 项目级实施指令 | 防偏离入口 |
| `.codex/config.toml` | 项目级 Codex 权限意图：工作区权限、按需审批、有限网络/localhost | 沙箱问题处理 |
| `frontend` | Angular 主前端 | Week2 初始化 |
| `backend` | NestJS 主后端 | Week2 初始化 |
| `packages/shared` | 前后台共享 DTO、枚举、schema、API 类型 | Week2 初始化 |
| `.nvmrc` | 固定推荐 Node LTS 版本 | Day1 验收环境 |
| `.npmrc` | 固定 npm/pnpm 国内镜像源 | 中国网络环境依赖安装 |
| `scripts/dev.sh` | 一键启动 Angular 前端和 NestJS 后端 | 本地开发入口 |
| `course-assets` | 标准化课程案例资产 | 已有，持续扩展 |
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

## 5. 后置结构

以下目录或模块只在后续阶段引入：

- `evaluator/`：独立评测服务。
- `nginx/`：生产反向代理配置。
- `scripts/`：正式 seed、备份、恢复、运维脚本。
- `infra/`：部署环境、监控、CI/CD 配置。
- `frontend` 中的 Monaco、多文件工程、复杂可视化模块。
- `backend` 中的 Redis/BullMQ、MinIO、WebSocket、排行榜、审计日志模块。

后置能力不应进入 Week2 主线，除非计划文档更新并明确调整范围。
