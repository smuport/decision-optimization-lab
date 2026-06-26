# Git 工作流与提交规范

> 本文档规定本项目后续代码仓库管理、分支命名、提交信息和提交粒度。后续由 Codex 或人工协作提交代码时，均应遵守本文档。

---

## 1. 基本原则

- `main` 始终保持可运行、可回滚、可对外展示。
- 每次提交只表达一个清晰目的，避免把无关修改混在一起。
- 文档、工程配置、前端、后端、课程资产、评测脚本尽量分开提交。
- 提交前检查 `.gitignore`，不得提交 `.env`、密钥、token、数据库快照、`node_modules`、构建产物和本地缓存。
- 涉及远端仓库创建、push、公开仓库设置等操作前，必须再次确认仓库名、组织、可见性和提交信息。

---

## 2. 分支策略

MVP 阶段采用轻量分支策略：

```text
main
├── feature/week2-monorepo
├── feature/shared-models
├── feature/backend-prisma
├── feature/frontend-workspace
└── fix/runner-result-mapping
```

规则：

- `main`：主分支，保存已验收成果。
- `feature/*`：新增功能。
- `fix/*`：缺陷修复。
- `docs/*`：文档调整。
- `chore/*`：工具链、目录、依赖、配置调整。
- `refactor/*`：不改变外部行为的结构调整。

当前项目规模下可以暂不设长期 `develop` 分支。等多人频繁协作、CI/CD 和发布节奏稳定后，再考虑 `main + develop + release/*`。

---

## 3. Commit Message 格式

采用 Conventional Commits 风格，但提交说明必须使用中文描述：

```text
<type>(<scope>): <subject>
```

`type` 和 `scope` 使用英文关键字以兼容工具生态；`subject` 必须使用中文，说明本次提交做了什么。`scope` 可选，但推荐使用。

示例：

```text
docs(plans): 新增 Week2 每日实施计划
chore(repo): 初始化 pnpm workspace 和 turbo 配置
feat(shared): 新增提交结果 DTO
feat(backend): 新增课程实体 Prisma schema
feat(frontend): 新增 case01 工作台页面
fix(runner): 规范无效输出的错误提示
```

---

## 4. Type 约定

| type | 使用场景 |
|------|----------|
| `feat` | 新增用户可见功能或平台能力 |
| `fix` | 修复缺陷、错误行为、异常结果 |
| `docs` | 文档新增或修改 |
| `chore` | 构建、依赖、脚本、目录、配置等杂项 |
| `refactor` | 不改变外部行为的代码结构调整 |
| `test` | 新增或修改测试 |
| `style` | 代码格式调整，不影响逻辑 |
| `perf` | 性能优化 |
| `ci` | CI/CD 配置 |
| `build` | 构建系统或打包配置 |
| `revert` | 回滚提交 |

---

## 5. Scope 约定

推荐 scope：

| scope | 范围 |
|-------|------|
| `repo` | 仓库结构、根配置、monorepo 工具 |
| `docs` | 通用文档 |
| `plans` | 工作计划 |
| `design` | 设计文档 |
| `shared` | `packages/shared` |
| `frontend` | Angular 前端 |
| `backend` | NestJS 后端 |
| `prisma` | Prisma schema、迁移、seed |
| `runner` | 本地评测 runner |
| `assets` | `course-assets` |
| `case01` | case_01 专项内容 |
| `teacher` | 教师端功能 |
| `auth` | 登录、认证、用户身份 |

---

## 6. 提交粒度

推荐把 Week2 拆成这些提交：

```text
docs(design): 整理设计文档结构
chore(repo): 初始化 pnpm workspace 和 turbo
feat(shared): 新增核心 API 响应和结果模型
feat(prisma): 新增 MVP 数据库 schema 和种子数据
feat(backend): 新增课程和实验 API 模块
feat(backend): 新增作业提交接口
feat(frontend): 新增课程首页和登录骨架
feat(frontend): 新增 case01 详情页
feat(frontend): 新增工作台提交流程
feat(teacher): 新增教师端最小进度面板
docs(acceptance): 新增 1.1 版本验收清单
```

避免这种提交：

```text
update files
fix bug
week2
misc changes
```

---

## 7. 提交前检查

每次提交前至少检查：

```bash
git status --short
```

如果涉及 TypeScript 工程，优先执行：

```bash
pnpm turbo typecheck
```

如果涉及构建：

```bash
pnpm turbo build
```

如果只改文档，可不运行构建，但提交说明中应明确是文档调整。

---

## 8. GitHub 仓库管理

计划在 `smuport` 组织下创建公有仓库时，推荐使用 GitHub CLI：

```bash
gh auth login
gh repo create smuport/decision-optimization-lab --public --source=. --remote=origin --push
```

安全要求：

- 不在聊天中发送 GitHub 密码、token 或 2FA 验证码。
- 由用户本人在本机完成 `gh auth login`。
- Codex 仅使用本机已授权的 `gh` / `git` 执行操作。
- 创建远端仓库、首次 push、修改仓库可见性前必须再次确认。

---

## 9. Codex 协作约定

当 Codex 代为提交时，应遵守：

- 提交前展示或总结将要提交的文件范围。
- 不把用户未要求的无关修改混入提交。
- 不自动提交密钥、环境文件、本地缓存和构建产物。
- 大任务按阶段拆 commit，不堆成一个巨大提交。
- 不使用破坏性 Git 命令，除非用户明确要求并确认。
