# 教学实验平台 1.2 验收计划

> 版本目标：完成 case01 的案例目录、练习目录、班级案例发布和作业发布控制面。

## 一、角色链路

- [x] ADMIN 创建、编辑、发布和归档 Case。（2026-06-30：自动化测试及真实 PostgreSQL API 链路通过）
- [x] ADMIN 创建、编辑、检查、发布和归档 Exercise。（2026-06-30：自动化状态/资源测试及真实 PostgreSQL API 验收通过）
- [x] TEACHER 只能管理自己负责的教学班。（2026-06-30：真实双教师跨班请求返回 403）
- [x] TEACHER 通过 `SectionCaseRelease` 将 PUBLISHED Case 发布给教学班。（批量事务、窗口、重复和状态测试通过）
- [x] TEACHER 从已发布 Case 中选择 PUBLISHED Exercise 创建 Assignment。（2026-06-30：草稿、资源检查、发布、关闭、归档及真实 API 验收通过）
- [x] STUDENT 只看到 ACTIVE Enrollment 所属班级发布的内容。（主班仅见 case01，对照班为空且详情 404）

## 二、可见性场景

| 场景 | 预期结果 |
|------|----------|
| 一班发布 case01，二班未发布 | 一班学生可见，二班学生不可见 |
| Case 已发布但无 Assignment | 学生可阅读案例，不能进入 Exercise 工作区或下载练习包 |
| 两班发布同一 Exercise | 可配置不同开放时间、截止时间、次数和迟交规则 |
| Assignment CLOSED | 不可继续提交，案例、历史提交和成绩仍可读取 |
| Case/Exercise ARCHIVED | 不可新发布，历史记录仍可读取 |

Day5 已验证第一项隔离场景以及 Release 的 DRAFT/PUBLISHED/ARCHIVED、时间窗口、重复约束和无 Assignment 空摘要。Day6 已验证同一 Exercise 可在两班使用不同次数/迟交规则，UPCOMING 拒绝、LATE 标记、次数耗尽拒绝，以及 ARCHIVED Assignment 历史详情可读。

## 三、资源与提交场景

- [x] 练习资源包由 Exercise 生成。
- [x] 资源包只包含说明、默认模板、公开数据集和公开 output schema。
- [x] 隐藏数据、validator 和教师参考实现不进入资源包。（zip 文件清单与敏感内容自动化检查通过）
- [x] 非本班 Assignment 对应的 Exercise 资源下载返回 403。（真实双班 Assignment 资源请求通过）
- [x] 提交唯一入口为 `POST /api/v1/assignments/:assignmentId/submissions`。
- [x] 提交前检查班级、状态、时间、迟交规则和剩余次数。（自动化与真实 PostgreSQL API 验收通过）

## 四、兼容性场景

- [x] Week2 case01 历史 Submission、RunResult 和 Score 关系不变。（重复 seed 前后均为 22 条 Submission、22 条 RunResult，原 Exercise id 与外键不变）
- [x] 旧 Exercise workspace 链接提供迁移或明确重定向。（唯一/无匹配/多匹配策略及测试已完成）
- [x] shared、backend、frontend 构建通过。（2026-06-30：Day3 变更验证通过；Angular 生产构建按已知环境约束在沙箱外执行）
- [x] Prisma migration 和 seed 可重复执行。（Day1 migration 已验收；Day4 seed 连续执行两次通过）
