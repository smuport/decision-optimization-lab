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
  "studentId": "202430001",
  "password": "SecurePass123"
}
```

**Response**:

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid-001",
      "studentId": "202430001",
      "name": "张三",
      "role": "STUDENT"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900  // 15分钟
    }
  },
  "timestamp": "2024-06-20T08:00:00Z"
}
```

### 2.3 刷新 Token

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
