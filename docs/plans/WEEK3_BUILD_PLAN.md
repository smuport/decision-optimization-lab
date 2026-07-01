# Week3 构建计划：案例、练习、班级可见性与作业管理

## 1. 版本目标

Week3 将 Week2 固定 seed 的 case01 演示闭环升级为可由 ADMIN 和 TEACHER 配置的教学管理控制面：

```text
ADMIN 维护 Case 和 Exercise
→ TEACHER 将 Case 发布给教学班
→ TEACHER 将 Exercise 发布为 Assignment
→ STUDENT 只看到本班发布内容
→ STUDENT 从 Assignment 进入工作区和提交
```

Week3 交付版本为 Version 1.2。继续只使用 case01，不增加其他 Case，不在线编辑评测资产，不引入 Redis、BullMQ、MinIO、WebSocket、Monaco、独立评测服务或完整报告/人工评分流程。

## 2. 权威领域模型与角色边界

```text
Course
└── Case
    └── Exercise
        ├── Dataset
        ├── Template
        ├── Rubric
        └── Validator

ClassSection
├── SectionCaseRelease → Case
└── Assignment → Exercise
```

- ADMIN 管理课程级 Case/Exercise 元数据、状态、预览和资源完整性。
- TEACHER 管理自己教学班的学生、SectionCaseRelease 和 Assignment。
- STUDENT 仅访问 ACTIVE Enrollment 所属教学班已发布内容。
- Exercise 拥有下载资源；Assignment 拥有班级、时间、次数和迟交规则。
- 模板、数据集、rubric 和 validator 继续由仓库维护，不通过管理后台在线编辑。

## 3. 每日实施计划

### Day 1：Schema、数据迁移、Seed 与 shared 契约

> 实施状态（2026-06-29）：已完成。shared、Prisma、backend、Angular 编译及 Day1 契约/迁移不变量自动化测试通过；`pnpm verify:week3:day1` 已完成空库 migration、双次 seed、现有 Week2 数据库迁移、历史数量比对和数据关系验收。

#### 目标

- 建立 Week3 的持久化模型和共享类型基础。
- 保留 Week2 case01 的 Submission、RunResult、Score 和已有路由数据。
- 准备两个教学班，为后续跨班可见性测试提供稳定数据。

#### 前置条件

- PostgreSQL 开发容器健康。
- Week2 migration 和 seed 已成功执行。
- 先备份当前开发数据库或确认可由 seed 重建。

#### 具体实施步骤

1. 在 shared 中新增：
   - `CaseReleaseStatus = DRAFT | PUBLISHED | ARCHIVED`。
   - `ExerciseStatus = DRAFT | PUBLISHED | ARCHIVED`。
   - `AssignmentStatus = DRAFT | PUBLISHED | CLOSED | ARCHIVED`。
   - `AssignmentAvailability = UPCOMING | OPEN | LATE | CLOSED`。
2. 在 Prisma schema 中新增 `SectionCaseRelease`，包含 section、case、状态、可见时间、排序、发布人和时间戳。
3. 扩展 `Exercise`：`code`、`description`、`status`、`assetPath`，增加 `@@unique([caseId, code])`。
4. 扩展 `Assignment`：`description`、`status`、`publishedAt`、`createdById`。
5. 删除 `Assignment.@@unique([sectionId, exerciseId])`，改为普通索引。
6. 给 User、ClassSection、Case 补充带明确 relation name 的反向关系。
7. 编写 migration，按以下规则回填现有数据：
   - case01 保持 PUBLISHED。
   - 现有 Exercise 使用 `code=production_planning`、`status=PUBLISHED` 和当前兼容资产路径。
   - 现有 Assignment 使用 `status=PUBLISHED`，`createdById` 回填 demo teacher。
   - 为现有演示班创建 PUBLISHED SectionCaseRelease，保证 Week2 页面迁移期间仍可访问 case01。
8. 扩展 seed：
   - 保留现有演示班、教师和学生。
   - 新增第二教学班、第二教师和第二学生。
   - 第二教学班不发布 case01，用于隔离测试。
9. 在 shared 中新增管理 DTO 与请求 schema：Case、Exercise、ResourceCheck、SectionCaseRelease、TeacherAssignment、StudentCase 和 StudentAssignment。
10. 更新 Prisma mapper 约定，禁止 Controller 直接把 Prisma model 作为 API response。

#### 测试方案

- 执行 `pnpm --filter backend prisma:validate`。
- 对空数据库执行 migration 和 seed。
- 对包含 Week2 测试提交的数据库执行 migration。
- 查询 migration 前后的 Submission、RunResult 和 Score 数量及外键。
- 重复执行 seed，确认不会创建重复教学班、Release 或 Assignment。
- 执行 shared build、backend typecheck 和 backend build。
- 增加 migration 数据测试：现有 Assignment 能关联回填后的 Exercise、SectionCaseRelease 和创建教师。

#### 验收标准

- `section_case_releases` 表、三个新状态枚举和新增字段存在。
- 现有 case01 Submission、RunResult、Score 数量与关系不变。
- 演示班可读取 case01；第二教学班没有 case01 Release。
- 同一教学班可创建多个引用同一 Exercise 的 Assignment。
- shared、Prisma 和 backend 检查全部通过。

#### 当天文档更新

- 更新 `DATABASE_DESIGN.md` 的实际实施状态。
- 更新 `PROJECT_STATE.md`，将下一步切到 Day2。
- 如 migration 与 ADR-0005 冲突，停止实施并先修订 ADR。

---

### Day 2：JWT 认证上下文、角色权限与教学班归属

> 实施状态（2026-06-29）：已完成。bcrypt seed、JWT 登录/恢复、全局认证与角色守卫、SectionAccessService、可信提交/评分用户、统一 401/403、前端 interceptor/角色路由与导航、自动化测试和真实双教学班 API 权限验收均通过。

#### 目标

- 让后续管理 API 使用可信的当前用户，而不是 demo 默认用户或请求体中的 `userId`。
- 建立 ADMIN、TEACHER、STUDENT 三类角色守卫和教学班归属检查。

#### 前置条件

- Day1 schema、migration 和 seed 通过。
- demo admin、两个 teacher 和两个 student 均有可登录账号。

#### 具体实施步骤

1. 使用 `@nestjs/jwt` 和 `bcryptjs` 建立 Week3 最小认证：
   - seed 保存 password hash。
   - 登录校验账号状态和密码。
   - access token 包含 `sub`、`role`，不包含可由客户端修改的 section 信息。
2. 增加 `JwtAuthGuard`、`RolesGuard`、`@Roles()` 和 `@CurrentUser()`。
3. 增加 `SectionAccessService`：
   - STUDENT 校验 ACTIVE Enrollment。
   - TEACHER 校验 `ClassSection.teacherId`。
   - ADMIN 可访问课程级管理数据。
4. 将现有提交创建逻辑改为从当前用户读取 student id，拒绝请求体 `userId`。
5. 为 `/admin/**`、`/teacher/**`、`/me/**` 和提交/资源接口定义统一权限规则。
6. 前端增加 Authorization interceptor、登录恢复、角色路由守卫和 401/403 页面。
7. 导航按角色展示：ADMIN 显示内容管理，TEACHER 显示教学班管理，STUDENT 显示课程和作业。
8. 统一错误响应：401 未登录、403 角色或教学班越权、`SECTION_ACCESS_DENIED` 业务错误。

#### 测试方案

- 单元测试 JWT 签发、过期 token、错误密码和停用账号。
- Guard 测试 ADMIN/TEACHER/STUDENT 允许与拒绝矩阵。
- 集成测试一班学生不能读取二班数据。
- 集成测试一班教师不能管理二班。
- 测试学生传入其他 `userId` 不会替他人提交。
- Angular 路由守卫测试或最小组件测试：未登录跳转、角色错误进入 403。
- 执行 backend test/typecheck/build 和 frontend `ngc`/build。

#### 验收标准

- 业务 API 不再依赖固定 demo user。
- 学生、教师和管理员登录后只能看到对应导航和路由。
- 所有跨班、跨学生和跨角色请求返回 403。
- 正常学生仍可完成 case01 原有提交链路。
- 401/403 响应格式与 shared 契约一致。

#### 当天文档更新

- 更新 `BACKEND_API_DESIGN.md` 的认证实现状态和权限矩阵。
- 更新 `FRONTEND_DESIGN.md` 的路由守卫状态。
- 更新 `PROJECT_STATE.md`，记录 demo token 已被 JWT 替代。

---

### Day 3：ADMIN Case 管理

> 实施状态（2026-06-30）：已完成。ADMIN Case 分页/筛选、草稿创建、详情与 Exercise 摘要、元数据编辑、单向状态流转、归档只读、前端管理页面、离开确认、自动化测试和真实数据库 API 验收均通过。

#### 目标

- 让 ADMIN 能维护共享案例目录，而不再依赖 seed 修改案例元数据。
- 建立 Case 的草稿、发布、归档和历史保护规则。

#### 前置条件

- Day2 JWT 和 ADMIN 权限通过。
- Case schema 和 shared DTO 已完成。

#### 具体实施步骤

1. 新增 backend `cases` 管理 service/controller，实现：
   - 分页列表、状态/关键词筛选。
   - 创建 DRAFT Case。
   - 读取详情和 Exercise 摘要。
   - 编辑元数据。
   - DRAFT → PUBLISHED → ARCHIVED 状态流转。
2. Case 创建校验：课程存在、code 全局唯一、标题非空、sortOrder 合法。
3. 发布校验：必填元数据完整；归档 Case 不允许重新发布，除非后续新增明确恢复流程。
4. 禁止物理删除已有 Exercise、SectionCaseRelease 或历史 Assignment 的 Case。
5. 新增前端 `/admin/cases`：搜索、状态筛选、分页、状态标签和新建入口。
6. 新增 `/admin/cases/new` 和 `/admin/cases/:caseId`：
   - 元数据表单。
   - 保存草稿、发布、归档。
   - Exercise 列表。
   - 学生视角预览，但预览不绕过后端权限。
7. 表单离开时提示未保存修改；发布和归档需要确认。

#### 测试方案

- Service 单元测试：重复 code、非法状态流转、归档保护。
- API 集成测试：ADMIN 成功，TEACHER/STUDENT 返回 403。
- 测试分页、筛选、排序和空列表。
- 测试已有 Exercise/Release/Assignment 的 Case 无删除入口且归档不破坏历史。
- 前端表单测试：必填项、未保存提示、按钮状态和错误反馈。
- 执行 shared/backend/frontend 构建。

#### 验收标准

- ADMIN 能完成 Case 创建、编辑、发布和归档。
- TEACHER/STUDENT 不能调用 Case 管理接口。
- PUBLISHED Case 可供教师发布；DRAFT/ARCHIVED Case 不可新发布。
- case01 原有教学内容和学生页面不受影响。
- Case 历史关系不会因归档丢失。

#### 当天文档更新

- 更新 API 实现状态和 Case 状态机。
- 在 Version 1.2 验收记录中填写 Case 管理结果。
- 更新 `PROJECT_STATE.md`，将下一步切到 Exercise 管理。

---

### Day 4：ADMIN Exercise 管理、资源目录迁移与完整性检查

> 实施状态（2026-06-30）：已完成。Exercise 管理 API/UI、case01 Exercise 资产目录、exercise manifest、六项资源完整性检查、发布阻断、Exercise-aware runner、旧 Case 参数兼容、资源包白名单、自动化测试和真实数据库/API 验收均通过。

#### 目标

- 让 ADMIN 管理 Case 下的 Exercise 元数据与状态。
- 将模板、数据集、rubric、validator 和下载包明确归属 Exercise。
- 在不破坏 Week2 case01 runner 的前提下迁移资产目录。

#### 前置条件

- Day3 Case 管理通过。
- case01 原始资产和 runner 回归测试可用。

#### 具体实施步骤

1. 新增 backend Exercise 管理 API：列表、创建、详情、编辑、状态和 resource-check。
2. Exercise 创建校验：所属 Case 存在、`code` 在 Case 内唯一、kind/entrypoint/outputSchema 合法。
3. 将 case01 资产迁移到：

```text
course-assets/cases/case_01/exercises/production_planning/
```

4. 创建 `exercise_manifest.json`，记录 exerciseCode、entrypoint、outputSchema、模板、数据集、rubric 和 validator 路径。
5. Runner adapter 改为传入 `exerciseCode + datasetKey`；保留旧 `caseCode` 兼容映射，仅用于 Week2 历史调用。
6. ResourcePackageService 根据 Exercise 和 assetPath 构建练习包，不再扫描整个 Case 目录。
7. 实现六项资源检查：entrypoint、output schema、默认模板、公开数据、active rubric、validator。
8. 只有资源检查 `ready=true` 时允许 Exercise 发布。
9. 新增 `/admin/exercises/:exerciseId`：元数据、状态、资源检查明细、Case 链接和学生工作区预览。
10. 将前端“案例资源包”统一改为“练习资源包”。

#### 测试方案

- Runner 回归：case01 正确、错误、运行错误和四位小数容差提交。
- Resource check 参数化测试：逐项移除六类资源并验证失败消息。
- 资源包测试：文件清单、README、模板、公开数据和 output schema。
- 安全测试：隐藏数据、validator、reference solution、内部 rubric 细节不进入 zip。
- 兼容测试：Week2 历史 Exercise id 和 Submission 详情仍可读取。
- API 权限测试：ADMIN 可管理，TEACHER 仅可授权预览，STUDENT 不可管理。
- 执行 unzip 检查、backend test/build、frontend build。

#### 验收标准

- case01 Exercise 在新目录下能完成同步评测。
- Exercise 资源检查正确识别全部必需资源。
- 资源不完整的 Exercise 无法发布。
- 下载包完全由 Exercise 生成且不泄露教师资源。
- Week2 历史提交和原有评测结果仍可查看。

#### 当天文档更新

- 更新 `AUTO_EVALUATION_DESIGN.md` 的实际 runner 参数和兼容期说明。
- 更新 `PROJECT_STRUCTURE.md` 的当前资产目录。
- 更新 Version 1.2 资源验收记录和 `PROJECT_STATE.md`。

---

### Day 5：TEACHER 教学班管理与 SectionCaseRelease

> 实施状态（2026-06-30）：已完成。教师班级三 Tab、学生名单、案例目录与批量发布、Release 时间窗口/排序/归档、`/me/cases` 严格可见性、无作业只读状态、自动化测试和真实双教学班 API 验收均通过。

#### 目标

- 让教师在班级上下文中管理学生、可见案例和发布窗口。
- 让学生 Case 列表严格由 Enrollment 与 SectionCaseRelease 决定。

#### 前置条件

- Day2 教学班权限服务通过。
- Day3/4 已存在 PUBLISHED case01 和 PUBLISHED Exercise。
- Seed 中有两个互相隔离的教学班。

#### 具体实施步骤

1. 新增 backend `case-releases` module，实现列表、创建、批量创建、编辑、状态和归档。
2. 创建 Release 时校验：教师负责该班、Case 为 PUBLISHED、section/case 不重复、时间窗口合法。
3. 发布 Release 时写入 publishedAt；归档后不出现在当前学生 Case 列表。
4. 实现 `/me/cases` 和 `/me/cases/:caseId`：
   - 基于当前学生 ACTIVE Enrollment。
   - 只读取 PUBLISHED Release。
   - 使用 `visibleFrom <= now <= visibleUntil`，空边界不限制。
   - Case 详情只返回本班 Assignment 对应的 Exercise 摘要。
5. 教师班级详情改为“学生名单 / 可见案例 / 已发布作业”三个 Tab。
6. “可见案例”支持搜索 PUBLISHED Case、批量选择、可见时间、排序、发布和归档。
7. Case 已发布但无 Assignment 时，学生页面显示教学内容和“暂无已发布练习”，不显示工作区或下载按钮。
8. 保留历史 Assignment 入口：Release 归档后不进入当前列表，但历史提交详情仍可回溯 Case。

#### 测试方案

- 两班隔离集成测试：一班发布 case01，二班不可见。
- Release 状态测试：DRAFT、PUBLISHED、ARCHIVED。
- 时间边界测试：无边界、未来开始、区间内、已结束、边界时刻。
- 重复 section/case 测试返回冲突错误。
- 教师跨班管理返回 403。
- Case 已发布但无 Assignment 时，学生只能阅读。
- 前端测试三个 Tab、空状态、批量操作和确认交互。

#### 验收标准

- TEACHER 只能管理自己教学班的 Release。
- STUDENT 只能看到自己 ACTIVE Enrollment 教学班当前可见的 Case。
- 一班操作不影响二班。
- 无 Assignment 的 Case 不出现练习资源和提交入口。
- 归档 Release 不破坏历史提交详情。

#### 当天文档更新

- 更新数据库/API/前端设计中的实际 SectionCaseRelease 行为。
- 填写 Version 1.2 可见性场景结果。
- 更新 `PROJECT_STATE.md`，将下一步切到 Assignment。

---

### Day 6：TEACHER Assignment 管理与 STUDENT 入口迁移

> 实施状态（2026-06-30）：已完成。教师 Assignment 草稿/编辑/发布/关闭/归档、原子发布校验、学生 `/me/assignments`、Availability、次数与迟交约束、Assignment 工作区和资源入口、旧 Exercise 链接迁移、自动化测试及真实双教学班 API 验收均通过。

#### 目标

- 完成教师从已发布 Case 选择 Exercise 并发布作业的流程。
- 将学生工作区、资源下载和提交全部纳入 Assignment 权限链路。

#### 前置条件

- Day5 SectionCaseRelease 和 `/me/cases` 通过。
- case01 Exercise 为 PUBLISHED 且资源检查 ready。

#### 具体实施步骤

1. 新增 backend `assignments` module，区分教师管理接口和学生读取接口。
2. 实现草稿创建和编辑：Exercise、标题、说明、opensAt、dueAt、maxAttempts、allowLate。
3. 发布时在事务中校验：
   - 教师负责该班。
   - Exercise 为 PUBLISHED。
   - 所属 Case 有该班 PUBLISHED Release。
   - Exercise resource-check ready。
   - 时间顺序正确，maxAttempts 为空或大于 0。
4. 实现 DRAFT → PUBLISHED → CLOSED → ARCHIVED；不允许逆向流转。
5. 实现 Availability 计算：UPCOMING、OPEN、LATE、CLOSED。
6. 实现 `/me/assignments` 和详情，返回剩余次数、是否迟交和 Case/Exercise 摘要。
7. 将 workspace 路由迁移到 `/assignments/:assignmentId/workspace`：
   - 先读取 Assignment 权限和 Availability。
   - 再加载 Exercise 模板、数据和资源。
   - 草稿 key 改为 `decision-lab.workspace.draft:{userId}:{assignmentId}`。
8. 旧 `/exercises/:exerciseId/workspace` 根据当前学生可见 Assignment 重定向；没有唯一匹配时跳转作业列表并提示。
9. 资源下载校验当前学生存在该 Exercise 的可见 Assignment。
10. 提交前校验 Enrollment、Availability、allowLate、maxAttempts；后端从 token 获取 userId。
11. 更新课程首页、Case 详情和教师面板链接为 Assignment-centric 路由。

#### 测试方案

- Assignment 状态机和非法逆向流转单元测试。
- Availability 表驱动测试：空时间、未来开放、开放中、截止后允许/禁止迟交、手动关闭、归档。
- 发布前置条件逐项失败测试。
- 同一 Exercise 向两个班发布不同规则，并分别提交。
- 最大次数、迟交标记和关闭后拒绝提交测试。
- 非本班资源下载和提交返回 403。
- 旧 workspace 路由唯一匹配、无匹配和多匹配迁移测试。
- 学生端完整提交、结果、详情回归测试。
- 执行 shared/backend/frontend 构建和真实 PostgreSQL API 验证。

#### 验收标准

- TEACHER 能创建、编辑、发布、关闭和归档 Assignment。
- Assignment 只能引用本班已发布 Case 下的 PUBLISHED Exercise。
- 两个班可以使用同一 Exercise 配置不同规则。
- STUDENT 工作区、资源和提交都通过 Assignment 权限进入。
- CLOSED/ARCHIVED Assignment 不可提交，但历史记录仍可读。
- Week2 学生闭环迁移后仍能完成 case01 提交。

#### 当天文档更新

- 更新 API 和前端路由的实际迁移状态。
- 更新 Version 1.2 Assignment/提交验收结果。
- 更新 `PROJECT_STATE.md`，将下一步切到集成验收。

---

### Day 7：集成验收、回归、演示数据与文档收口

#### 目标

- 证明 ADMIN、TEACHER、STUDENT 三角色完整控制链路可用。
- 证明班级隔离、历史兼容和资源安全没有回归。
- 完成 Version 1.2 可演示版本和启动说明。

#### 前置条件

- Day1-Day6 的每日验收全部通过。
- 数据库可由 migration + seed 从空环境重建。

#### 具体实施步骤

1. 重建演示数据库，准备：
   - 一个 ADMIN。
   - 两个 TEACHER 和两个 ClassSection。
   - 每班至少一个 STUDENT 和 ACTIVE Enrollment。
   - case01、production_planning Exercise。
   - 一班 PUBLISHED Release 和 Assignment；二班无 Release。
2. 执行 ADMIN 链路：登录、查看 Case、编辑元数据、查看 Exercise、执行资源检查和预览。
3. 执行 TEACHER 链路：选择班级、查看学生、发布 Case、创建并发布 Assignment、查看提交。
4. 执行 STUDENT 链路：登录、查看本班 Case/Assignment、进入 workspace、下载资源、提交、查看详情。
5. 执行隔离链路：二班学生无法看到或访问一班 Case、Assignment、资源和 Submission。
6. 执行状态链路：UPCOMING 不可提交、OPEN 可提交、LATE 按规则标记、CLOSED 不可提交、ARCHIVED 保留历史。
7. 执行资源安全检查：下载包不含隐藏数据和教师文件。
8. 清理所有临时运行文件，不删除用户已有数据或 Week1 legacy 资产。
9. 更新 README、API 列表、项目结构、启动命令、PROJECT_STATE 和 Version 1.2 验收记录。

#### 测试方案

- `pnpm --filter @decision-lab/shared typecheck && build`。
- `pnpm --filter backend test && typecheck && build`。
- Prisma validate、migration status、空库 migrate、seed 和重复 seed。
- Runner case01 回归测试。
- `pnpm --filter frontend exec ngc -p tsconfig.app.json` 和 production build。
- API 集成测试覆盖三角色、两个班和完整发布链路。
- 浏览器桌面与移动端检查 ADMIN、TEACHER、STUDENT 关键页面；若运行环境无 browser，记录限制并由人工补验。
- `git diff --check`、敏感文件检查和未跟踪运行产物检查。

#### 验收标准

- ADMIN 能维护共享 case01 Case 和 Exercise 元数据并检查资源。
- TEACHER 能决定自己班级可见的 Case，并将 Exercise 发布为 Assignment。
- STUDENT 只能看到自己班级发布的案例和作业。
- Case 可见但无 Assignment 时只能阅读。
- 所有工作区、资源下载和提交从 Assignment 权限链路进入。
- Week2 历史提交、结果和 Score 仍可查询。
- Version 1.2 验收清单全部通过，所有已知限制有记录。

#### 当天文档更新

- 将 `VERSION_1_2_ACCEPTANCE.md` 从计划更新为实际验收记录。
- 将 `PROJECT_STATE.md` 的 Current Phase 更新为 Week3 completed。
- 下一阶段只记录候选方向，不提前引入 Week4 技术或新 Case。

## 4. Week3 总体测试矩阵

| 范围 | 必测内容 |
|------|----------|
| 数据迁移 | Week2 id、Submission、RunResult、Score、外键和重复 seed |
| Case | CRUD、状态流转、唯一 code、归档保护、角色权限 |
| Exercise | Case 内唯一 code、资源检查、状态、资源包安全、runner 兼容 |
| SectionCaseRelease | 唯一性、时间窗口、状态、教师归属、学生跨班隔离 |
| Assignment | 发布前置条件、状态机、Availability、次数、迟交、重复发布 |
| 学生访问 | `/me/cases`、`/me/assignments`、workspace、资源、提交、历史 |
| 角色权限 | ADMIN/TEACHER/STUDENT 允许与拒绝矩阵 |
| 前端 | 表单、加载/错误/空状态、路由守卫、旧链接迁移、响应式布局 |

## 5. Week3 全局完成标准

- ADMIN 可以通过管理页面维护 Case/Exercise 元数据和发布状态。
- TEACHER 可以管理自己教学班的学生、可见 Case 和 Assignment。
- STUDENT 只看到自己教学班通过 SectionCaseRelease 和 Assignment 发布的内容。
- Exercise 资源归属、下载包和 runner 定位统一，不再依赖 Case 级资源。
- Assignment 成为工作区、资源授权和提交的唯一教学上下文。
- 两个教学班的隔离测试和 Week2 历史兼容测试通过。
- 不新增其他 Case，不扩展 Week3 禁止的基础设施或完整评分流程。
