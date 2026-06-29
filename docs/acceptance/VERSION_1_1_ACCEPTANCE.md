# 教学实验平台 1.1 验收计划

> 版本目标：完成 Week2 MVP 平台骨架，让学生端提交闭环和教师端最小进度视图可演示。  
> 当前状态：通过。Day6/Day7 功能、自动验证、真实数据库 API 和精度修复后的提交链路均已验收。

---

## 一、验收范围

1. 登录并进入课程首页。
2. 从课程首页进入 `case_01` 详情页。
3. 从案例详情进入 `/exercises/:exerciseId/workspace`。
4. 在工作区加载模板、选择数据集、提交代码并查看结构化反馈。
5. 从提交结果进入 `/submissions/:submissionId`，查看状态、分数、目标值、gap、messages、metrics/artifacts 摘要和代码只读回显。
6. 打开 `/teacher`，查看班级进度、平均分、提交列表，并从提交列表进入提交详情。

---

## 二、核心验收场景

| 场景 | 预期结果 |
|------|----------|
| 正确提交 case01 demo code | 返回 `SUCCESS`，score >= 90，gap = 0，提交详情可查看结果 |
| 错误提交或资源超限提交 | 返回 `FAILED`、`RUNTIME_ERROR` 或 `INVALID_OUTPUT`，页面展示可读 messages |
| 教师查看提交 | `/teacher` 展示班级进度、`averageScore`、提交列表，点击提交可进入详情 |

---

## 三、手动验收清单

- [x] `/auth/login` 可完成 demo 登录。
- [x] `/` 可看到当前课程、本周实验和进入 case01 的入口。
- [x] `/cases/case_01` 可查看问题介绍、模型构建、PuLP 求解和提交实验说明。
- [x] `/exercises/:exerciseId/workspace` 默认加载模板代码。
- [x] 工作区草稿使用 `decision-lab.workspace.draft:{exerciseId}` 保存和恢复。
- [x] 工作区可以重置为模板。
- [x] 工作区可以选择公开数据集并提交。
- [x] 提交结果面板展示 status、score、objective、optimalObjective、gap 和 messages。
- [x] `/submissions/:submissionId` 展示结果摘要、metrics/artifacts 摘要和 `codeText` 只读回显。
- [x] `/teacher` 展示班级进度、平均分和提交列表。
- [x] 教师提交列表可跳转到提交详情。

---

## 四、验证命令

```bash
pnpm --filter @decision-lab/shared build
pnpm --filter backend typecheck
pnpm --filter backend build
pnpm --filter frontend exec ngc -p tsconfig.app.json
pnpm --filter frontend build
python3 -m unittest discover -s runner/tests -p 'test_*.py' -v
```

如 Angular build 在 Codex 沙箱内出现 `SIGABRT`，按项目规则使用 scoped approval 在非沙箱环境重跑同一命令，并在验收记录中注明差异。

### 4.1 本轮自动验证结果（2026-06-28）

| 验证项 | 结果 |
|--------|------|
| case01 浮点容差回归测试 | 3 项通过：四位小数最优解、真实约束违反、目标值明显不一致 |
| case01 demo runner | `SUCCESS`，score 95，gap 0 |
| shared build | 通过 |
| backend typecheck/build | 通过 |
| backend teacher tests | 2 项通过：有分数平均值、无分数返回 0 |
| Prisma validate | 通过 |
| Angular `ngc` | 通过 |
| Angular production build | 沙箱内 `SIGABRT`；同一代码在沙箱外通过，产物 349.57 kB |
| Turbo typecheck | 单项目检查通过；并行 Angular/esbuild 在沙箱内 deadlock 后退出 137 |

### 4.2 运行时验收结果

- `POST /api/v1/auth/login` 使用 demo student 登录成功。
- `GET /api/v1/terms/current/sections` 返回当前学期、演示教学班、教师和选课人数。
- `GET /api/v1/teacher/sections/:id/progress` 基于真实 PostgreSQL 数据返回 19 次历史提交、2 次成功、通过率和班级/作业 `averageScore = 35.47`。
- `GET /api/v1/teacher/assignments/:id/submissions` 返回真实提交列表和可用于详情跳转的 submission id。
- 四位小数最优解 `产品A=6.6667, 产品B=6.6667, objective=46.6667` 经 NestJS → runner → PostgreSQL 完整链路返回 `SUCCESS`、score 95、gap 0，submission id 为 `97848391-0fb0-444f-83af-48b2cc14cf8c`。
- Angular 开发服务器在 `http://127.0.0.1:4302` 完成构建并运行，代理指向当前 `3007` 后端。

当前 Codex 运行环境未暴露 in-app browser 实例，因此未执行截图式视觉验收；页面路由、Angular 模板编译、正式构建、开发服务器构建和依赖 API 已分别验证。

---

## 五、已知限制

- 鉴权仍为 demo 级别。
- 评测仍为同步调用本地 runner。
- 提交代码和结果仍使用本地数据库/本地文件策略。
- 代码编辑器使用 `<textarea>`，Monaco 后置。
- 报告入口和人工评分入口仅占位。
- 不包含 Redis、BullMQ、MinIO、WebSocket、排行榜、完整报告编辑或完整人工评分流程。
