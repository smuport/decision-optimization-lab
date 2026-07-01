# 前端设计文档 (Frontend Design)

> Angular 18 SPA 的页面结构、组件设计、状态管理和路由设计。
> 配套文件: `frontend/src/**/*.component.ts`, `frontend/src/app.routes.ts`

---

## 0. 前端设计修订结论

前端第一目标不是做一个“漂亮案例列表”，而是让学生沿着课程实验路径完成：

```text
阅读题目 → 理解模型/算法 → 下载或在线编辑模板 → 用公开数据调试 → 提交评测 → 查看反馈 → 提交实验报告
```

教师端第一目标是：

```text
发布实验 → 查看班级进度 → 定位常见错误 → 查看提交和报告 → 人工补评分 → 导出成绩
```

### 0.1 MVP 页面范围

| 页面 | MVP 必做 | 后置增强 |
|------|----------|----------|
| 登录页 | 学号登录、首次激活 | 忘记密码、第三方登录 |
| 课程首页 | 当前课程、实验任务、截止时间 | 多课程切换 |
| 案例详情 | 案例内容、本班已发布练习摘要 | 富交互知识图谱 |
| 实验工作区 | Assignment 状态、练习资源、代码编辑、运行结果、日志 | 多文件工程、协同编辑 |
| 提交详情 | 各数据集结果、错误诊断、可视化 | 代码 diff、历史对比 |
| 教师面板 | 进度、通过率、提交列表、补评分 | 排行榜、错误聚类图 |

### 0.2 工作区布局修订

实验工作区建议采用“左题目、中代码、右结果/报告”的紧凑工作台，而不是把运行配置散落在多个页面：

```text
┌────────────────────────────────────────────────────────────┐
│ 案例标题 / 截止时间 / 保存状态 / 运行 / 提交               │
├───────────────┬──────────────────────────┬─────────────────┤
│ 题目与数据     │ 代码编辑器或上传区        │ 评测结果          │
│ - 目标         │ - template.py            │ - 状态            │
│ - 输入输出规范 │ - 本地保存               │ - 各数据集结果     │
│ - 公开数据下载 │ - 提交按钮               │ - 日志/可视化      │
│ - 评分规则     │                          │ - 报告入口         │
└───────────────┴──────────────────────────┴─────────────────┘
```

### 0.3 反馈展示修订

不同案例的反馈要结构化展示：

- 精确建模题：目标值、最优值、约束违反量、变量对比、影子价格误差。
- 分配/运输题：可行性矩阵、供需/匹配约束、总成本、错误位置。
- TSP/启发式题：路线合法性、路线图、收敛曲线、GAP、运行时间。
- 报告类任务：评分项、教师评语、需修改部分。

### 0.4 设计优先级

MVP 前端优先考虑高频课堂操作：

1. 学生能快速找到本周实验。
2. 学生能明确知道输入输出格式和评分规则。
3. 学生提交后能看懂失败原因。
4. 教师能在一屏内看出哪些学生没有完成、哪些案例普遍失败。

排行榜、主题切换、头像、复杂通知中心等功能可以后置。

### 0.5 Week3 管理控制面与学生可见性

Week3 前端按角色拆分入口：

```text
ADMIN
├── /admin/cases
├── /admin/cases/new
├── /admin/cases/:caseId
└── /admin/exercises/:exerciseId

TEACHER
├── /teacher/sections/:sectionId
├── /teacher/sections/:sectionId/cases
├── /teacher/sections/:sectionId/assignments
├── /teacher/assignments/new
└── /teacher/assignments/:assignmentId/edit

STUDENT
├── /cases/:caseId
├── /assignments/:assignmentId/workspace
└── /submissions/:submissionId
```

ADMIN 案例管理包含元数据、状态、预览和 Exercise 列表。Exercise 管理包含元数据、状态、资源完整性检查和学生视角预览；Week3 不在线编辑模板、数据、rubric 或 validator 文件。

教师班级详情使用三个 Tab：

```text
学生名单 | 可见案例 | 已发布作业
```

- “可见案例”从 PUBLISHED Case 目录选择，支持发布、可见时间、排序和归档。
- “已发布作业”只能从该班已发布 Case 下的 PUBLISHED Exercise 中选择。
- 发布前展示 Exercise 资源检查；检查失败时明确列出缺失项并禁用发布。
- 创建 Assignment 时允许同一个 Exercise 在同一教学班不同周期重复发布。

Day5 已实现 `/teacher/sections/:sectionId` 三 Tab 页面：学生名单读取 Enrollment；可见案例支持 PUBLISHED Case 搜索、复选批量发布、统一可见窗口、顺序写入和归档确认；已发布作业在 Day5 复用现有进度数据只读展示，完整 Assignment 管理留在 Day6。`/teacher` 进度面板提供进入当前教学班管理页的入口。

学生页面只消费 `/me/cases` 和 `/me/assignments`：

- 未通过 SectionCaseRelease 发布的 Case 完全不可见。
- Case 已发布但没有 Assignment 时只能阅读案例。
- 只有本班 Assignment 对应的 Exercise 才显示工作区和练习资源下载入口。
- Assignment 关闭后保留案例、历史提交和成绩入口。

Day5 学生课程首页和案例详情已切换到 `/me/cases`。无 Assignment 的可见 Case 显示“暂无已发布练习”，不请求 Exercise 详情、模板或数据集，也不渲染工作区和下载按钮；旧 Exercise workspace 路由将在 Day6 统一迁移为 Assignment 路由。

Workspace 唯一学生入口为 `/assignments/:assignmentId/workspace`。页面先读取 Assignment 权限、计算状态和 Exercise，再加载模板、公开数据集与练习资源。草稿 key 使用 `decision-lab.workspace.draft:{userId}:{assignmentId}`。

Day6 已完成该迁移：课程首页和 Case 详情均链接 Assignment 工作区；工作区直接消费 `StudentAssignmentDetailDto`，显示 Availability、提交/剩余次数、截止时间和不可提交原因，并通过 Assignment 下载资源和创建提交。旧 `/exercises/:exerciseId/workspace` 会读取当前学生作业：唯一匹配时重定向，多匹配或无匹配时回课程首页显示选择提示。

教师端已实现 `/teacher/assignments/new` 与 `/teacher/assignments/:assignmentId/edit`，可从本班 PUBLISHED Case 下的 PUBLISHED Exercise 创建草稿，查看资源检查，并执行保存、发布、关闭和归档。发布后表单只读，避免已产生提交后修改规则。

## 一、页面架构

### 1.1 整体布局

```
┌────────────────────────────────────────────────────────────┐
│  Toolbar (固定顶部)                                          │
│  [Logo] 案例 排行榜 仪表盘 [通知🔔] [用户名 ▼] [退出]        │
├──────────┬─────────────────────────────────────────────────┤
│ Sidenav  │                                                  │
│ (可折叠) │              主内容区域 (Router Outlet)          │
│          │                                                  │
│  📚 案例  │                                                  │
│  🏆 排行 │     ┌─────────────────────────────────────┐    │
│  📊 仪表 │     │          页面内容                      │    │
│  ⚙️ 设置 │     │                                      │    │
│          │     └─────────────────────────────────────┘    │
│          │                                                  │
└──────────┴─────────────────────────────────────────────────┘
```

### 1.2 页面清单

| 路由 | 页面 | 说明 | 懒加载 |
|------|------|------|--------|
| `/auth/login` | 登录页 | 学号+密码登录 | ❌ |
| `/` | 学生课程首页 | 本班已发布案例和作业 | ❌ |
| `/cases/:id` | 案例详情 | 本班 SectionCaseRelease 可见内容 | ✅ |
| `/assignments/:assignmentId/workspace` | 实验工作区 | Assignment 权限、练习资源、提交和结果 | ✅ |
| `/submissions/:id` | 提交详情 | 结果、日志、可视化 | ✅ |
| `/admin/cases` | 案例目录 | ADMIN 管理共享 Case | ✅ |
| `/admin/cases/:id` | 案例管理 | Case 元数据、状态、预览、Exercise 列表 | ✅ |
| `/admin/exercises/:id` | 练习管理 | 元数据、状态、资源检查和预览 | ✅ |
| `/teacher/sections/:id` | 教学班详情 | 学生、可见案例、已发布作业 | ✅ |
| `/teacher/assignments/new` | 新建作业 | 从本班可见 Case 选择 Exercise | ✅ |
| `/teacher/assignments/:id/edit` | 编辑作业 | 草稿、发布、关闭和归档 | ✅ |

---

## 二、核心页面设计

### 2.1 登录页 (/auth/login)

```
┌─────────────────────────────────────┐
│                                     │
│          [Logo / 课程名称]            │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ 学号                            │ │
│  │ [____________________]          │ │
│  │                                 │ │
│  │ 密码                            │ │
│  │ [____________________] [👁️]     │ │
│  │                                 │ │
│  │ [✓] 记住我   忘记密码？         │ │
│  │                                 │ │
│  │      [    登 录    ]            │ │
│  │                                 │ │
│  │ 还没有账号？立即注册              │ │
│  └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### 2.2 案例列表页 (/cases)

```
┌────────────────────────────────────────────────────────────┐
│ 案例列表                              [Grid/List切换] [🔍] │
├────────────────────────────────────────────────────────────┤
│ 筛选栏: [分类 ▼] [难度 ▼] [标签 ▼] [状态: 全部/已完成/未开始] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│ │ case_16    │  │ case_17    │  │ case_01    │           │
│ │            │  │            │  │            │           │
│ │ 模拟退火   │  │ 遗传算法   │  │ PuLP入门   │           │
│ │ 求解TSP    │  │ 求解TSP    │  │            │           │
│ │            │  │            │  │            │           │
│ │ 🟡 中等    │  │ 🔴 困难    │  │ 🟢 简单    │           │
│ │            │  │            │  │            │           │
│ │ 进度: 85%  │  │ 进度: 0%   │  │ 进度: 100% │           │
│ │            │  │            │  │            │           │
│ │ [开始学习] │  │ [开始学习] │  │ [查看成绩] │           │
│ └────────────┘  └────────────┘  └────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.3 案例详情页 (/cases/:id)

```
┌────────────────────────────────────────────────────────────┐
│ 案例 16: 模拟退火算法求解TSP                    [🟡 中等]  │
│ 学习从零编写模拟退火算法，求解小/中/大规模TSP问题          │
├────────────────────────────────────────────────────────────┤
│ [理论文档] [数据集] [代码模板] [实验工作区] [提交记录]      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ## 案例概述                                                  │
│ 旅行商问题（TSP）是经典的NP-hard组合优化问题...              │
│                                                            │
│ ## 学习目标                                                  │
│ - 理解模拟退火算法的物理类比                                 │
│ - 掌握Metropolis接受准则                                     │
│ - 实现2-opt邻域操作                                         │
│ - 调试参数并观察收敛曲线                                     │
│                                                            │
│ ## 数据集                                                    │
│ ┌─────────────┬────────┬──────────┬────────┐               │
│ │ 规模        │ 城市数  │ 文件大小  │ 下载   │               │
│ ├─────────────┼────────┼──────────┼────────┤               │
│ │ 小规模      │ 15     │ 602 B    │ [⬇️]   │               │
│ │ 中规模      │ 50     │ 1.7 KB   │ [⬇️]   │               │
│ │ 大规模      │ 150    │ 4.8 KB   │ [⬇️]   │               │
│ └─────────────┴────────┴──────────┴────────┘               │
│                                                            │
│ ## 代码框架                                                  │
│ [下载 Python 框架] 纯Python实现，无需numpy                    │
│                                                            │
│ ## 开始实验 →                                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.4 实验工作区 (/assignments/:assignmentId/workspace) — 核心页面

Week2 实际路由 `/exercises/:exerciseId/workspace` 在 Week3 被 Assignment-centric 路由替代。编辑器继续使用 `<textarea>`，不引入 Monaco。

MVP 行为要求：

- 页面先加载当前学生可见的 Assignment，再加载其 Exercise、默认模板和公开数据集列表。
- 中间代码区默认填入 `GET /api/v1/exercises/:id/template` 返回的模板内容。
- 草稿自动保存到 `localStorage`，key 固定为 `decision-lab.workspace.draft:{userId}:{assignmentId}`。
- 提供“重置为模板”操作。
- 数据集选择来自公开数据集列表，默认选择 `small`。
- 提供练习资源包下载入口；只有本班已发布 Assignment 才显示。
- 提交后展示 status、score、objective、optimalObjective、gap、messages，并提供提交详情入口。
- 报告入口只做占位，不进入完整报告编辑。

```
┌────────────────────────────────────────────────────────────┐
│ ← 返回案例  │  案例 16: 模拟退火算法求解TSP   [运行] [提交]  │
├────────────┼────────────────────────────────────────────────┤
│            │                                                  │
│ 题目描述   │  ┌────────────────────────────────────────────┐│
│ ──────────│  │  # 在此编写你的代码                          ││
│            │  │  import json                                 ││
│ 数据集     │  │  import math                                 ││
│ ○ 小规模   │  │                                              ││
│ ● 中规模   │  │  def build_distance_matrix(coordinates):    ││
│ ○ 大规模   │  │      """构建距离矩阵"""                      ││
│            │  │      ...                                     ││
│            │  │                                              ││
│ 运行配置   │  │  def tour_cost(route, dist):                ││
│ ──────────│  │      """计算路线长度"""                     ││
│ 随机种子:  │  │      ...                                     ││
│ [42    ]   │  │                                              ││
│            │  │  def simulated_annealing(dist, ...):        ││
│ T0:        │  │      """模拟退火主算法"""                   ││
│ [1000  ]   │  │      ...                                     ││
│            │  │                                              ││
│ α:         │  │  if __name__ == '__main__':                 ││
│ [0.995 ]   │  │      ...                                     ││
│            │  └────────────────────────────────────────────┘│
│ max_iter:  │                                                  │
│ [20000 ]   │                                                  │
│            │                                                  │
│ [▶ 运行]   │                                                  │
│ [⬆ 提交]   │                                                  │
│            │                                                  │
└────────────┴────────────────────────────────────────────────┘
```

**运行后展开结果面板**:

```
┌────────────────────────────────────────────────────────────┐
│ 评测结果 (3/3 完成)  耗时: 45.2s  得分: 85.5               │
├────────────────────────────────────────────────────────────┤
│ [small] ✅ 成功  cost: 410  gap: 0.0%  time: 0.15s         │
│ [medium] ✅ 成功  cost: 785  gap: 4.7%  time: 1.2s         │
│ [large] ❌ 超时  time: 60.0s                               │
├────────────────────────────────────────────────────────────┤
│ 得分详情: 正确性 35/40 | 完整性 30/30 | 效率 12/15 | 鲁棒性 5/10 │
├────────────────────────────────────────────────────────────┤
│ [收敛曲线] [路线图] [日志]                                  │
│                                                            │
│  ┌──────────────────────────────────────┐                 │
│  │  cost                                │                 │
│  │  800 ┤╲                               │                 │
│  │  600 ┤ ╲____                          │                 │
│  │  400 ┤      ╲__________               │                 │
│  │  200 ┤                  ╲________     │                 │
│  │    0 └──────────────────────────────→  │                 │
│  │         0    5000   10000   15000     │                 │
│  │              迭代次数                  │                 │
│  └──────────────────────────────────────┘                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.5 提交详情页 (/submissions/:id)

Week2 提交详情页聚焦结构化反馈，不做代码 diff、历史对比或复杂可视化。

MVP 行为要求：

- 展示状态、分数、提交时间、attemptNumber、是否迟交。
- 展示 objective、optimalObjective、gap、messages。
- 展示 metrics/artifacts 的 JSON 摘要或简洁键值摘要。
- 使用 `codeText` 只读回显本次提交代码。
- 报告入口只做占位。
- 提供返回工作区或课程首页的导航。

```
┌────────────────────────────────────────────────────────────┐
│ 提交详情 #sub-1234    状态: ✅ 已完成  得分: 85.5           │
├────────────────────────────────────────────────────────────┤
│ 案例: 模拟退火算法求解TSP    提交时间: 2024-06-20 10:00      │
│ 运行规模: small, medium, large                             │
├────────────────────────────────────────────────────────────┤
│ [概览] [收敛曲线] [路线图] [日志] [代码对比]                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 各规模结果对比                                              │
│ ┌──────────┬────────┬────────┬────────┬────────┐           │
│ │ 规模     │ 状态   │ 结果   │ 标准答案│ GAP   │           │
│ ├──────────┼────────┼────────┼────────┼────────┤           │
│ │ small    │ ✅     │ 410    │ 410    │ 0.0%  │           │
│ │ medium   │ ✅     │ 785    │ 750    │ 4.7%  │           │
│ │ large    │ ❌     │ -      │ 1100   │ -     │           │
│ └──────────┴────────┴────────┴────────┴────────┘           │
│                                                            │
│ 路线图可视化 (small)                                        │
│ ┌──────────────────────────────────────┐                 │
│ │   ●───●                                │                 │
│ │  /│   │\                               │                 │
│ │ ● │   │ ●                              │                 │
│ │  \│   │/                               │                 │
│ │   ●───●    ★ (起点)                   │                 │
│ └──────────────────────────────────────┘                 │
│                                                            │
│ 运行日志:                                                  │
│ [2024-06-20 10:00:05] 开始评测 small 数据集...              │
│ [2024-06-20 10:00:15] small 评测完成，cost=410             │
│ ...                                                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.6 教师面板 (/teacher)

Week2 教师面板只做最小班级视图：

- 从 `GET /api/v1/terms/current/sections` 读取当前学期教学班，默认选择第一个 section。
- 使用 `GET /api/v1/teacher/sections/:id/progress` 展示 enrollmentCount、submissionCount、successCount、passRate、averageScore 和作业摘要。
- 使用 `GET /api/v1/teacher/assignments/:id/submissions` 展示提交列表。
- 提交列表记录可跳转到 `/submissions/:submissionId`。
- 人工评分入口只做占位，不实现完整人工评分流程。

HTTP Authorization interceptor、全局错误提示和 404 页面作为后续增强；如果 Day7 时间允许可以补充，但不作为 Week2 必达条件。

### 2.7 Week3 Day2 认证与角色路由实施状态

Week3 已实现 HTTP Authorization interceptor、启动时 `/auth/me` 登录恢复、401 自动清理、角色路由守卫和 401/403/404 状态页：

- 未登录访问业务页面跳转 `/auth/login?returnUrl=...`。
- STUDENT 默认进入 `/`，只能进入课程、案例、工作区和自己的提交页面。
- TEACHER 默认进入 `/teacher`，导航只显示教学班管理。
- ADMIN 默认进入 `/admin/cases`，导航只显示内容管理。
- 错误角色访问受保护路由进入 `/forbidden`；returnUrl 只允许留在当前角色路由范围，拒绝跨角色和 `//` 外部路径。
- 练习资源包通过 Angular HttpClient 下载，确保 Bearer token 随请求发送，不再使用无法携带 Authorization 的普通下载链接。

Day2 提供 `/admin/cases` 的角色入口壳；完整 Case 管理页面属于 Day3。

### 2.8 Week3 Day3 ADMIN Case 管理实施状态

Week3 Day3 已将入口壳替换为完整管理页面：

- `/admin/cases` 提供关键词搜索、状态筛选、分页、状态标签、Exercise 数量和新建入口。
- `/admin/cases/new` 读取当前课程并创建 DRAFT Case；案例编码创建后不可编辑。
- `/admin/cases/:caseId` 提供元数据编辑、学生视角本地预览和 Exercise 只读摘要。
- 发布和归档均需确认；存在未保存修改时禁用状态操作，离开路由或关闭页面会提示。
- ARCHIVED Case 页面保持历史内容可读，但表单和状态操作不可用。
- 页面只调用 ADMIN Case 管理接口；学生视角预览是管理 DTO 的展示投影，不调用或绕过学生权限接口。

### 2.9 Week3 Day4 ADMIN Exercise 管理实施状态

- Case 管理页可在当前 Case 下创建 Exercise 草稿，并跳转 `/admin/exercises/:exerciseId`。
- Exercise 管理页编辑标题、说明、类型、entrypoint、output schema、guide、assetPath 和排序；code 与所属 Case 只读。
- 资源完整性面板展示六项检查、检查时间和具体缺失消息，可手动重新检查。
- 资源未就绪或表单未保存时禁用发布；发布和归档需要确认，归档后页面只读。
- 学生工作区预览显示练习说明、入口函数和资源包公开内容，不调用学生接口绕过权限。
- 页面只维护资产元数据与状态，不提供模板、数据、rubric 或 validator 的上传和在线编辑。

---

## 三、组件设计

### 3.1 共享组件 (Shared Components)

```typescript
// ============================================
// MarkdownViewerComponent
// ============================================
// 用途: 渲染课程理论文档（Markdown → HTML）
// 功能: 数学公式(MathJax/KaTeX)、代码高亮、图片懒加载
// 输入: @Input() content: string
// 输出: —

// ============================================
// CodeEditorComponent
// ============================================
// 用途: 在线代码编辑（Monaco Editor 封装）
// 功能: 语法高亮、自动补全、代码折叠、主题切换
// 输入: 
//   @Input() code: string        // 初始代码
//   @Input() language: string = 'python'
//   @Input() theme: string = 'vs-dark'
//   @Input() readOnly: boolean = false
// 输出:
//   @Output() codeChange: EventEmitter<string>
//   @Output() save: EventEmitter<string>

// ============================================
// ConvergenceChartComponent
// ============================================
// 用途: 绘制模拟退火收敛曲线
// 功能: 最优值/当前值双曲线、温度变化、缩放、导出
// 输入:
//   @Input() history: { best: number[], current: number[], temperature: number[] }
// 输出: —

// ============================================
// RouteMapComponent
// ============================================
// 用途: 绘制TSP路线图可视化
// 功能: 城市点、路线连线、渐变色、起点标记、悬停提示
// 输入:
//   @Input() coords: [number, number][]  // 城市坐标
//   @Input() route: number[]             // 路线序列
// 输出: —

// ============================================
// ResultPanelComponent
// ============================================
// 用途: 评测结果展示面板
// 功能: 状态徽章、得分环形图、规模卡片、Tab切换
// 输入:
//   @Input() result: Result
//   @Input() subDatasets: SubDataset[]
// 输出: @Output() tabChange: EventEmitter<string>

// ============================================
// CaseCardComponent
// ============================================
// 用途: 案例列表卡片
// 功能: 封面、标题、难度标签、进度条、操作按钮
// 输入:
//   @Input() case: Case
//   @Input() progress: number
// 输出: @Output() action: EventEmitter<string>
```

### 3.2 核心服务 (Core Services)

```typescript
// ============================================
// ApiService
// ============================================
// 统一 HTTP 封装
@Injectable({ providedIn: 'root' })
export class ApiService {
  get<T>(url: string, params?: any): Observable<ApiResponse<T>>;
  post<T>(url: string, body: any): Observable<ApiResponse<T>>;
  patch<T>(url: string, body: any): Observable<ApiResponse<T>>;
  delete<T>(url: string): Observable<ApiResponse<T>>;
  upload<T>(url: string, formData: FormData): Observable<ApiResponse<T>>;
  download(url: string, filename: string): Observable<Blob>;
}

// ============================================
// AuthService
// ============================================
// 认证管理
@Injectable({ providedIn: 'root' })
export class AuthService {
  user$: BehaviorSubject<User | null>;
  isLoggedIn$: Observable<boolean>;
  isTeacher$: Observable<boolean>;
  
  login(credentials: LoginDto): Observable<AuthResponse>;
  register(data: RegisterDto): Observable<User>;
  logout(): void;
  refreshToken(): Observable<TokenPair>;
  getToken(): string | null;
}

// ============================================
// WebSocketService
// ============================================
// WebSocket 连接管理
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  connect(): void;
  disconnect(): void;
  subscribe(channel: string, id: string): void;
  unsubscribe(channel: string, id: string): void;
  onMessage(): Observable<WebSocketEvent>;
  isConnected$: Observable<boolean>;
}

// ============================================
// EvaluationService
// ============================================
// 评测相关操作
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  submit(formData: FormData): Observable<SubmissionResponse>;
  getStatus(submissionId: string): Observable<EvaluationStatus>;
  getLogs(submissionId: string): Observable<LogEntry>;
  cancel(submissionId: string): Observable<void>;
}
```

---

## 四、状态管理

### 4.1 方案选型

使用 **RxJS BehaviorSubject + 服务层** 做轻量级状态管理（非 Redux/NgRx）：

- 课程场景状态不复杂，不需要完整的 Redux 流
- 减少样板代码，降低学生二次开发门槛
- 通过 `shareReplay` 实现跨组件共享

### 4.2 状态分层

```
GlobalState (App级别)
├── auth: { user, isLoggedIn, role }
├── cases: { list, filters, selectedCase }
├── submissions: { list, activeSubmission, results }
├── evaluation: { queueStatus, progress, logs }
└── ui: { theme, sidebarCollapsed, notifications }

LocalState (组件级别)
├── editor: { code, language, theme, dirty }
├── workspace: { selectedSizes, config, output }
└── chart: { zoom, pan, selectedSeries }
```

### 4.3 状态服务示例

```typescript
@Injectable({ providedIn: 'root' })
export class AppState {
  // Auth State
  private _user = new BehaviorSubject<User | null>(null);
  user$ = this._user.asObservable();
  
  // Case State
  private _cases = new BehaviorSubject<Case[]>([]);
  cases$ = this._cases.asObservable();
  
  private _selectedCase = new BehaviorSubject<Case | null>(null);
  selectedCase$ = this._selectedCase.asObservable();
  
  // Submission State
  private _activeSubmission = new BehaviorSubject<Submission | null>(null);
  activeSubmission$ = this._activeSubmission.asObservable();
  
  // UI State
  private _theme = new BehaviorSubject<'light' | 'dark'>('light');
  theme$ = this._theme.asObservable();
  
  private _sidebarCollapsed = new BehaviorSubject<boolean>(false);
  sidebarCollapsed$ = this._sidebarCollapsed.asObservable();
  
  // Actions
  setUser(user: User | null): void { this._user.next(user); }
  setCases(cases: Case[]): void { this._cases.next(cases); }
  selectCase(caseItem: Case | null): void { this._selectedCase.next(caseItem); }
  setActiveSubmission(sub: Submission | null): void { this._activeSubmission.next(sub); }
  toggleTheme(): void { this._theme.next(this._theme.value === 'light' ? 'dark' : 'light'); }
  toggleSidebar(): void { this._sidebarCollapsed.next(!this._sidebarCollapsed.value); }
}
```

---

## 五、路由设计

```typescript
// app.routes.ts
export const routes: Routes = [
  // 认证路由
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  
  // 主布局路由（需要登录）
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      // 仪表盘
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      
      // 案例
      {
        path: 'cases',
        loadChildren: () => import('./features/cases/cases.routes').then(m => m.casesRoutes)
      },
      
      // 提交
      {
        path: 'submissions',
        loadChildren: () => import('./features/submissions/submissions.routes').then(m => m.submissionsRoutes)
      },
      
      // 排行榜
      {
        path: 'leaderboard',
        loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
      },
      
      // 个人设置
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      
      // 管理后台（需要教师角色）
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['TEACHER', 'ADMIN'] },
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
      },
      
      // 默认路由
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // 404
  { path: '**', component: NotFoundComponent }
];
```

### 子路由详情

> 下列旧 `cases.routes.ts`、排行榜、队列和通用 OJ 管理路由为历史参考。Week3 当前路由以 0.5 为准，`/cases/:id/workspace` 不再实施。

```typescript
// cases.routes.ts
export const casesRoutes: Routes = [
  { path: '', component: CaseListComponent },  // /cases
  { path: ':id', component: CaseDetailComponent },  // /cases/:id
  { path: ':id/workspace', component: CaseWorkspaceComponent }  // /cases/:id/workspace
];

// submissions.routes.ts
export const submissionsRoutes: Routes = [
  { path: '', component: SubmissionListComponent },  // /submissions
  { path: ':id', component: SubmissionDetailComponent }  // /submissions/:id
];

// admin.routes.ts
export const adminRoutes: Routes = [
  { path: '', redirectTo: 'cases', pathMatch: 'full' },
  { path: 'cases', component: AdminCaseManagementComponent },
  { path: 'users', component: AdminUserManagementComponent },
  { path: 'queue', component: AdminEvaluationQueueComponent },
  { path: 'logs', component: AdminSystemLogsComponent }
];
```

---

## 六、UI/UX 设计规范

### 6.1 主题与颜色

```scss
// styles/themes/_variables.scss

// 主色板
$primary: #1976d2;        // Angular Material 蓝
$primary-dark: #115293;
$accent: #ff4081;         // 粉色强调
$warn: #f44336;           // 红色警告

// 状态色
$success: #4caf50;
$success-light: #e8f5e9;
$pending: #ff9800;
$pending-light: #fff3e0;
$error: #f44336;
$error-light: #ffebee;
$info: #2196f3;
$info-light: #e3f2fd;

// 难度色
$difficulty-easy: #4caf50;
$difficulty-medium: #ff9800;
$difficulty-hard: #f44336;
$difficulty-expert: #9c27b0;

// 文字色
$text-primary: rgba(0, 0, 0, 0.87);
$text-secondary: rgba(0, 0, 0, 0.60);
$text-disabled: rgba(0, 0, 0, 0.38);

// 背景色
$bg-default: #fafafa;
$bg-paper: #ffffff;
$bg-card: #ffffff;
```

### 6.2 组件风格

- **卡片**: Material Card，圆角 8px，阴影 `0 2px 4px rgba(0,0,0,0.1)`
- **按钮**: Material Button，主操作 raised，次操作 stroked
- **表格**: Material Table，分页 + 排序 + 筛选
- **输入框**: Material Form Field，浮动标签，错误提示
- **对话框**: Material Dialog，确认/表单/详情三种模式
- **加载**: Material Progress Spinner / Bar
- **提示**: Snackbar（操作成功/失败），Toast（通知）

### 6.3 响应式断点

```scss
// 响应式布局
$xs: 0px;       // 手机竖屏
$sm: 600px;     // 手机横屏/小平板
$md: 960px;     // 平板/小笔记本
$lg: 1280px;    // 桌面
$xl: 1920px;    // 大屏桌面

// 实验工作区布局
// - xs/sm: 单列（题目描述折叠，编辑器全屏）
// - md: 双列（左侧 300px 题目，右侧编辑器）
// - lg/xl: 三列（左侧题目 250px，中间编辑器 1fr，右侧结果面板 350px）
```

---

## 七、性能优化

### 7.1 懒加载

所有业务模块均使用 `loadComponent` / `loadChildren` 懒加载，减少初始包体积。

### 7.2 代码分割

```typescript
// 编辑器相关（Monaco Editor）独立 chunk
const editorChunk = () => import('./editor.module');

// 图表相关（ECharts）独立 chunk
const chartChunk = () => import('./chart.module');
```

### 7.3 数据缓存

- HTTP 响应缓存：对案例列表、排行榜等读多写少的数据启用 HTTP 缓存
- 图片懒加载：案例封面、头像使用 `loading="lazy"`
- 虚拟滚动：提交记录列表、排行榜长列表使用 CDK Virtual Scroll

### 7.4 构建优化

```json
// angular.json
{
  "production": {
    "optimization": true,
    "sourceMap": false,
    "namedChunks": false,
    "extractLicenses": true,
    "vendorChunk": true,
    "budgets": [
      { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
      { "type": "anyComponentStyle", "maximumWarning": "2kb", "maximumError": "4kb" }
    ]
  }
}
```

---

## 八、国际化（可选）

使用 `@ngx-translate/core` 支持中英文切换：

```typescript
// 默认中文，教师可切换英文
// 翻译文件: assets/i18n/zh-CN.json, assets/i18n/en-US.json
```

---

> 下一篇阅读：[自动评测系统设计文档](AUTO_EVALUATION_DESIGN.md)
