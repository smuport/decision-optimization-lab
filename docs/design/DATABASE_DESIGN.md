# 数据库设计文档 (Database Design)

> 本文档使用 Prisma 语法定义数据库模型，涵盖所有实体关系、索引设计和字段说明。
> 配套文件: `backend/prisma/schema.prisma`

---

## 0. 数据库设计修订结论

原始模型覆盖了用户、案例、数据集、提交和评测结果，但更像通用 OJ。课程平台还必须表达“课程教学组织关系”，否则后续会在班级管理、截止时间、补交、成绩导出和多学期复用上遇到问题。

建议将数据库分成四个域：

| 域 | 关键实体 | 说明 |
|----|----------|------|
| 教学组织 | Course、Term、ClassSection、Enrollment | 管理课程、学期、教学班、学生名单 |
| 实验内容 | Case、Exercise、Dataset、Template、Rubric | 管理案例、具体实验任务、数据、模板、评分规则 |
| 提交评测 | Submission、RunResult、EvaluationArtifact | 管理代码提交、每个数据集运行结果、日志和可视化数据 |
| 成绩反馈 | Score、Report、ManualGrade、Feedback | 管理最佳成绩、实验报告、人工补评分和教师反馈 |

### 0.1 必须补充的实体

```prisma
model Course {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  terms       Term[]
  cases       Case[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("courses")
}

model Term {
  id          String   @id @default(uuid())
  courseId    String   @map("course_id")
  name        String   // 例如 "2025-2026 第二学期"
  startsAt    DateTime? @map("starts_at")
  endsAt      DateTime? @map("ends_at")
  sections    ClassSection[]
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@index([courseId])
  @@map("terms")
}

model ClassSection {
  id          String   @id @default(uuid())
  termId      String   @map("term_id")
  name        String   // 例如 "非全日制研究生班"
  teacherId   String?  @map("teacher_id")
  term        Term     @relation(fields: [termId], references: [id], onDelete: Cascade)
  enrollments Enrollment[]
  assignments Assignment[]

  @@index([termId])
  @@map("class_sections")
}

model Enrollment {
  id          String   @id @default(uuid())
  sectionId   String   @map("section_id")
  userId      String   @map("user_id")
  status      String   @default("ACTIVE")
  section     ClassSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([sectionId, userId])
  @@index([userId])
  @@map("enrollments")
}

model Exercise {
  id          String   @id @default(uuid())
  caseId      String   @map("case_id")
  title       String
  kind        String   // EXACT_MODELING | HEURISTIC | REPORT | MIXED
  entrypoint  String?  // 学生需要实现的函数或脚本入口
  outputSchema Json?   @map("output_schema")
  case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
  rubrics     Rubric[]
  assignments Assignment[]

  @@index([caseId])
  @@map("exercises")
}

model Assignment {
  id          String   @id @default(uuid())
  sectionId   String   @map("section_id")
  exerciseId  String   @map("exercise_id")
  opensAt     DateTime? @map("opens_at")
  dueAt       DateTime? @map("due_at")
  maxAttempts Int?     @map("max_attempts")
  allowLate   Boolean  @default(false) @map("allow_late")
  section     ClassSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  exercise    Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([sectionId, exerciseId])
  @@map("assignments")
}

model Rubric {
  id          String   @id @default(uuid())
  exerciseId  String   @map("exercise_id")
  version     Int
  rules       Json
  isActive    Boolean  @default(true) @map("is_active")
  exercise    Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([exerciseId, version])
  @@map("rubrics")
}

model Report {
  id           String   @id @default(uuid())
  submissionId String   @unique @map("submission_id")
  content      String
  attachments  Json?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("reports")
}

model ManualGrade {
  id           String   @id @default(uuid())
  submissionId String   @map("submission_id")
  graderId     String   @map("grader_id")
  scoreDelta   Float    @default(0) @map("score_delta")
  comment      String?
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([submissionId])
  @@index([graderId])
  @@map("manual_grades")
}
```

### 0.2 对原有实体的修订建议

| 原实体 | 修订建议 |
|--------|----------|
| User | 不允许普通注册接口传入 `role`；角色由教师/管理员分配。增加 `enrollments` 关系。 |
| Case | 增加 `courseId`，只描述教学案例，不直接等同一次作业。 |
| Dataset | 增加 `visibility` 字段：PUBLIC / HIDDEN；隐藏数据不提供下载。 |
| Submission | 增加 `assignmentId` 或 `exerciseId`；记录提交是否迟交、尝试次数。 |
| SubDataset | 建议改名为 `RunResult`；字段从固定 `cost` 扩展为 `objective`、`isFeasible`、`metrics`、`artifacts`。 |
| Result | 保留综合评分，但增加 `rubricVersion`，保证评分规则更新后可追溯。 |
| Score | 需要包含 `sectionId` 或 `termId`，避免不同学期成绩混在一起。 |
| Leaderboard | 后置实现；教学场景先用班级进度与通过率统计。 |

### 0.3 建议的通用运行结果结构

不同案例输出差异很大，不建议数据库只支持 TSP 式 `routeData` 或单一 `cost`。建议 `RunResult` 保存如下通用结构：

```json
{
  "status": "SUCCESS",
  "isFeasible": true,
  "objective": 410.0,
  "optimalObjective": 410.0,
  "gap": 0.0,
  "runtimeMs": 152,
  "memoryMb": 128,
  "metrics": {
    "constraintViolation": 0,
    "iterations": 50000,
    "shadowPriceError": 0.001
  },
  "visualization": {
    "route": [0, 3, 5, 1],
    "convergence": [812, 760, 650],
    "resourceUsage": {}
  }
}
```

### 0.4 MVP 数据库裁剪

第一版可以只实现以下表：

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

`leaderboards`、`audit_logs`、`system_configs` 可以后置。审计日志在正式部署前补上即可，排行榜不应成为第一阶段目标。

### 0.5 Week2 Day2 实施约定

当前项目使用 Prisma 7.8.0：

- Prisma schema 文件为 `backend/prisma/schema.prisma`。
- Prisma CLI 配置文件为 `backend/prisma.config.ts`。
- Prisma Client 在后端通过 `@prisma/adapter-pg` 连接 PostgreSQL。
- 前端不得导入 `@prisma/client` 或 Prisma 生成类型。

本地开发数据库使用 Docker Compose 启动 `postgres:14-alpine`。宿主机端口使用 `55432`，避免与本机已有 PostgreSQL `5432` 串台：

```text
postgresql://decision_lab:decision_lab_dev@127.0.0.1:55432/decision_lab?schema=public
```

如果本机已经设置了其他项目的 `DATABASE_URL`，应优先使用项目专用的 `DECISION_LAB_DATABASE_URL`，避免 Prisma 命中错误数据库。

## 一、ER 图（实体关系概览）

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │ 1     │  Submission │       │  Result     │
│  (用户)     │──────<│  (提交记录)  │<──────│  (评测结果)  │
│             │       │             │       │             │
└─────────────┘       └──────┬──────┘       └─────────────┘
                             │
                             │ N
                             │
┌─────────────┐ 1     ┌──────┴──────┐       ┌─────────────┐
│    Case     │──────<│  SubDataset │       │  Template   │
│  (案例)     │       │  (提交数据集)│       │  (代码模板)  │
│             │       │             │       │             │
└──────┬──────┘       └─────────────┘       └─────────────┘
       │
       │ N
       │
┌──────┴──────┐       ┌─────────────┐       ┌─────────────┐
│   Dataset   │       │  Leaderboard│       │  AuditLog   │
│  (数据集)   │       │  (排行榜)   │       │  (审计日志)  │
│             │       │             │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
```

---

## 二、完整 Prisma Schema

```prisma
// ============================================
// 生成器配置
// ============================================
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 枚举定义
// ============================================

enum UserRole {
  STUDENT   // 学生
  TA        // 助教
  TEACHER   // 教师
  ADMIN     // 管理员
}

enum UserStatus {
  ACTIVE    // 正常
  INACTIVE  // 未激活
  SUSPENDED // 已禁用
}

enum CaseCategory {
  LINEAR_PROGRAMMING    // 线性规划
  INTEGER_PROGRAMMING   // 整数规划
  DYNAMIC_PROGRAMMING   // 动态规划
  HEURISTIC             // 启发式算法
  META_HEURISTIC        // 元启发式算法
  NETWORK_FLOW          // 网络流
  STOCHASTIC            // 随机优化
  GAME_THEORY           // 博弈论
  MULTI_OBJECTIVE       // 多目标优化
}

enum Difficulty {
  EASY      // 简单
  MEDIUM    // 中等
  HARD      // 困难
  EXPERT    // 专家
}

enum CaseStatus {
  DRAFT     // 草稿（仅教师可见）
  PUBLISHED // 已发布
  ARCHIVED  // 已归档
}

enum DatasetSize {
  SMALL     // 小规模
  MEDIUM    // 中规模
  LARGE     // 大规模
}

enum SubmissionStatus {
  PENDING      // 等待中
  QUEUED       // 已入队
  RUNNING      // 运行中
  COMPLETED    // 已完成
  FAILED       // 失败
  TIMEOUT      // 超时
  CANCELLED    // 已取消
  COMPILE_ERROR // 编译/语法错误
}

enum ResultStatus {
  SUCCESS     // 成功
  PARTIAL     // 部分成功（部分规模失败）
  FAILED      // 失败
  TIMEOUT     // 超时
  MEMORY_EXCEEDED // 内存超限
  COMPILE_ERROR // 编译错误
  RUNTIME_ERROR // 运行时错误
  WRONG_ANSWER // 答案错误（结果偏差过大）
  INVALID_ROUTE // 路线无效（如TSP中城市未全部访问）
}

// ============================================
// 1. 用户表 (User)
// ============================================
model User {
  id            String     @id @default(uuid())
  studentId     String     @unique @map("student_id") // 学号
  email         String     @unique
  password      String     // bcrypt 哈希
  name          String
  role          UserRole   @default(STUDENT)
  status        UserStatus @default(ACTIVE)
  avatar        String?    // 头像 URL
  
  // 时间戳
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  lastLoginAt   DateTime?  @map("last_login_at")
  
  // 关系
  submissions   Submission[]
  scores        Score[]
  auditLogs     AuditLog[]
  
  @@index([role])
  @@index([status])
  @@index([studentId])
  @@map("users")
}

// ============================================
// 2. 案例表 (Case)
// ============================================
model Case {
  id            String       @id @default(uuid())
  caseNumber    String       @unique @map("case_number") // "case_01", "case_16"
  title         String
  subtitle      String?      // 副标题
  description   String?      // 简短描述
  category      CaseCategory
  difficulty    Difficulty   @default(MEDIUM)
  status        CaseStatus   @default(DRAFT)
  
  // 内容（路径或URL）
  theoryDocPath String?      @map("theory_doc_path") // Markdown 文档存储路径
  
  // 标签（JSON 数组）
  tags          Json?        // ["线性规划", "运输问题", "PuLP"]
  
  // 知识点（JSON 数组）
  knowledgePoints Json?      @map("knowledge_points") // ["整数规划建模", "MTZ约束"]
  
  // 排序权重
  sortOrder     Int          @default(0) @map("sort_order")
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  publishedAt   DateTime?    @map("published_at")
  
  // 关系
  datasets      Dataset[]
  templates     Template[]
  submissions   Submission[]
  scores        Score[]
  
  @@index([category])
  @@index([difficulty])
  @@index([status])
  @@index([sortOrder])
  @@map("cases")
}

// ============================================
// 3. 数据集表 (Dataset)
// ============================================
model Dataset {
  id            String       @id @default(uuid())
  caseId        String       @map("case_id")
  size          DatasetSize
  fileName      String       @map("file_name")
  filePath      String       @map("file_path") // MinIO 路径
  fileSize      Int          @map("file_size") // 字节
  fileHash      String       @map("file_hash") // SHA-256
  
  // 数据集元数据（JSON）
  metadata      Json?        // {"n": 15, "optimal": 410, "description": "..."}
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  // 关系
  case          Case         @relation(fields: [caseId], references: [id], onDelete: Cascade)
  subDatasets   SubDataset[]
  
  @@unique([caseId, size])
  @@map("datasets")
}

// ============================================
// 4. 代码模板表 (Template)
// ============================================
model Template {
  id            String       @id @default(uuid())
  caseId        String       @map("case_id")
  language      String       @default("python") // "python", "cpp", "java"
  fileName      String       @map("file_name")
  filePath      String       @map("file_path") // MinIO 路径
  fileSize      Int          @map("file_size")
  description   String?      // 模板说明
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  // 关系
  case          Case         @relation(fields: [caseId], references: [id], onDelete: Cascade)
  
  @@unique([caseId, language])
  @@map("templates")
}

// ============================================
// 5. 提交记录表 (Submission)
// ============================================
model Submission {
  id            String           @id @default(uuid())
  userId        String           @map("user_id")
  caseId        String           @map("case_id")
  
  // 代码文件
  codeFileName  String           @map("code_file_name")
  codeFilePath  String           @map("code_file_path") // MinIO 路径
  codeFileSize  Int              @map("code_file_size")
  codeHash      String           @map("code_hash") // SHA-256（用于检测重复提交）
  
  // 评测状态
  status        SubmissionStatus @default(PENDING)
  
  // 评测配置
  evaluatedSizes Json           @map("evaluated_sizes") // ["small", "medium", "large"]
  
  // 时间戳
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")
  submittedAt   DateTime         @default(now()) @map("submitted_at")
  startedAt     DateTime?        @map("started_at")
  completedAt   DateTime?        @map("completed_at")
  
  // 关系
  user          User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  case          Case             @relation(fields: [caseId], references: [id], onDelete: Cascade)
  subDatasets   SubDataset[]
  result        Result?
  
  @@index([userId])
  @@index([caseId])
  @@index([status])
  @@index([submittedAt])
  @@map("submissions")
}

// ============================================
// 6. 提交数据集结果表 (SubDataset)
// ============================================
// 每个提交在每个数据集上的单独运行结果
model SubDataset {
  id            String       @id @default(uuid())
  submissionId  String       @map("submission_id")
  datasetId     String       @map("dataset_id")
  
  // 运行状态
  status        ResultStatus
  
  // 目标函数值（如TSP路线长度）
  cost          Float?       // 学生代码计算的结果
  optimalCost   Float?       @map("optimal_cost") // 标准答案（教师预设）
  gap           Float?       // 相对误差 (cost - optimal) / optimal * 100
  
  // 运行指标
  runtime       Float?       // 秒
  memoryUsed    Int?         @map("memory_used") // MB
  
  // 输出内容
  stdout        String?      // 标准输出
  stderr        String?      // 标准错误
  errorMessage  String?      @map("error_message") // 错误摘要
  
  // 路线/结果数据（JSON，用于可视化）
  routeData     Json?        @map("route_data") // TSP路线等
  convergenceData Json?        @map("convergence_data") // 收敛曲线数据
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  
  // 关系
  submission    Submission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  dataset       Dataset      @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  @@unique([submissionId, datasetId])
  @@index([submissionId])
  @@index([datasetId])
  @@map("sub_dataset_results")
}

// ============================================
// 7. 综合结果表 (Result)
// ============================================
// 每个提交的综合评分结果
model Result {
  id            String       @id @default(uuid())
  submissionId  String       @unique @map("submission_id")
  
  // 综合状态
  status        ResultStatus
  
  // 评分（0-100）
  score         Float        @default(0)
  
  // 评分细项（JSON，可扩展）
  scoreDetails  Json?        @map("score_details")
  // 示例:
  // {
  //   "correctness": 40,    // 正确性得分（满分40）
  //   "completeness": 30,   // 完整性得分（所有规模都求解，满分30）
  //   "efficiency": 15,     // 效率得分（运行时间，满分15）
  //   "robustness": 10,     // 鲁棒性得分（大规模也能求解，满分10）
  //   "codeQuality": 5      // 代码质量（可选，满分5）
  // }
  
  // 总体指标
  totalRuntime  Float?       @map("total_runtime") // 秒
  maxMemoryUsed Int?         @map("max_memory_used") // MB
  
  // 评语
  comment       String?      // 教师可手动添加评语
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  // 关系
  submission    Submission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  
  @@map("results")
}

// ============================================
// 8. 成绩表 (Score) - 缓存/快照
// ============================================
// 每个用户在每个案例上的最佳成绩（用于快速查询排行榜）
model Score {
  id            String       @id @default(uuid())
  userId        String       @map("user_id")
  caseId        String       @map("case_id")
  
  // 最佳提交
  bestSubmissionId String?   @map("best_submission_id")
  bestScore     Float        @default(0)
  bestGap       Float?       // 最佳GAP
  
  // 提交次数统计
  submitCount   Int          @default(0) @map("submit_count")
  passCount     Int          @default(0) @map("pass_count") // 通过评测次数
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  // 关系
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  case          Case         @relation(fields: [caseId], references: [id], onDelete: Cascade)
  
  @@unique([userId, caseId])
  @@index([userId])
  @@index([caseId])
  @@index([bestScore])
  @@map("scores")
}

// ============================================
// 9. 排行榜快照表 (Leaderboard)
// ============================================
// 预计算的排行榜快照，定时刷新
model Leaderboard {
  id            String       @id @default(uuid())
  caseId        String?      @map("case_id") // null = 总榜
  scope         String       // "case" | "overall" | "weekly"
  
  // 排名数据（JSON 数组）
  rankings      Json         // [{"rank":1,"userId":"...","name":"...","score":95.5}]
  
  // 统计
  participantCount Int       @map("participant_count")
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  expiresAt     DateTime     @map("expires_at")
  
  @@index([caseId])
  @@index([scope])
  @@index([expiresAt])
  @@map("leaderboards")
}

// ============================================
// 10. 审计日志表 (AuditLog)
// ============================================
model AuditLog {
  id            String       @id @default(uuid())
  userId        String?      @map("user_id")
  
  action        String       // "login", "submit", "download", "grade_update"
  resourceType  String       @map("resource_type") // "user", "case", "submission"
  resourceId    String?      @map("resource_id")
  
  // 请求详情
  ipAddress     String?      @map("ip_address")
  userAgent     String?      @map("user_agent")
  requestMethod String?      @map("request_method")
  requestPath   String?      @map("request_path")
  requestBody   Json?        @map("request_body") // 脱敏后的请求体
  
  // 变更前后（用于数据变更审计）
  beforeValue   Json?        @map("before_value")
  afterValue    Json?        @map("after_value")
  
  // 时间戳
  createdAt     DateTime     @default(now()) @map("created_at")
  
  // 关系
  user          User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============================================
// 11. 系统配置表 (SystemConfig)
// ============================================
model SystemConfig {
  id            String       @id @default(uuid())
  key           String       @unique
  value         String
  description   String?
  
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  @@map("system_configs")
}
```

---

## 三、表设计说明

### 3.1 User 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `studentId` | String | 学号，唯一索引，用于登录和显示 |
| `role` | Enum | 四角色权限体系，所有 API 鉴权的基础 |
| `status` | Enum | 支持禁用未激活账号 |
| `lastLoginAt` | DateTime | 用于活跃度统计和安全审计 |

### 3.2 Case 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `caseNumber` | String | 业务编号如 "case_16"，URL 路由和文件目录的关联键 |
| `category` | Enum | 9 大优化分类，支持前端筛选和课程章节组织 |
| `knowledgePoints` | Json | 灵活的知识点标签，无需额外表 |
| `sortOrder` | Int | 控制案例在列表中的显示顺序 |
| `status` | Enum | 草稿/发布/归档，发布后才对学生可见 |

### 3.3 Submission 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `codeHash` | String | SHA-256 哈希，用于检测重复提交（直接返回已有结果） |
| `evaluatedSizes` | Json | 本次评测请求哪些规模（学生可勾选） |
| `status` | Enum | 完整的评测生命周期状态机 |

**状态机流转**:

```
PENDING → QUEUED → RUNNING → COMPLETED
                          ↘ FAILED / TIMEOUT / CANCELLED
COMPILE_ERROR (直接失败)
```

### 3.4 SubDataset 表

**核心设计**：每个提交在每个数据集上都有独立的运行记录。

举例：学生提交 TSP 代码，评测 small + medium + large → 生成 3 条 SubDataset 记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `cost` | Float | 学生代码计算的目标函数值 |
| `optimalCost` | Float | 教师预设的标准答案（可空，部分案例无精确解） |
| `gap` | Float | 相对误差，计算公式见下文 |
| `routeData` | Json | 路线序列（如 TSP 的 `[6,3,8,9,...]`），用于前端可视化 |
| `convergenceData` | Json | 收敛曲线数据，用于前端绘制 |

**GAP 计算公式**:

```
GAP = (cost - optimalCost) / optimalCost * 100

// 对于启发式算法（无精确解），可计算与最优已知解的 GAP
// 或与班级最优解的相对 GAP
```

### 3.5 Result 表

**评分算法**（可配置，按案例定制）:

```python
# 默认评分算法（100分制）
def calculate_score(sub_dataset_results):
    score = 0
    
    # 1. 正确性 (40分): 每个规模 gap <= 5% 得满分
    for r in sub_dataset_results:
        if r.status == "SUCCESS":
            if r.gap <= 0:    # 精确最优
                score += 40 / 3
            elif r.gap <= 5:  # 5% 误差内
                score += 30 / 3
            elif r.gap <= 10: # 10% 误差内
                score += 20 / 3
            elif r.gap <= 20: # 20% 误差内
                score += 10 / 3
            else:
                score += 5 / 3   # 有结果但偏差大
    
    # 2. 完整性 (30分): 所有请求规模都有成功结果
    success_count = sum(1 for r in sub_dataset_results if r.status == "SUCCESS")
    score += 30 * (success_count / len(sub_dataset_results))
    
    # 3. 效率 (15分): 运行时间打分（越快越好）
    # 基准时间: small 1s, medium 5s, large 30s
    # ...
    
    # 4. 鲁棒性 (10分): 大规模也成功求解
    large_result = get_large_result(sub_dataset_results)
    if large_result and large_result.status == "SUCCESS":
        score += 10
    
    # 5. 代码质量 (5分): 静态检查（可选）
    # ...
    
    return min(score, 100)
```

### 3.6 Score 表（缓存表）

**为什么需要单独的 Score 表？**

排行榜查询需要频繁计算 "每个用户每个案例的最佳成绩"。如果每次从 Submission + Result 实时计算，性能极差。

Score 表作为**物化视图/缓存**：
- 评测完成时，触发更新 Score 记录
- 排行榜直接读取 Score 表，O(1) 查询

### 3.7 Leaderboard 表（快照表）

**预计算策略**：
- 案例榜：每个案例独立排名，每 5 分钟刷新
- 总榜：综合所有案例，每 10 分钟刷新
- 周榜：本周提交，每周一刷新

**过期策略**：`expiresAt` 字段，前端发现过期时触发重新计算。

---

## 四、索引设计

### 高频查询场景与索引

| 场景 | 查询条件 | 索引 |
|------|----------|------|
| 学生查看我的提交 | `userId` + `submittedAt DESC` | `@@index([userId, submittedAt])` |
| 案例提交列表 | `caseId` + `status` | `@@index([caseId, status])` |
| 排行榜 | `caseId` + `bestScore DESC` | `@@index([caseId, bestScore])` |
| 活跃提交 | `status = RUNNING` | `@@index([status])` |
| 审计日志查询 | `userId` + `createdAt DESC` | `@@index([userId, createdAt])` |
| 学号登录 | `studentId` | `@@unique([studentId])` |

### 分区建议（大规模生产环境）

| 表 | 分区策略 | 原因 |
|----|----------|------|
| `submissions` | 按 `submittedAt` 月分区 | 写入频繁，历史数据查询少 |
| `audit_logs` | 按 `createdAt` 月分区 | 日志量大，保留策略可按分区删除 |
| `sub_dataset_results` | 按 `createdAt` 月分区 | 随提交量增长 |

---

## 五、数据初始化脚本

```typescript
// scripts/seed-cases.ts
// 初始化 18 个案例的元数据

const cases = [
  {
    caseNumber: "case_01",
    title: "从零建模到PuLP编程",
    category: "LINEAR_PROGRAMMING",
    difficulty: "EASY",
    tags: ["线性规划", "PuLP", "Python"],
    knowledgePoints: ["建模流程", "PuLP安装", "变量定义", "约束编写"],
    sortOrder: 1,
  },
  // ... case_02 ~ case_15
  {
    caseNumber: "case_16",
    title: "模拟退火算法求解TSP",
    category: "META_HEURISTIC",
    difficulty: "MEDIUM",
    tags: ["TSP", "模拟退火", "2-opt", "Metropolis准则"],
    knowledgePoints: ["组合优化", "邻域搜索", "冷却策略", "参数调优"],
    sortOrder: 16,
  },
  {
    caseNumber: "case_17",
    title: "遗传算法求解TSP",
    category: "META_HEURISTIC",
    difficulty: "HARD",
    tags: ["TSP", "遗传算法", "GA", "交叉算子", "变异算子"],
    knowledgePoints: ["进化计算", "选择策略", "编码设计", "适应度函数"],
    sortOrder: 17,
  },
  // ... case_18
];
```

---

## 六、数据库迁移命令

```bash
# 开发环境
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate

# 查看数据库状态
npx prisma studio

# 生产环境部署
npx prisma migrate deploy

# 数据库种子数据
npx ts-node scripts/seed-cases.ts
npx ts-node scripts/seed-users.ts
```

---

> 下一篇阅读：[后端 API 设计文档](BACKEND_API_DESIGN.md)
