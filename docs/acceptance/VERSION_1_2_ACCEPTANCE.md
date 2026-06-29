# 教学实验平台 1.2 验收计划

> 版本目标：完成 case01 的案例目录、练习目录、班级案例发布和作业发布控制面。

## 一、角色链路

- [ ] ADMIN 创建、编辑、发布和归档 Case。
- [ ] ADMIN 创建、编辑、检查、发布和归档 Exercise。
- [ ] TEACHER 只能管理自己负责的教学班。
- [ ] TEACHER 通过 `SectionCaseRelease` 将 PUBLISHED Case 发布给教学班。
- [ ] TEACHER 从已发布 Case 中选择 PUBLISHED Exercise 创建 Assignment。
- [ ] STUDENT 只看到 ACTIVE Enrollment 所属班级发布的内容。

## 二、可见性场景

| 场景 | 预期结果 |
|------|----------|
| 一班发布 case01，二班未发布 | 一班学生可见，二班学生不可见 |
| Case 已发布但无 Assignment | 学生可阅读案例，不能进入 Exercise 工作区或下载练习包 |
| 两班发布同一 Exercise | 可配置不同开放时间、截止时间、次数和迟交规则 |
| Assignment CLOSED | 不可继续提交，案例、历史提交和成绩仍可读取 |
| Case/Exercise ARCHIVED | 不可新发布，历史记录仍可读取 |

## 三、资源与提交场景

- [ ] 练习资源包由 Exercise 生成。
- [ ] 资源包只包含说明、默认模板、公开数据集和公开 output schema。
- [ ] 隐藏数据、validator 和教师参考实现不进入资源包。
- [ ] 非本班 Assignment 对应的 Exercise 资源下载返回 403。
- [ ] 提交唯一入口为 `POST /api/v1/assignments/:assignmentId/submissions`。
- [ ] 提交前检查班级、状态、时间、迟交规则和剩余次数。

## 四、兼容性场景

- [ ] Week2 case01 历史 Submission、RunResult 和 Score 关系不变。
- [ ] 旧 Exercise workspace 链接提供迁移或明确重定向。
- [ ] shared、backend、frontend 构建通过。
- [ ] Prisma migration 和 seed 可重复执行。
