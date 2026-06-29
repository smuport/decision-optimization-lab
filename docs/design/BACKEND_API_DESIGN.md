# 后端 API 设计文档 (Backend API Design)

> 基于 NestJS 的 RESTful API 设计，包含所有接口定义、DTO、错误码和 Swagger 说明。
> 配套文件: `backend/src/**/*.controller.ts`, `backend/src/**/*.dto.ts`

---

## 0. API 修订结论

原 API 覆盖通用用户、案例、提交和排行榜，但课程平台还需要课程教学组织 API。建议优先实现 MVP API，再逐步扩展。

### 0.1 MVP API 范围

| 模块 | 必做接口 | 后置接口 |
|------|----------|----------|
| Auth | 登录、当前用户、修改密码 | 开放注册、第三方登录 |
| Course | 当前课程、学期、班级列表 | 多课程管理 |
| Enrollment | 导入学生名单、查看班级学生 | 自助选课 |
| Case/Exercise | 案例列表、案例详情、实验任务详情 | 完整 CRUD、版本发布流 |
| Dataset/Template | 下载公开数据、下载模板 | 对象存储签名 URL |
| Submission | 创建提交、查看状态、查看结果、提交历史 | 取消任务、重跑、批量重评 |
| Report | 提交实验报告、教师查看报告 | 富文本批注 |
| Teacher Dashboard | 班级进度、通过率、常见错误 | 排行榜、周榜 |

### 0.2 认证与注册修订

不建议普通学生注册时传入 `role`。真实课程场景建议：

1. 教师导入学生名单，生成未激活账号。
2. 学生用学号首次登录/激活。
3. `role` 只能由教师或管理员设置。
4. API 请求里如果出现普通用户传 `role`，后端必须忽略或拒绝。

修订后的注册/激活请求建议：

```json
{
  "studentId": "202430001",
  "activationCode": "course-issued-code",
  "password": "SecurePass123",
  "name": "张三",
  "email": "student@example.com"
}
```

### 0.3 新增核心 API

```text
GET  /api/v1/courses/current
GET  /api/v1/terms/current/sections
POST /api/v1/admin/sections/:id/enrollments/import

GET  /api/v1/exercises
GET  /api/v1/exercises/:id
GET  /api/v1/exercises/:id/datasets
GET  /api/v1/exercises/:id/template
GET  /api/v1/exercises/:id/resources/download

POST /api/v1/assignments/:id/submissions
GET  /api/v1/submissions/:id
GET  /api/v1/submissions/:id/results
POST /api/v1/submissions/:id/report

GET  /api/v1/teacher/sections/:id/progress
GET  /api/v1/teacher/assignments/:id/submissions
PATCH /api/v1/teacher/submissions/:id/manual-grade
```

### 0.4 提交响应建议

提交接口应返回任务状态和轮询/订阅地址，而不是假定立即有评分：

```json
{
  "code": 0,
  "message": "提交已创建",
  "data": {
    "submissionId": "sub_001",
    "status": "QUEUED",
    "statusUrl": "/api/v1/submissions/sub_001",
    "resultUrl": "/api/v1/submissions/sub_001/results",
    "wsTopic": "submission:sub_001"
  }
}
```

### 0.5 Week2 Day3 实现状态

当前后端已按 MVP 范围实现上述核心接口，但有以下阶段性约束：

| 能力 | 当前实现 | 后续方向 |
|------|----------|----------|
| Auth | demo 登录和 `GET /auth/me`，返回演示 token | 引入真实 JWT、密码哈希、角色鉴权和激活流程 |
| Prisma | `backend/src/prisma` 作为唯一 Prisma Client 访问层 | 继续保持 Prisma Client 后端专用，前端只消费 API/DTO |
| Submission | 创建提交后同步调用本地 `runner/evaluate.py` 并写入 `Submission`/`RunResult` | 后续改为队列、异步任务、隔离沙箱和可取消/重跑 |
| Report | `POST /submissions/:id/report` 只创建/更新 DRAFT 占位入口 | 后续实现完整报告上传、查看、批注流程 |
| ManualGrade | `PATCH /teacher/submissions/:id/manual-grade` 只提供教师端评分入口占位 | 后续实现正式人工评分规则、权限和成绩汇总 |
| Teacher Dashboard | 已提供班级进度和提交列表基础读取 | 后续增加统计图、常见错误、排行榜和导出 |

Week2 仍不引入 Redis、BullMQ、MinIO、独立 FastAPI evaluator、Docker 沙箱、WebSocket、排行榜、Monaco 编辑器或完整报告/评分工作流。

### 0.6 Week2 资源包下载

`GET /api/v1/exercises/:id/datasets` 和 `GET /api/v1/exercises/:id/template` 保持 JSON 读取语义，供前端预览、工作区默认代码和数据集选择使用。

学生下载使用独立资源包接口：

```text
GET /api/v1/exercises/:id/resources/download
```

响应为 zip 文件，包含该实验的默认提交模板、公开数据集和资源包说明 `README.md`。MVP 阶段由后端从本地 `course-assets` 动态打包，后续如迁移对象存储，可改为重定向或签名 URL。

### 0.7 Week2 Day6/Day7 响应字段补充

为支持剩余两天的 MVP 页面，保持现有路由不变，只补充响应字段：

- `GET /api/v1/submissions/:id` 返回 `codeText?: string`，用于提交详情页只读回显。
- `GET /api/v1/teacher/sections/:id/progress` 返回 `averageScore: number`，用于教师面板展示班级平均分。
- teacher progress 的 assignment 摘要返回 assignment-level `averageScore`，用于展示每个作业的平均得分。

Week2 的平均分以已有 `RunResult.score` 的提交为样本计算，未产生评测结果的提交不按 0 分计入；没有已评分提交时返回 `0`。该口径反映当前同步评测记录，不等同于后续正式成绩册中的学生最佳成绩平均值。

这些补充不引入新的提交路由、队列、WebSocket 或完整评分工作流。

### 0.8 Week3 管理控制面 API

Week3 API 使用当前认证用户决定数据范围。ADMIN 维护课程级 Case/Exercise；TEACHER 维护自己负责教学班的案例发布和 Assignment；STUDENT 只读取所属教学班发布的内容。

#### ADMIN 案例管理

```text
GET    /api/v1/admin/cases
POST   /api/v1/admin/cases
GET    /api/v1/admin/cases/:id
PATCH  /api/v1/admin/cases/:id
PATCH  /api/v1/admin/cases/:id/status
```

创建和更新字段包括 `courseId`、`code`、`title`、`subtitle`、`category`、`difficulty`、`knowledgePoints`、`summary` 和 `sortOrder`。状态只能在 `DRAFT | PUBLISHED | ARCHIVED` 中流转；已有发布或历史作业的 Case 不提供物理删除接口。

#### ADMIN 练习管理

```text
GET    /api/v1/admin/cases/:caseId/exercises
POST   /api/v1/admin/cases/:caseId/exercises
GET    /api/v1/admin/exercises/:id
PATCH  /api/v1/admin/exercises/:id
PATCH  /api/v1/admin/exercises/:id/status
GET    /api/v1/admin/exercises/:id/resource-check
```

Exercise 管理字段包括 `code`、`title`、`description`、`kind`、`entrypoint`、`outputSchema`、`guide`、`assetPath` 和 `sortOrder`。Week3 不通过 API 编辑模板、数据文件、rubric 或 validator，只读取仓库资源并执行完整性检查。

资源完整性响应：

```json
{
  "exerciseId": "exercise-case01-production-planning",
  "ready": true,
  "checks": {
    "entrypoint": true,
    "outputSchema": true,
    "defaultTemplate": true,
    "publicDataset": true,
    "activeRubric": true,
    "validator": true
  },
  "messages": []
}
```

只有 `ready=true` 的 Exercise 可以从 DRAFT 变为 PUBLISHED。

#### TEACHER 教学班案例发布

```text
GET    /api/v1/teacher/sections/:sectionId/case-releases
POST   /api/v1/teacher/sections/:sectionId/case-releases
PATCH  /api/v1/teacher/case-releases/:id
PATCH  /api/v1/teacher/case-releases/:id/status
```

请求字段为 `caseId`、`visibleFrom?`、`visibleUntil?` 和 `sortOrder`。后端必须校验当前教师负责该教学班、Case 为 PUBLISHED、时间窗口合法且 `(sectionId, caseId)` 不重复。

#### TEACHER 作业管理

```text
GET    /api/v1/teacher/sections/:sectionId/assignments
POST   /api/v1/teacher/sections/:sectionId/assignments
GET    /api/v1/teacher/assignments/:id
PATCH  /api/v1/teacher/assignments/:id
POST   /api/v1/teacher/assignments/:id/publish
POST   /api/v1/teacher/assignments/:id/close
POST   /api/v1/teacher/assignments/:id/archive
```

Assignment 创建和编辑字段包括 `exerciseId`、`title`、`description`、`opensAt?`、`dueAt?`、`maxAttempts?` 和 `allowLate`。发布操作必须原子校验：

1. 当前教师负责该教学班。
2. Exercise 为 PUBLISHED。
3. Exercise 所属 Case 已通过 PUBLISHED SectionCaseRelease 发布给该教学班。
4. Exercise 资源完整性检查通过。
5. `opensAt <= dueAt`，且提交次数为正数或空值。

Assignment 持久化状态为 `DRAFT | PUBLISHED | CLOSED | ARCHIVED`；响应同时返回计算状态 `UPCOMING | OPEN | LATE | CLOSED`。

#### STUDENT 当前用户接口

```text
GET /api/v1/me/cases
GET /api/v1/me/cases/:caseId
GET /api/v1/me/assignments
GET /api/v1/me/assignments/:assignmentId
```

`/me/cases` 只返回当前学生 ACTIVE Enrollment 所属教学班中，位于可见时间窗口的 PUBLISHED SectionCaseRelease。Case 详情只返回本班已发布 Assignment 对应的 Exercise 摘要，不暴露未发布练习。

`/me/assignments` 返回 Assignment 持久化状态、计算状态、Case/Exercise 摘要、截止时间、提交次数和剩余次数。

#### Exercise 资源与提交

```text
GET  /api/v1/exercises/:exerciseId/resources/download
POST /api/v1/assignments/:assignmentId/submissions
```

- 资源包归属 Exercise，由默认模板、公开数据集、练习 README 和公开 output schema 动态生成。
- STUDENT 只有在所属教学班存在该 Exercise 的可见 Assignment 时才能下载。
- TEACHER 只能预览自己负责课程/教学班可管理的 Exercise；ADMIN 可以直接预览。
- 提交必须从 Assignment 进入，后端校验班级归属、计算状态、迟交规则和剩余次数。

#### Week3 权限矩阵

| 能力 | ADMIN | TEACHER | STUDENT |
|------|:-----:|:-------:|:-------:|
| 管理 Case/Exercise | ✓ |  |  |
| 预览 Exercise 资源 | ✓ | 自己管理范围 | 本班已发布作业 |
| 发布 Case 到教学班 |  | 自己负责班级 |  |
| 管理 Assignment |  | 自己负责班级 |  |
| 查看班级已发布 Case | ✓ | 自己负责班级 | 自己所属班级 |
| 提交 Assignment |  |  | 自己所属班级 |

#### Week3 业务错误码

| code | 含义 |
|------|------|
| `CASE_NOT_RELEASED_TO_SECTION` | Case 未发布给该教学班 |
| `CASE_RELEASE_NOT_VISIBLE` | 案例发布尚未开始、已结束或已归档 |
| `EXERCISE_NOT_PUBLISHED` | Exercise 不是 PUBLISHED |
| `EXERCISE_RESOURCES_INCOMPLETE` | 练习资源完整性检查失败 |
| `ASSIGNMENT_NOT_OPEN` | Assignment 尚未开放 |
| `ASSIGNMENT_CLOSED` | Assignment 已关闭或归档 |
| `ASSIGNMENT_ATTEMPT_LIMIT_REACHED` | 已达到最大提交次数 |
| `SECTION_ACCESS_DENIED` | 当前用户不属于或无权管理该教学班 |

#### Week3 shared DTO

`packages/shared` 使用以下契约名称，前后端不得另行定义重复 response interface：

| DTO | 用途 |
|-----|------|
| `AdminCaseListItemDto` / `AdminCaseDetailDto` | ADMIN Case 列表与详情 |
| `CreateCaseRequest` / `UpdateCaseRequest` / `UpdateCaseStatusRequest` | Case 管理请求 |
| `AdminExerciseListItemDto` / `AdminExerciseDetailDto` | ADMIN Exercise 列表与详情 |
| `CreateExerciseRequest` / `UpdateExerciseRequest` / `UpdateExerciseStatusRequest` | Exercise 管理请求 |
| `ExerciseResourceCheckDto` | 六项资源检查、ready 和 messages |
| `SectionCaseReleaseDto` | 教学班 Case 发布状态、时间和排序 |
| `CreateCaseReleaseRequest` / `UpdateCaseReleaseRequest` | CaseRelease 管理请求 |
| `TeacherAssignmentDto` | 教师 Assignment 详情、持久化状态和计算状态 |
| `CreateAssignmentRequest` / `UpdateAssignmentRequest` | Assignment 管理请求 |
| `StudentCaseListItemDto` / `StudentCaseDetailDto` | 当前学生可见 Case |
| `StudentAssignmentListItemDto` / `StudentAssignmentDetailDto` | 当前学生可见 Assignment、次数和状态 |

所有创建/更新请求同时提供运行时校验 schema；日期使用 ISO 8601 字符串，枚举直接复用 shared 定义。

Prisma model 只在 repository/service 内部流转。每个模块通过显式 mapper 将数据库字段、JSON 值、日期和计算状态转换为上述 shared DTO；Controller 只能返回 DTO 或 `ApiResponse<DTO>`，不得直接返回 Prisma model，也不得将 Prisma 类型导出到 shared 或 frontend。

### 0.9 被 Week3 替代的旧 API 口径

以下旧设计仅作历史参考，不再作为实现依据：

- Case 级数据集和模板下载；资源统一归属 Exercise。
- `POST /api/v1/submissions`；提交统一使用 Assignment-centric 路由。
- 学生直接读取全量 `GET /api/v1/exercises`；学生使用 `/me/cases` 和 `/me/assignments`。
- MinIO 签名 URL、队列位置和 WebSocket 字段；Week3 继续使用本地资源和同步 runner。

本文后续“案例模块”和“提交模块”中的旧通用 OJ 示例若与 0.8 冲突，均以 0.8 为准。

### 0.10 Week3 Day2 认证与权限实施状态

2026-06-29 已将 Week2 demo token 替换为真实 JWT：

- `POST /api/v1/auth/login` 必须提供学号或邮箱及密码；密码使用 bcrypt hash 校验，并拒绝 INACTIVE/SUSPENDED 账号。
- access token 有效期为 1 小时，只包含 `sub`、`role`、`type=access`；服务端每次请求回查用户状态和当前角色，不信任客户端 section 信息。
- `GET /api/v1/auth/me` 返回 JWT 对应当前用户，不再回退到固定 demo student。
- `JwtAuthGuard` 和 `RolesGuard` 作为全局 guard；只有登录和 health 显式 `@Public()`。
- 全局 RolesGuard 对路径提供默认策略：`/admin/**` 使用 ADMIN、`/teacher/**` 使用 TEACHER、`/me/**` 使用 STUDENT；提交创建、资源和报告等混合路径再使用显式 `@Roles()`。
- `SectionAccessService` 统一校验 ACTIVE Enrollment、`ClassSection.teacherId`、Assignment、Submission 和 Exercise 资源归属。
- Submission 创建固定使用 `@CurrentUser()` 的 student id，shared strict schema 拒绝请求体 `userId`；人工评分固定使用当前 teacher id，拒绝 `graderId`。
- 课程、教学班、Exercise、资源包和提交详情响应均按当前用户范围过滤或返回 403。
- 错误响应统一使用 `ApiError`；未登录/无效 token 为 `2001/401`，过期 token 为 `2003/401`，角色或教学班越权为 `2002/403`，教学班越权的 `details` 为 `SECTION_ACCESS_DENIED`。

本地开发通过 `DECISION_LAB_JWT_SECRET` 配置签名密钥；未配置时仅使用代码中的本地开发 fallback，不应用于正式部署。

## 一、API 设计规范

### 1.1 通用约定

| 项目 | 规范 |
|------|------|
| 基础路径 | `/api/v1` |
| 认证方式 | `Authorization: Bearer <JWT>` |
| 内容类型 | `Content-Type: application/json` |
| 分页参数 | `page`, `pageSize` (默认 1, 20) |
| 排序参数 | `sortBy`, `sortOrder` (asc/desc) |
| 响应格式 | 统一封装（见 1.2） |
| 错误码 | 见 1.3 |

### 1.2 统一响应格式

```typescript
// 成功响应
interface ApiResponse<T> {
  code: number;      // 业务状态码，0 表示成功
  message: string;   // 提示信息
  data: T;           // 响应数据
  timestamp: string;  // ISO 8601 时间
}

// 分页响应
interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    list: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

// 错误响应
interface ApiError {
  code: number;      // 错误码（非 0）
  message: string;   // 错误信息
  details?: string;  // 详细错误信息
  path: string;       // 请求路径
  timestamp: string;
}
```

### 1.3 错误码定义

| 错误码 | 含义 | HTTP 状态码 |
|--------|------|-------------|
| 0 | 成功 | 200 |
| 1001 | 参数错误 | 400 |
| 1002 | 资源未找到 | 404 |
| 1003 | 资源已存在 | 409 |
| 1004 | 文件过大 | 413 |
| 2001 | 未授权 | 401 |
| 2002 | 权限不足 | 403 |
| 2003 | Token 过期 | 401 |
| 3001 | 评测队列已满 | 429 |
| 3002 | 评测频率限制 | 429 |
| 3003 | 评测超时 | 408 |
| 5001 | 服务器内部错误 | 500 |
| 5002 | 数据库错误 | 500 |
| 5003 | 评测服务不可用 | 503 |

---

## 二、认证模块 (Auth)

### 2.1 用户激活/注册

```
POST /api/v1/auth/register
```

> 课程场景建议先由教师导入学生名单。此接口只用于学生首次激活账号，不允许客户端指定角色。

**Request Body**:

```json
{
  "studentId": "202430001",
  "activationCode": "course-issued-code",
  "email": "student@example.com",
  "password": "SecurePass123",
  "name": "张三"
}
```

**Response**:

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "id": "uuid-001",
    "studentId": "202430001",
    "email": "student@example.com",
    "name": "张三",
    "role": "STUDENT",
    "createdAt": "2024-06-20T08:00:00Z"
  },
  "timestamp": "2024-06-20T08:00:00Z"
}
```

### 2.2 用户登录

```
POST /api/v1/auth/login
```

**Request Body**:

```json
{
  "studentNo": "202430001",
  "password": "SecurePass123"
}
```

教师和管理员没有学号时使用 `email + password`；`studentNo` 与 `email` 必须且只能至少提供一个。额外字段由 shared strict schema 拒绝。

**Response**:

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid-001",
      "studentNo": "202430001",
      "email": "student@example.com",
      "name": "张三",
      "role": "STUDENT"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  },
  "timestamp": "2024-06-20T08:00:00Z"
}
```

### 2.3 刷新 Token

> Week3 Day2 仅签发 refresh token 以保持响应契约兼容，刷新接口尚未开放；前端 token 失效后重新登录。正式实现刷新轮换前，不应调用下述预留接口。

```
POST /api/v1/auth/refresh
```

**Request Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2.4 获取当前用户

```
GET /api/v1/auth/me
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid-001",
    "studentId": "202430001",
    "email": "student@example.com",
    "name": "张三",
    "role": "STUDENT",
    "avatar": "https://...",
    "lastLoginAt": "2024-06-20T08:00:00Z"
  }
}
```

---

## 三、用户模块 (Users)

> 权限: TEACHER / ADMIN

### 3.1 用户列表

```
GET /api/v1/users?page=1&pageSize=20&role=STUDENT&search=张三
```

**Query Parameters**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| pageSize | number | 每页数量，默认 20 |
| role | string | 筛选角色 |
| search | string | 按姓名/学号搜索 |
| status | string | 筛选状态 |

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid-001",
        "studentId": "202430001",
        "name": "张三",
        "role": "STUDENT",
        "status": "ACTIVE",
        "submitCount": 15,
        "lastLoginAt": "2024-06-20T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 3.2 创建用户

```
POST /api/v1/users
```

**Request Body**:

```json
{
  "studentId": "202430002",
  "email": "ta@example.com",
  "password": "TempPass123",
  "name": "李四",
  "role": "TA"
}
```

### 3.3 更新用户

```
PATCH /api/v1/users/:id
```

### 3.4 删除用户

```
DELETE /api/v1/users/:id
```

---

## 四、案例模块 (Cases)

> **历史参考，Week3 已替代**：本章保留旧版通用 OJ 示例，不再作为当前实现依据。当前 Case/Exercise 管理、资源归属和学生可见性以 0.8 为准；Case 级 Dataset/Template 下载接口不再实施。

### 4.1 案例列表

```
GET /api/v1/cases?category=META_HEURISTIC&difficulty=MEDIUM&page=1&pageSize=20
```

**Query Parameters**:

| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 分类筛选 |
| difficulty | string | 难度筛选 |
| status | string | 状态筛选（学生默认只返回 PUBLISHED） |
| search | string | 按标题搜索 |
| tags | string[] | 标签筛选（多选） |
| sortBy | string | 排序字段: sortOrder, createdAt, difficulty |
| sortOrder | string | asc / desc |

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "case-uuid-16",
        "caseNumber": "case_16",
        "title": "模拟退火算法求解TSP",
        "subtitle": "从零实现SA求解旅行商问题",
        "description": "学习模拟退火算法...",
        "category": "META_HEURISTIC",
        "difficulty": "MEDIUM",
        "tags": ["TSP", "模拟退火", "2-opt"],
        "knowledgePoints": ["组合优化", "邻域搜索"],
        "datasetCount": 3,
        "templateCount": 1,
        "myBestScore": 85.5,
        "mySubmitCount": 5,
        "sortOrder": 16
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 18
    }
  }
}
```

### 4.2 案例详情

```
GET /api/v1/cases/:id
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "case-uuid-16",
    "caseNumber": "case_16",
    "title": "模拟退火算法求解TSP",
    "description": "...",
    "category": "META_HEURISTIC",
    "difficulty": "MEDIUM",
    "tags": ["TSP", "模拟退火"],
    "knowledgePoints": ["组合优化", "邻域搜索"],
    "theoryDocUrl": "/api/v1/cases/case_16/theory",  // Markdown 文档下载
    "datasets": [
      {
        "id": "ds-uuid-16s",
        "size": "SMALL",
        "fileName": "data_small.json",
        "fileSize": 602,
        "downloadUrl": "...",
        "metadata": {"n": 15}
      },
      {
        "id": "ds-uuid-16m",
        "size": "MEDIUM",
        "fileName": "data_medium.json",
        "fileSize": 1718,
        "downloadUrl": "...",
        "metadata": {"n": 50}
      },
      {
        "id": "ds-uuid-16l",
        "size": "LARGE",
        "fileName": "data_large.json",
        "fileSize": 4766,
        "downloadUrl": "...",
        "metadata": {"n": 150}
      }
    ],
    "templates": [
      {
        "id": "tmpl-uuid-16",
        "language": "python",
        "fileName": "sa_tutorial_solver.py",
        "downloadUrl": "...",
        "description": "纯Python模拟退火求解框架（无numpy依赖）"
      }
    ],
    "publishedAt": "2024-05-01T00:00:00Z"
  }
}
```

### 4.3 下载数据集

```
GET /api/v1/cases/:id/datasets/:datasetId/download
```

**Response**: 返回预签名的 MinIO URL（302 重定向）或直接流式传输

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "downloadUrl": "https://minio.example.com/datasets/...?X-Amz-Expires=300",
    "expiresIn": 300
  }
}
```

### 4.4 下载代码模板

```
GET /api/v1/cases/:id/templates/:templateId/download
```

### 4.5 创建案例（教师）

```
POST /api/v1/cases
```

**Request Body** (multipart/form-data):

```
caseNumber: "case_19"
title: "新增案例"
category: "META_HEURISTIC"
difficulty: "HARD"
tags: ["蚁群算法", "ACO"]
knowledgePoints: ["信息素更新", "启发函数"]
sortOrder: 19
theoryDoc: <file>  // Markdown 文件
datasets.small: <file>  // JSON 文件
datasets.medium: <file>
datasets.large: <file>
template.python: <file>  // Python 模板文件
```

### 4.6 更新案例

```
PATCH /api/v1/cases/:id
```

### 4.7 发布/下架案例

```
PATCH /api/v1/cases/:id/status
```

**Request Body**:

```json
{
  "status": "PUBLISHED"  // or "ARCHIVED"
}
```

---

## 五、提交模块 (Submissions)

> **历史参考，Week3 已替代**：本章旧 `POST /api/v1/submissions` 方案不再实施。当前提交唯一入口为 `POST /api/v1/assignments/:assignmentId/submissions`。

### 5.1 提交代码

```
POST /api/v1/submissions
```

**Content-Type**: `multipart/form-data`

**Form Fields**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| caseId | string | ✅ | 案例 ID |
| code | File | ✅ | Python 代码文件 (.py, max 10MB) |
| sizes | string[] | ✅ | 评测规模: ["small", "medium", "large"] |
| note | string | | 学生备注 |

**Response**:

```json
{
  "code": 0,
  "message": "提交成功，已加入评测队列",
  "data": {
    "submissionId": "sub-uuid-1234",
    "status": "QUEUED",
    "queuePosition": 3,
    "estimatedTime": "约 2 分钟",
    "websocketUrl": "wss://api.example.com/ws/evaluation/sub-uuid-1234"
  }
}
```

### 5.2 我的提交列表

```
GET /api/v1/submissions?page=1&pageSize=20&caseId=case_16&status=COMPLETED
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "sub-uuid-1234",
        "caseId": "case-uuid-16",
        "caseNumber": "case_16",
        "caseTitle": "模拟退火算法求解TSP",
        "status": "COMPLETED",
        "score": 85.5,
        "evaluatedSizes": ["small", "medium", "large"],
        "createdAt": "2024-06-20T10:00:00Z",
        "completedAt": "2024-06-20T10:02:30Z",
        "runtime": 152.5
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 15
    }
  }
}
```

### 5.3 提交详情

```
GET /api/v1/submissions/:id
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "sub-uuid-1234",
    "userId": "uuid-001",
    "userName": "张三",
    "caseId": "case-uuid-16",
    "caseNumber": "case_16",
    "caseTitle": "模拟退火算法求解TSP",
    "status": "COMPLETED",
    "codeText": "def solve(data, params=None):\n    ...",
    "codeFileName": "my_solution.py",
    "codeFileUrl": "...",  // 可下载自己的代码
    "evaluatedSizes": ["small", "medium", "large"],
    "note": "第三次尝试，调整了alpha参数",
    "createdAt": "2024-06-20T10:00:00Z",
    "startedAt": "2024-06-20T10:00:05Z",
    "completedAt": "2024-06-20T10:02:30Z",
    "result": {
      "id": "result-uuid-5678",
      "status": "SUCCESS",
      "score": 85.5,
      "scoreDetails": {
        "correctness": 35,
        "completeness": 30,
        "efficiency": 12,
        "robustness": 5,
        "codeQuality": 3.5
      },
      "totalRuntime": 45.2,
      "maxMemoryUsed": 128,
      "comment": "大规模超时，建议优化参数"
    },
    "subDatasets": [
      {
        "id": "sd-uuid-001",
        "datasetSize": "SMALL",
        "status": "SUCCESS",
        "cost": 410,
        "optimalCost": 410,
        "gap": 0.0,
        "runtime": 0.15,
        "memoryUsed": 45,
        "routeData": [6, 3, 8, 9, 2, 10, 1, 5, 13, 14, 7, 12, 0, 4, 11],
        "convergenceData": {
          "best": [652, 500, 450, ...],
          "current": [652, 700, 480, ...],
          "temperature": [1000, 995, 990, ...]
        }
      },
      {
        "id": "sd-uuid-002",
        "datasetSize": "MEDIUM",
        "status": "SUCCESS",
        "cost": 785,
        "optimalCost": 750,
        "gap": 4.7,
        "runtime": 1.2,
        "memoryUsed": 128,
        "routeData": [...],
        "convergenceData": {...}
      },
      {
        "id": "sd-uuid-003",
        "datasetSize": "LARGE",
        "status": "TIMEOUT",
        "errorMessage": "运行时间超过60秒限制",
        "runtime": 60.0
      }
    ]
  }
}
```

Week2 MVP 的 `GET /api/v1/submissions/:id` 响应必须包含 `codeText?: string`，用于提交详情页只读回显学生提交代码。该字段来自 `Submission.codeText`，不改变提交接口路由。

### 5.4 重新评测（教师/助教）

```
POST /api/v1/submissions/:id/re-evaluate
```

### 5.5 取消评测

```
DELETE /api/v1/submissions/:id
```

---

## 六、评测模块 (Evaluation)

### 6.1 查询评测状态（WebSocket 断线后恢复）

```
GET /api/v1/evaluation/:submissionId/status
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "submissionId": "sub-uuid-1234",
    "status": "RUNNING",
    "progress": {
      "current": 2,
      "total": 3,
      "currentDataset": "large",
      "percent": 66
    },
    "startedAt": "2024-06-20T10:00:05Z",
    "estimatedEndAt": "2024-06-20T10:02:00Z"
  }
}
```

### 6.2 获取评测日志（流式）

```
GET /api/v1/evaluation/:submissionId/logs
```

**Response**: SSE (Server-Sent Events) 流式推送

```
event: log
data: {"timestamp":"2024-06-20T10:00:10Z","level":"INFO","message":"开始评测 small 数据集"}

event: log
data: {"timestamp":"2024-06-20T10:00:15Z","level":"INFO","message":"small 评测完成，cost=410"}

event: complete
data: {"status":"COMPLETED"}
```

---

## 七、排行榜模块 (Leaderboard)

### 7.1 案例排行榜

```
GET /api/v1/leaderboard?caseId=case_16&scope=case&page=1&pageSize=50
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "caseId": "case_16",
    "caseTitle": "模拟退火算法求解TSP",
    "scope": "case",
    "updatedAt": "2024-06-20T10:00:00Z",
    "rankings": [
      {
        "rank": 1,
        "userId": "uuid-002",
        "studentId": "202430002",
        "name": "李四",
        "score": 98.5,
        "gap": 0.5,
        "submitCount": 8,
        "lastSubmitAt": "2024-06-20T09:00:00Z"
      },
      {
        "rank": 2,
        "userId": "uuid-001",
        "studentId": "202430001",
        "name": "张三",
        "score": 85.5,
        "gap": 4.7,
        "submitCount": 5,
        "lastSubmitAt": "2024-06-20T10:00:00Z"
      }
    ],
    "myRank": {
      "rank": 2,
      "score": 85.5,
      "isNewRecord": false
    },
    "participantCount": 100
  }
}
```

### 7.2 总排行榜

```
GET /api/v1/leaderboard?scope=overall&page=1&pageSize=50
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "scope": "overall",
    "rankings": [
      {
        "rank": 1,
        "userId": "uuid-002",
        "studentId": "202430002",
        "name": "李四",
        "totalScore": 920.0,  // 所有案例最佳成绩之和
        "completedCases": 15, // 已完成案例数
        "averageGap": 2.3
      }
    ]
  }
}
```

---

## 八、仪表盘模块 (Dashboard)

### 8.1 个人仪表盘

```
GET /api/v1/dashboard
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "overview": {
      "totalCases": 18,
      "completedCases": 12,
      "inProgressCases": 3,
      "totalSubmissions": 45,
      "averageScore": 78.5
    },
    "recentSubmissions": [
      {
        "id": "sub-uuid-1234",
        "caseNumber": "case_16",
        "caseTitle": "模拟退火算法求解TSP",
        "status": "COMPLETED",
        "score": 85.5,
        "createdAt": "2024-06-20T10:00:00Z"
      }
    ],
    "caseProgress": [
      {
        "caseId": "case-uuid-16",
        "caseNumber": "case_16",
        "title": "模拟退火算法求解TSP",
        "difficulty": "MEDIUM",
        "bestScore": 85.5,
        "submitCount": 5,
        "status": "COMPLETED"  // NOT_STARTED, IN_PROGRESS, COMPLETED
      }
    ],
    "scoreDistribution": {
      "excellent": 3,  // >= 90
      "good": 5,       // 80-89
      "pass": 4,       // 60-79
      "fail": 6        // < 60
    }
  }
}
```

---

## 九、管理后台模块 (Admin)

> 所有接口需要 TEACHER 或 ADMIN 角色

### 9.1 评测队列监控

```
GET /api/v1/admin/evaluation-queue
```

**Response**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "waiting": 5,
    "running": 2,
    "completed": 1500,
    "failed": 23,
    "activeWorkers": 4,
    "avgWaitTime": "12s",
    "avgProcessTime": "45s"
  }
}
```

### 9.2 系统日志

```
GET /api/v1/admin/audit-logs?page=1&pageSize=50&action=submit&startDate=2024-06-01&endDate=2024-06-30
```

### 9.3 成绩导出

```
GET /api/v1/admin/scores/export?format=excel&caseId=case_16
```

**Response**: 返回 Excel 文件流

---

## 十、WebSocket 事件

### 连接方式

```
WS wss://api.example.com/ws
Headers: Authorization: Bearer <JWT>
```

### 事件定义

#### 10.1 订阅评测进度

**Client → Server**:

```json
{
  "type": "subscribe",
  "channel": "evaluation",
  "submissionId": "sub-uuid-1234"
}
```

**Server → Client**:

```json
// 评测开始
{
  "type": "evaluation_started",
  "submissionId": "sub-uuid-1234",
  "timestamp": "2024-06-20T10:00:05Z",
  "data": {
    "totalDatasets": 3,
    "datasets": ["small", "medium", "large"]
  }
}

// 数据集评测完成
{
  "type": "dataset_completed",
  "submissionId": "sub-uuid-1234",
  "timestamp": "2024-06-20T10:00:15Z",
  "data": {
    "datasetSize": "small",
    "status": "SUCCESS",
    "cost": 410,
    "gap": 0.0,
    "runtime": 0.15
  }
}

// 评测全部完成
{
  "type": "evaluation_completed",
  "submissionId": "sub-uuid-1234",
  "timestamp": "2024-06-20T10:02:30Z",
  "data": {
    "status": "PARTIAL",
    "score": 85.5,
    "resultId": "result-uuid-5678"
  }
}

// 评测失败
{
  "type": "evaluation_failed",
  "submissionId": "sub-uuid-1234",
  "timestamp": "2024-06-20T10:01:00Z",
  "data": {
    "error": "Docker沙箱启动失败",
    "retryable": true
  }
}
```

---

## 十一、Swagger 文档

启动后端后访问：

```
http://localhost:3000/api/docs
```

包含：
- 所有接口的详细说明
- 请求/响应 DTO 的字段定义
- 认证方式说明
- 在线测试接口

---

## 十二、DTO 定义汇总

> 本章 class-validator 示例为早期参考。当前 Auth、Case、Exercise、Release 和 Assignment 请求契约以 `@decision-lab/shared` 导出的 Zod schema 为准。

```typescript
// ============================================
// Auth DTOs
// ============================================

class LoginDto {
  @IsString() @IsNotEmpty()
  studentId: string;

  @IsString() @IsNotEmpty() @MinLength(6)
  password: string;
}

class RegisterDto {
  @IsString() @IsNotEmpty()
  studentId: string;

  @IsString() @IsNotEmpty()
  activationCode: string;

  @IsEmail()
  email: string;

  @IsString() @IsNotEmpty() @MinLength(6)
  password: string;

  @IsString() @IsNotEmpty()
  name: string;
}

// ============================================
// Case DTOs
// ============================================

class QueryCaseDto {
  @IsEnum(CaseCategory) @IsOptional()
  category?: CaseCategory;

  @IsEnum(Difficulty) @IsOptional()
  difficulty?: Difficulty;

  @IsString() @IsOptional()
  search?: string;

  @IsArray() @IsString({ each: true }) @IsOptional()
  tags?: string[];

  @IsString() @IsOptional()
  sortBy?: string = 'sortOrder';

  @IsEnum(['asc', 'desc']) @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsNumber() @Min(1) @IsOptional() @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsNumber() @Min(1) @Max(100) @IsOptional() @Transform(({ value }) => parseInt(value))
  pageSize?: number = 20;
}

// ============================================
// Submission DTOs
// ============================================

class CreateSubmissionDto {
  @IsUUID()
  caseId: string;

  @IsArray() @IsEnum(DatasetSize, { each: true })
  sizes: DatasetSize[];

  @IsString() @IsOptional()
  note?: string;
}

class QuerySubmissionDto {
  @IsUUID() @IsOptional()
  caseId?: string;

  @IsEnum(SubmissionStatus) @IsOptional()
  status?: SubmissionStatus;

  @IsNumber() @Min(1) @IsOptional() @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsNumber() @Min(1) @Max(100) @IsOptional() @Transform(({ value }) => parseInt(value))
  pageSize?: number = 20;
}

// ============================================
// Leaderboard DTOs
// ============================================

class QueryLeaderboardDto {
  @IsUUID() @IsOptional()
  caseId?: string;

  @IsEnum(['case', 'overall', 'weekly'])
  scope: string = 'case';

  @IsNumber() @Min(1) @IsOptional() @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsNumber() @Min(1) @Max(100) @IsOptional() @Transform(({ value }) => parseInt(value))
  pageSize?: number = 50;
}
```

---

> 下一篇阅读：[前端设计文档](FRONTEND_DESIGN.md)
