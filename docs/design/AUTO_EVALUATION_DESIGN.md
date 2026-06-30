# 自动评测系统设计文档 (Auto Evaluation Design)

> 代码评测引擎的完整设计：沙箱安全、执行流程、评分算法和结果验证。
> 配套文件: `evaluator/**/*.py`, `backend/src/evaluation/**`

---

## 0. 评测设计修订结论

自动评测不应从“运行任意学生代码并比对标准答案”开始，而应从“每个课程案例的评测契约”开始。当前案例至少包含三种类型：

| 类型 | 例子 | 自动评测重点 | 人工/报告评分 |
|------|------|--------------|---------------|
| 精确建模题 | 生产分配、运输问题、分配问题 | 可行性、目标值、变量维度、约束违反量、对偶/影子价格误差 | 建模解释、经济含义 |
| 启发式算法题 | TSP 模拟退火、遗传算法 | 路线合法性、目标值、GAP、运行时间、收敛曲线 | 参数调优解释、结果分析 |
| 理解分析题 | 对偶问题、灵敏度分析 | 客观题或结构化答案可自动评分 | 主观分析必须保留教师评分 |

因此评测引擎需要支持“练习插件”而不是统一硬编码。Case 只保存通用教学内容，实际评测契约归属 Exercise：

```text
case_manifest.json
README.md
exercises/<exercise_code>/
├── exercise_manifest.json
├── template.py
├── validator.py
├── rubric.json
├── datasets/public/*.json
├── datasets/hidden/*.json
└── reference_solution.py  # 可选，教师可见
```

`case_manifest.json` 只描述 Case 元数据和内容入口。`exercise_manifest.json` 描述 `exerciseCode`、`entrypoint`、`outputSchema`、数据集、模板、validator 和 rubric 路径。

### 0.1 标准提交接口

建议要求学生代码优先实现统一函数，而不是只依赖命令行打印：

```python
def solve(data: dict, params: dict | None = None) -> dict:
    """
    返回结构化结果，例如:
    {
        "objective": 410.0,
        "solution": {...},
        "metrics": {...},
        "visualization": {...}
    }
    """
```

命令行执行可以作为兼容层：

```bash
python solution.py --input /data/data_small.json --output /output/result.json
```

评测器只读取 `/output/result.json` 和受控日志，不从自然语言 stdout 中解析关键答案。

### 0.2 标准评测结果

```json
{
  "caseId": "case_16",
  "exerciseId": "case_16_sa",
  "dataset": "small",
  "status": "SUCCESS",
  "isFeasible": true,
  "objective": 410.0,
  "optimalObjective": 410.0,
  "gap": 0.0,
  "runtimeMs": 152,
  "memoryMb": 128,
  "scoreItems": {
    "feasibility": 20,
    "quality": 40,
    "efficiency": 15,
    "robustness": 15,
    "report": 10
  },
  "metrics": {
    "constraintViolation": 0,
    "iterations": 50000
  },
  "artifacts": {
    "stdoutTail": "...",
    "stderrTail": "...",
    "resultJson": "submissions/.../result.json"
  },
  "visualization": {
    "route": [0, 2, 1, 3],
    "convergence": [812, 760, 650]
  }
}
```

### 0.3 MVP 评测器路线

第一阶段只做 3 个代表案例，避免一开始写 18 个不成熟评测器：

| 案例 | 类型 | 评测要点 |
|------|------|----------|
| case_01 | 线性规划入门 | 目标值、变量值、资源约束、影子价格误差 |
| case_04 | 分配问题 | 每人/每任务约束、总成本、非方阵处理 |
| case_16 | TSP 模拟退火 | 路线排列合法性、目标值、GAP、运行时间、收敛数据格式 |

只有当这 3 类评测契约稳定后，再批量扩展到其他案例。

### 0.4 数值比较容差

精确建模题不得直接使用单一固定小数位或严格相等比较浮点结果。case01 的约束可行性、目标值一致性和最优性判断统一使用绝对容差与相对容差：

```text
absolute tolerance = 1e-6
relative tolerance = 1e-5
```

容差由案例 `rubric.json` 的 `numeric_tolerance` 配置。比较目标值时使用绝对与相对容差共同判断；比较资源上限时按 `max(abs_tol, rel_tol * max(1, abs(limit)))` 缩放。该口径允许正常的求解器浮点误差和四位小数输出，但不会放过有实际意义的约束违反。

### 0.5 Week3 Exercise 评测与资源契约

Runner 的长期输入改为以 Exercise 为主键：

```text
exerciseCode + datasetKey + submissionPath
```

Runner 根据 Exercise 定位 `exercise_manifest.json`、validator、rubric 和数据集，结果仍同时返回 `caseId` 与 `exerciseId`。当前仅有一个 Exercise 的 case01 可保留兼容参数，但新增 Exercise 不再只依赖 `caseCode` 定位评测器。

Exercise 发布前的资源完整性检查包括：

- entrypoint 已配置。
- output schema 合法。
- 默认模板唯一且存在。
- 至少一个公开数据集存在。
- active rubric 存在。
- validator 文件存在且可加载。

练习资源包只包含学生完成 Exercise 所需的说明、默认模板、公开数据集和公开 output schema。隐藏数据、validator、教师参考实现和内部评分细节不得进入下载包。

> 本文后续 Docker、BullMQ、MinIO 和独立 Evaluator 章节是平台后期安全与扩展参考，不属于 Week3 实施范围。Week3 继续由 NestJS runner-adapter 同步调用本地 runner。

### 0.6 Week3 Day4 实施状态

2026-06-30 已将 case01 的评测资产迁移到 `course-assets/cases/case_01/exercises/production_planning/`：

- `case_manifest.json` 只保留 Case 教学内容元数据；`exercise_manifest.json` 保存 Exercise code、entrypoint、output schema、模板、数据集、rubric 和 validator 路径。
- NestJS runner adapter 使用 `exerciseCode + datasetKey + submissionPath` 调用 `runner/evaluate.py --exercise`。
- runner 根据全局唯一的 Exercise code 定位 manifest，并在 artifacts 中同时返回 `caseId` 与 `exerciseId`。
- `runner/evaluate.py --case case_01` 保留为 Week2 命令行兼容入口，通过显式映射转到 `production_planning`；新增练习不使用该兼容方式。
- 资源检查验证 entrypoint、非空 output schema、唯一默认模板、公开数据、唯一 active rubric，以及 validator 文件可导入。
- 练习资源包采用显式白名单，只包含 README、默认模板、公开数据集和 `output-schema.json`；路径必须位于该 Exercise 的 assetPath 内。
- 隐藏数据、validator、rubric、参考实现和内部文件不会进入 zip。

## 一、系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        NestJS 后端                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              EvaluationService                        │  │
│  │  - 接收提交请求 → 创建 Submission 记录                │  │
│  │  - 上传代码到 MinIO → 获取 URL                      │  │
│  │  - 创建 BullMQ 任务 → 放入 Redis 队列                │  │
│  │  - 监听 WebSocket → 推送进度到前端                   │  │
│  │  - 接收 Evaluator 回调 → 保存结果到数据库            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              EvaluationProcessor (Worker)             │  │
│  │  - 消费 BullMQ 队列                                   │  │
│  │  - 调用 Evaluator HTTP API 提交评测任务               │  │
│  │  - 轮询 Evaluator 状态 → 更新进度                    │  │
│  │  - 接收结果 → 调用 ScoringService 计算分数            │  │
│  │  - 保存结果到数据库 + 更新缓存                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────────────────────┘
                     │ HTTP
                     │
┌────────────────────┴──────────────────────────────────────┐
│                     Evaluator 服务 (FastAPI)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               EvaluationController                    │  │
│  │  POST /evaluate  → 接收任务                         │  │
│  │  GET  /status/:id  → 查询状态                       │  │
│  │  GET  /logs/:id    → 获取日志流                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               SandboxService                          │  │
│  │  - 拉取代码文件（MinIO）                             │  │
│  │  - 准备 Docker 容器（映射数据集、限制资源）           │  │
│  │  - 启动容器执行代码                                  │  │
│  │  - 超时/内存监控                                     │  │
│  │  - 收集输出结果（stdout, 文件）                       │  │
│  │  - 清理容器和资源                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               CaseValidator (case_16.py)              │  │
│  │  - 加载数据集（small/medium/large）                   │  │
│  │  - 调用学生代码求解                                  │  │
│  │  - 验证结果合法性（如TSP路线是否完整）                │  │
│  │  - 计算目标函数值                                    │  │
│  │  - 对比标准答案 → 计算 GAP                          │  │
│  │  - 收集收敛曲线/路线数据（用于可视化）                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 二、评测流程时序图

```
学生提交      NestJS       BullMQ      Evaluator      Docker      MinIO      PostgreSQL
   │            │            │            │            │            │            │
   │ ──代码──> │            │            │            │            │            │
   │            │ ──上传────>│            │            │            │            │
   │            │            │            │            │            │ <─存储代码─│
   │            │ <─返回URL──│            │            │            │            │
   │            │            │            │            │            │            │
   │            │ ──创建Submission──>     │            │            │            │
   │            │            │            │            │            │            │ <─写入记录─
   │            │ <─返回submissionId     │            │            │            │
   │ <─提交成功─│            │            │            │            │            │
   │            │            │            │            │            │            │
   │            │ ──添加任务──>          │            │            │            │
   │            │            │            │            │            │            │
   │            │            │ ──消费任务─>          │            │            │
   │            │            │            │            │            │            │
   │            │            │            │ ──拉取代码─>           │            │
   │            │            │            │            │            │ <─返回文件─│
   │            │            │            │            │            │            │
   │            │            │            │ ──创建容器─>           │            │
   │            │            │            │            │            │            │
   │            │            │            │            │ ──挂载数据集─>        │
   │            │            │            │            │            │ <─返回文件─│
   │            │            │            │            │            │            │
   │            │            │            │            │ ──运行代码──>         │
   │            │            │            │            │            │            │
   │            │            │            │            │ <─返回结果─│            │
   │            │            │            │            │            │            │
   │            │            │            │ ──验证结果─│            │            │
   │            │            │            │ ──计算GAP──│            │            │
   │            │            │            │            │            │            │
   │            │            │            │ ──返回结果─>           │            │
   │            │            │            │            │            │            │
   │            │            │ <─任务完成─│            │            │            │
   │            │            │            │            │            │            │
   │            │            │            │            │            │            │ <─更新结果─
   │            │            │            │            │            │            │
   │            │ <─通知结果─│            │            │            │            │
   │ <─WebSocket推送结果────│            │            │            │            │
   │            │            │            │            │            │            │
```

---

## 三、Docker 沙箱设计

### 3.1 沙箱镜像

```dockerfile
# evaluator/Dockerfile.sandbox
FROM python:3.11-slim

# 安装基础工具和课程允许依赖的构建环境
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN useradd -m -s /bin/bash evaluator

# 工作目录
WORKDIR /app

# 安装允许的依赖（白名单）
RUN pip install --no-cache-dir \
    numpy==1.26.4 \
    matplotlib==3.8.4 \
    pulp==2.8.0 \
    scipy==1.11.4 \
    networkx==3.2.1

# 禁止运行时安装依赖：评测入口不提供网络，pip 不加入学生可写路径
RUN chmod -R 755 /usr/local/lib/python3.11/site-packages

# 默认运行用户
USER evaluator

# 入口：执行传入的代码文件
CMD ["python", "/app/solution.py"]
```

### 3.2 容器运行参数

```python
# evaluator/sandbox.py

import docker
import tempfile
import os
import shutil

docker_client = docker.from_env()

DOCKER_CONFIG = {
    "image": "decision-opt-evaluator:latest",
    "cpu_limit": 2.0,          # 2 CPU cores
    "memory_limit": "512m",     # 512 MB RAM
    "memory_swap_limit": "512m", # 禁止 swap
    "timeout": 60,             # 60 seconds max
    "network_mode": "none",    # 禁止网络
    "read_only": True,        # 根文件系统只读
    "cap_drop": ["ALL"],      # 丢弃所有特权
    "security_opt": ["no-new-privileges:true"],
    "pids_limit": 50,         # 最大进程数
}

def run_in_sandbox(code_file: str, dataset_dir: str, timeout: int = 60) -> dict:
    """
    在 Docker 沙箱中运行学生代码。
    
    Args:
        code_file: 学生代码文件路径
        dataset_dir: 数据集目录路径
        timeout: 最大运行时间（秒）
    
    Returns:
        {
            "status": "SUCCESS" | "TIMEOUT" | "MEMORY_EXCEEDED" | "RUNTIME_ERROR",
            "stdout": str,
            "stderr": str,
            "output_files": dict,  # 学生代码输出的文件
            "runtime": float,       # 实际运行时间
            "memory_used": int,     # 峰值内存（MB）
        }
    """
    
    # 1. 创建临时工作目录
    work_dir = tempfile.mkdtemp(prefix="eval_")
    
    try:
        # 2. 复制代码和数据到工作目录
        shutil.copy(code_file, os.path.join(work_dir, "solution.py"))
        
        # 3. 创建输出目录（可写）
        output_dir = os.path.join(work_dir, "output")
        os.makedirs(output_dir, mode=0o777)
        
        # 4. 启动 Docker 容器
        container = docker_client.containers.run(
            image=DOCKER_CONFIG["image"],
            command=["python", "/app/solution.py"],
            volumes={
                work_dir: {"bind": "/app", "mode": "rw"},
                dataset_dir: {"bind": "/data", "mode": "ro"},
            },
            environment={
                "DATA_DIR": "/data",
                "OUTPUT_DIR": "/app/output",
                "SIZE": "small",  # small/medium/large
            },
            cpu_quota=int(DOCKER_CONFIG["cpu_limit"] * 100000),
            cpu_period=100000,
            mem_limit=DOCKER_CONFIG["memory_limit"],
            memswap_limit=DOCKER_CONFIG["memory_swap_limit"],
            network_mode=DOCKER_CONFIG["network_mode"],
            read_only=True,
            cap_drop=DOCKER_CONFIG["cap_drop"],
            security_opt=DOCKER_CONFIG["security_opt"],
            pids_limit=DOCKER_CONFIG["pids_limit"],
            detach=True,  # 后台运行
        )
        
        # 5. 等待容器完成（带超时）
        try:
            result = container.wait(timeout=timeout)
            exit_code = result["StatusCode"]
        except Exception:
            # 超时，强制停止
            container.kill()
            return {
                "status": "TIMEOUT",
                "stdout": "",
                "stderr": f"运行时间超过 {timeout} 秒限制",
                "runtime": timeout,
                "memory_used": 0,
            }
        
        # 6. 收集输出
        logs = container.logs(stdout=True, stderr=True)
        stdout, stderr = separate_stdout_stderr(logs)
        
        # 7. 收集输出文件
        output_files = {}
        if os.path.exists(output_dir):
            for f in os.listdir(output_dir):
                output_files[f] = os.path.join(output_dir, f)
        
        # 8. 获取资源使用统计
        stats = container.stats(stream=False)
        memory_used = extract_memory_usage(stats)  # MB
        
        # 9. 清理容器
        container.remove(force=True)
        
        # 10. 判断结果状态
        if exit_code != 0:
            status = "RUNTIME_ERROR"
        elif memory_used > 512:
            status = "MEMORY_EXCEEDED"
        else:
            status = "SUCCESS"
        
        return {
            "status": status,
            "stdout": stdout,
            "stderr": stderr,
            "output_files": output_files,
            "runtime": container.attrs["State"]["FinishedAt"],  # 需计算
            "memory_used": memory_used,
        }
        
    finally:
        # 清理临时目录
        shutil.rmtree(work_dir, ignore_errors=True)
```

### 3.3 安全防护措施

| 防护层面 | 措施 | 目的 |
|----------|------|------|
| **网络隔离** | `--network none` | 禁止访问外部网络、内网服务 |
| **文件系统** | `--read-only` + 只读挂载数据集 | 防止篡改系统文件、数据泄露 |
| **资源限制** | CPU/Memory/进程数限制 | 防止资源耗尽攻击 |
| **特权限制** | `cap_drop ALL` + `no-new-privileges` | 防止容器逃逸、提权 |
| **用户隔离** | 非 root 用户运行 | 最小权限原则 |
| **时间限制** | 强制超时 kill | 防止无限循环/死锁 |
| **静态扫描** | 代码预检查（禁用危险库） | 防止恶意代码 |
| **输出过滤** | 限制输出大小（10MB） | 防止日志轰炸 |

### 3.4 静态代码扫描

```python
# evaluator/security_scan.py

import ast
import re

FORBIDDEN_IMPORTS = [
    "os.system", "subprocess", "socket", "urllib", "requests",
    "ftplib", "telnetlib", "smtplib", "http.client",
    "ctypes", "mmap", "shutil.rmtree", "eval", "exec",
]

FORBIDDEN_PATTERNS = [
    r"os\.system\s*\(",
    r"subprocess\.(run|Popen|call)",
    r"__import__\s*\(",
    r"open\s*\(\s*['\"]/",
    r"open\s*\(\s*['\"]\.\.",
]

def scan_code(code: str) -> dict:
    """
    静态扫描学生代码，检测恶意代码。
    
    Returns:
        {"safe": bool, "issues": [{"line": int, "message": str}]}
    """
    issues = []
    
    # 1. 语法检查
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"safe": False, "issues": [{"line": e.lineno, "message": f"语法错误: {e.msg}"}]}
    
    # 2. 遍历 AST 检查危险导入
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in ["os", "subprocess", "socket"]:
                    issues.append({"line": node.lineno, "message": f"禁止导入: {alias.name}"})
        
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            if module in ["os", "subprocess", "socket"]:
                issues.append({"line": node.lineno, "message": f"禁止导入: {module}"})
        
        elif isinstance(node, ast.Call):
            # 检查 eval/exec
            if isinstance(node.func, ast.Name):
                if node.func.id in ["eval", "exec"]:
                    issues.append({"line": node.lineno, "message": f"禁止调用: {node.func.id}"})
    
    # 3. 正则检查危险模式
    lines = code.split('\n')
    for i, line in enumerate(lines):
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, line):
                issues.append({"line": i + 1, "message": f"检测到危险代码模式"})
    
    return {"safe": len(issues) == 0, "issues": issues}
```

---

## 四、各案例评测脚本

### 4.1 case_16: TSP 模拟退火评测

```python
# evaluator/cases/case_16.py
"""
TSP 模拟退火算法评测脚本
输入: 学生代码文件、数据集规模（small/medium/large）
输出: 评测结果（cost、gap、合法性、运行时间等）
"""

import json
import sys
import os
import importlib.util
import time
import math

# 数据集路径
DATA_DIR = os.environ.get("DATA_DIR", "/data")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/app/output")
SIZE = os.environ.get("SIZE", "small")

def load_dataset(size: str) -> dict:
    """加载数据集"""
    filepath = os.path.join(DATA_DIR, f"data_{size}.json")
    with open(filepath, 'r') as f:
        return json.load(f)

def build_distance_matrix(coordinates: list) -> list:
    """标准距离矩阵计算（用于验证）"""
    n = len(coordinates)
    dist = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            dx = coordinates[i][0] - coordinates[j][0]
            dy = coordinates[i][1] - coordinates[j][1]
            d = int(round(math.hypot(dx, dy)))
            dist[i][j] = d
            dist[j][i] = d
    return dist

def validate_tsp_route(route: list, n: int) -> tuple:
    """
    验证TSP路线的合法性。
    
    Returns:
        (is_valid, error_message)
    """
    if len(route) != n:
        return False, f"路线长度错误: {len(route)} (应为 {n})"
    
    if len(set(route)) != n:
        return False, "路线中存在重复城市"
    
    if not all(0 <= city < n for city in route):
        return False, "路线中存在无效城市编号"
    
    return True, ""

def calculate_tour_cost(route: list, dist: list) -> float:
    """计算路线总长度"""
    return sum(dist[route[i]][route[(i + 1) % len(route)]] for i in range(len(route)))

def evaluate(code_path: str, size: str) -> dict:
    """评测学生代码"""
    
    # 1. 加载数据集
    data = load_dataset(size)
    coordinates = data['coordinates']
    n = len(coordinates)
    
    # 2. 加载学生代码模块
    spec = importlib.util.spec_from_file_location("solution", code_path)
    module = importlib.util.module_from_spec(spec)
    
    # 3. 执行学生代码（捕获标准输出）
    t_start = time.time()
    try:
        spec.loader.exec_module(module)
    except Exception as e:
        return {
            "status": "RUNTIME_ERROR",
            "error": f"代码执行错误: {str(e)}",
            "runtime": time.time() - t_start,
        }
    
    runtime = time.time() - t_start
    
    # 4. 检查学生代码是否提供了必要的函数
    # 学生代码可以导出函数，也可以直接输出结果到文件
    # 方案A: 学生代码提供 solve(coordinates) -> route
    # 方案B: 学生代码将结果写入 output/result.json
    
    result = {
        "status": "SUCCESS",
        "route": None,
        "cost": None,
        "runtime": runtime,
        "memory_used": 0,  # 由沙箱层提供
    }
    
    # 尝试读取结果文件
    result_file = os.path.join(OUTPUT_DIR, "result.json")
    if os.path.exists(result_file):
        with open(result_file, 'r') as f:
            output = json.load(f)
            result["route"] = output.get("route")
            result["cost"] = output.get("cost")
    
    # 如果没有结果文件，尝试调用 solve 函数
    elif hasattr(module, 'solve'):
        try:
            route = module.solve(coordinates)
            result["route"] = route
            # 计算 cost
            dist = build_distance_matrix(coordinates)
            result["cost"] = calculate_tour_cost(route, dist)
        except Exception as e:
            result["status"] = "RUNTIME_ERROR"
            result["error"] = f"solve() 调用错误: {str(e)}"
    
    else:
        result["status"] = "RUNTIME_ERROR"
        result["error"] = "未找到 solve() 函数或 output/result.json 文件"
    
    # 5. 验证路线合法性
    if result["route"]:
        is_valid, error_msg = validate_tsp_route(result["route"], n)
        if not is_valid:
            result["status"] = "INVALID_ROUTE"
            result["error"] = error_msg
    
    # 6. 计算 GAP（如果有标准答案）
    optimal = data.get("optimal_cost")  # 教师预设
    if optimal and result["cost"] is not None:
        result["gap"] = ((result["cost"] - optimal) / optimal * 100)
    
    return result

if __name__ == "__main__":
    # 从命令行参数获取代码路径
    code_path = sys.argv[1] if len(sys.argv) > 1 else "/app/solution.py"
    result = evaluate(code_path, SIZE)
    
    # 输出结果到 stdout（JSON 格式）
    print(json.dumps(result, ensure_ascii=False))
```

### 4.2 评测结果标准格式

```json
{
  "status": "SUCCESS",
  "route": [6, 3, 8, 9, 2, 10, 1, 5, 13, 14, 7, 12, 0, 4, 11],
  "cost": 410,
  "optimal": 410,
  "gap": 0.0,
  "runtime": 0.15,
  "memory_used": 45,
  "convergence_data": {
    "best": [652, 500, 450, ...],
    "current": [652, 700, 480, ...],
    "temperature": [1000, 995, 990, ...]
  },
  "route_data": {
    "coordinates": [[81, 14], [3, 94], ...],
    "route": [6, 3, 8, ...]
  }
}
```

### 3.3 沙箱安全修订

原方案中 Evaluator 通过挂载 `/var/run/docker.sock` 创建容器，这在生产环境风险较高。推荐按阶段处理：

| 阶段 | 做法 | 说明 |
|------|------|------|
| 本地原型 | 直接本机 Docker 沙箱 | 仅教师机器或测试环境使用 |
| 小班试点 | 独立评测服务器 + 最小权限账号 | 与业务数据库/前端隔离 |
| 正式部署 | rootless Docker、独立 runner、或更强隔离方案 | 避免 Web 后端直接触达 Docker socket |

安全基线：

- 运行用户非 root。
- 禁止网络访问。
- 限制 CPU、内存、进程数、运行时间。
- 根文件系统只读，只开放 `/output` 可写。
- 数据集只读挂载。
- stdout/stderr 做长度截断，完整日志保存为 artifact。
- 禁止学生代码覆盖评测器、隐藏数据和系统文件。
- 评测任务完成后强制清理容器、临时目录和残留进程。
- 对 `import os/subprocess/socket/requests` 等危险能力做静态提示，但不能只依赖静态扫描。

---

## 五、评分算法

### 5.1 默认评分策略（可配置）

```python
# evaluator/scoring.py

def calculate_score(sub_results: list) -> dict:
    """
    计算综合评分。
    
    sub_results: [
        {"size": "small", "status": "SUCCESS", "cost": 410, "gap": 0.0, "runtime": 0.15},
        {"size": "medium", "status": "SUCCESS", "cost": 785, "gap": 4.7, "runtime": 1.2},
        {"size": "large", "status": "TIMEOUT", ...}
    ]
    
    Returns:
        {
            "total": 85.5,
            "details": {
                "correctness": 35,
                "completeness": 30,
                "efficiency": 12,
                "robustness": 5,
                "codeQuality": 3.5
            }
        }
    """
    
    score_details = {}
    total = 0
    
    # 1. 正确性 (40分) - 每个规模根据 GAP 给分
    correctness = 0
    for r in sub_results:
        if r["status"] != "SUCCESS":
            continue
        gap = r.get("gap", 100)
        if gap <= 0:
            correctness += 40 / 3  # 精确最优
        elif gap <= 1:
            correctness += 35 / 3
        elif gap <= 5:
            correctness += 30 / 3
        elif gap <= 10:
            correctness += 20 / 3
        elif gap <= 20:
            correctness += 10 / 3
        else:
            correctness += 5 / 3
    correctness = min(correctness, 40)
    score_details["correctness"] = round(correctness, 1)
    total += correctness
    
    # 2. 完整性 (30分) - 所有请求规模都成功
    success_count = sum(1 for r in sub_results if r["status"] == "SUCCESS")
    completeness = 30 * (success_count / len(sub_results))
    score_details["completeness"] = round(completeness, 1)
    total += completeness
    
    # 3. 效率 (15分) - 运行时间打分
    # 基准时间: small 1s, medium 5s, large 30s
    benchmarks = {"small": 1, "medium": 5, "large": 30}
    efficiency = 0
    for r in sub_results:
        if r["status"] != "SUCCESS":
            continue
        size = r["size"]
        benchmark = benchmarks.get(size, 1)
        runtime = r.get("runtime", benchmark * 10)
        if runtime <= benchmark * 0.5:
            efficiency += 15 / 3  # 优秀
        elif runtime <= benchmark:
            efficiency += 12 / 3  # 良好
        elif runtime <= benchmark * 2:
            efficiency += 8 / 3   # 合格
        elif runtime <= benchmark * 5:
            efficiency += 4 / 3   # 偏差
        else:
            efficiency += 1 / 3   # 很慢但通过了
    efficiency = min(efficiency, 15)
    score_details["efficiency"] = round(efficiency, 1)
    total += efficiency
    
    # 4. 鲁棒性 (10分) - 大规模也成功求解
    large_result = next((r for r in sub_results if r["size"] == "large"), None)
    if large_result and large_result["status"] == "SUCCESS":
        robustness = 10
    elif large_result and large_result["status"] in ["SUCCESS", "TIMEOUT"]:
        robustness = 5  # 至少尝试了大
    else:
        robustness = 0
    score_details["robustness"] = robustness
    total += robustness
    
    # 5. 代码质量 (5分) - 静态检查（可选）
    # 代码长度、注释率、函数复杂度等
    score_details["codeQuality"] = 0  # 暂不启用
    
    return {
        "total": round(min(total, 100), 1),
        "details": score_details
    }
```

### 5.2 评分配置（按案例定制）

```json
// 教师可配置的评分规则（存储在 case 表的 metadata 中）
{
  "scoring": {
    "weights": {
      "correctness": 40,
      "completeness": 30,
      "efficiency": 15,
      "robustness": 10,
      "codeQuality": 5
    },
    "gapThresholds": {
      "perfect": 0,
      "excellent": 1,
      "good": 5,
      "acceptable": 10,
      "poor": 20
    },
    "timeBenchmarks": {
      "small": 1,
      "medium": 5,
      "large": 30
    },
    "customValidator": "case_16_validator.py"
  }
}
```

---

## 六、任务队列设计

### 6.1 BullMQ 队列配置

```typescript
// backend/src/evaluation/services/queue.service.ts

import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class EvaluationQueueService {
  constructor(
    @InjectQueue('evaluation') private readonly evaluationQueue: Queue,
  ) {}

  async addJob(submissionId: string, data: EvaluationJobData): Promise<Job> {
    return this.evaluationQueue.add('evaluate', data, {
      jobId: submissionId,  // 防止重复提交
      removeOnComplete: {
        age: 3600,  // 1小时后删除已完成任务
        count: 1000,  // 保留最近1000个
      },
      removeOnFail: {
        age: 3600 * 24,  // 1天后删除失败任务
      },
      attempts: 3,  // 失败重试3次
      backoff: {
        type: 'exponential',
        delay: 5000,  // 初始延迟5秒
      },
      priority: this.calculatePriority(data),  // 学生按提交次数降优先级
    });
  }

  private calculatePriority(data: EvaluationJobData): number {
    // 首次提交优先级高，多次提交防止刷榜
    const basePriority = 5;  // 1-10, 10最高
    const submitCount = data.userSubmitCount || 0;
    return Math.max(1, basePriority - submitCount);
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.evaluationQueue.getWaitingCount(),
      this.evaluationQueue.getActiveCount(),
      this.evaluationQueue.getCompletedCount(),
      this.evaluationQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
```

### 6.2 Worker 处理器

```typescript
// backend/src/evaluation/processors/evaluation.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Processor('evaluation', {
  concurrency: 4,  // 同时处理4个评测任务
  limiter: {
    max: 10,        // 每分钟最多10个
    duration: 60000,
  },
})
@Injectable()
export class EvaluationProcessor extends WorkerHost {
  async process(job: Job<EvaluationJobData>): Promise<any> {
    const { submissionId, caseId, codeUrl, sizes, config } = job.data;
    
    // 1. 更新状态为 RUNNING
    await this.submissionService.updateStatus(submissionId, 'RUNNING');
    
    // 2. 逐个规模评测
    const results = [];
    for (const size of sizes) {
      // 推送进度
      await this.evaluationGateway.sendProgress(submissionId, {
        current: results.length + 1,
        total: sizes.length,
        currentDataset: size,
      });
      
      // 调用 Evaluator
      const result = await this.evaluatorService.evaluate({
        submissionId,
        caseId,
        codeUrl,
        size,
        timeout: config.timeout,
        memoryLimit: config.memoryLimit,
      });
      
      results.push({ size, ...result });
      
      // 保存中间结果
      await this.submissionService.saveSubDatasetResult(submissionId, size, result);
    }
    
    // 3. 计算综合评分
    const score = await this.scoringService.calculate(results, caseId);
    
    // 4. 保存最终结果
    await this.submissionService.saveResult(submissionId, score, results);
    
    // 5. 推送完成通知
    await this.evaluationGateway.sendCompleted(submissionId, score);
    
    return { submissionId, score, results };
  }
}
```

---

## 七、错误处理与重试

### 7.1 错误分类

| 错误类型 | 是否重试 | 处理方式 | 说明 |
|----------|----------|----------|------|
| Docker 启动失败 | ✅ 3次 | 指数退避重试 | 资源临时不足 |
| 评测超时 | ❌ | 标记 TIMEOUT | 代码效率问题 |
| 内存超限 | ❌ | 标记 MEMORY_EXCEEDED | 代码内存问题 |
| 语法错误 | ❌ | 标记 COMPILE_ERROR | 代码质量问题 |
| 答案错误 | ❌ | 标记 WRONG_ANSWER | 算法问题 |
| 沙箱不可用 | ✅ 3次 | 延迟重试 | Evaluator 服务问题 |
| 数据库错误 | ✅ 5次 | 快速重试 | 数据库连接问题 |

### 7.2 重试策略

```typescript
const RETRY_POLICIES = {
  DOCKER_ERROR: { maxAttempts: 3, backoff: 'exponential', delay: 5000 },
  EVALUATOR_UNAVAILABLE: { maxAttempts: 3, backoff: 'exponential', delay: 10000 },
  DB_ERROR: { maxAttempts: 5, backoff: 'fixed', delay: 1000 },
  NETWORK_ERROR: { maxAttempts: 3, backoff: 'linear', delay: 2000 },
};
```

---

## 八、日志与监控

### 8.1 评测日志

```json
{
  "submissionId": "sub-uuid-1234",
  "userId": "uuid-001",
  "caseId": "case-16",
  "timestamp": "2024-06-20T10:00:05Z",
  "level": "INFO",
  "event": "EVALUATION_STARTED",
  "data": { "sizes": ["small", "medium", "large"] }
}

{
  "submissionId": "sub-uuid-1234",
  "timestamp": "2024-06-20T10:00:15Z",
  "level": "INFO",
  "event": "DATASET_COMPLETED",
  "data": { "size": "small", "status": "SUCCESS", "cost": 410, "runtime": 0.15 }
}

{
  "submissionId": "sub-uuid-1234",
  "timestamp": "2024-06-20T10:02:30Z",
  "level": "INFO",
  "event": "EVALUATION_COMPLETED",
  "data": { "status": "PARTIAL", "score": 85.5, "totalRuntime": 45.2 }
}
```

### 8.2 监控指标

| 指标 | 类型 | 说明 |
|------|------|------|
| evaluation_queue_size | Gauge | 评测队列长度 |
| evaluation_active_jobs | Gauge | 正在运行的评测任务数 |
| evaluation_duration | Histogram | 评测耗时分布 |
| evaluation_score | Histogram | 得分分布 |
| docker_container_count | Gauge | 当前 Docker 容器数 |
| docker_container_cpu | Gauge | 沙箱容器 CPU 使用率 |
| docker_container_memory | Gauge | 沙箱容器内存使用 |

---

## 九、扩展性设计

### 9.1 支持新案例

添加新案例只需：

1. 在 `evaluator/cases/` 创建 `case_XX.py` 评测脚本
2. 在 `evaluator/templates/` 创建 `case_XX_template.py` 代码框架
3. 在数据库插入案例元数据、数据集、模板文件
4. 配置评分规则（可选，使用默认规则）

### 9.2 支持多语言

目前仅支持 Python，未来扩展：

| 语言 | 需要修改 |
|------|----------|
| C++ | 编译步骤（g++ -o solution）、运行可执行文件 |
| Java | 编译步骤（javac）、运行 class/jar |
| Julia | 直接使用 julia 命令运行 |

核心修改点：
- `sandbox.py` 中的 `DOCKER_CONFIG["image"]` 按语言选择
- 评测脚本中的代码加载方式

---

> 下一篇阅读：[部署指南](../guides/DEPLOYMENT_GUIDE.md)
