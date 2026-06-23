# 教学实验平台 1.0 验收记录

> 验收日期：2026-06-22  
> 版本目标：用 1 周逐步搭建教学平台 1.0 可运行雏形。  
> 验收结论：1.0 范围内的课程资产、评测闭环、静态门户和最小提交流均已完成并通过本地验证。

---

## 一、1.0 范围

本版本定位为教学平台雏形，不是完整生产级 OJ。1.0 范围来自 `../plans/WEEK1_BUILD_PLAN.md`：

| 必须项 | 状态 | 证据 |
|--------|------|------|
| 课程资产标准化目录 | 通过 | `course-assets/` |
| 首批 3 个案例的 manifest、rubric、template | 通过 | `case_01`、`case_04`、`case_16` |
| 统一评测结果 schema | 通过 | `runner/schemas/result.schema.json` |
| 本地 runner 最小评测入口 | 通过 | `runner/evaluate.py` |
| 静态课程门户 | 通过 | `frontend-static/index.html` |
| 最小提交流原型 | 通过 | `submission-service/service.py` |
| 1.0 验收清单 | 通过 | 本文件 |

---

## 二、交付物清单

### 2.1 文档

- `README.md`
- `../plans/IMPLEMENTATION_PLAN.md`
- `../plans/WEEK1_BUILD_PLAN.md`
- `VERSION_1_ACCEPTANCE.md`
- 架构、API、数据库、前端、评测、部署等设计文档

### 2.2 课程资产

```text
course-assets/
├── manifests/course_manifest.json
└── cases/
    ├── case_01/
    │   ├── case_manifest.json
    │   ├── rubric.json
    │   ├── template.py
    │   └── validator.py
    ├── case_04/
    │   ├── case_manifest.json
    │   ├── rubric.json
    │   ├── template.py
    │   └── validator.py
    └── case_16/
        ├── case_manifest.json
        ├── rubric.json
        ├── template.py
        └── validator.py
```

### 2.3 本地评测

```text
runner/
├── evaluate.py
├── schemas/result.schema.json
├── demo_submissions/
│   ├── case_01_demo.py
│   ├── case_01_bad.py
│   ├── case_04_demo.py
│   ├── case_04_bad.py
│   ├── case_16_demo.py
│   └── case_16_bad.py
└── output/
    ├── case_01_demo_result.json
    ├── case_01_bad_result.json
    ├── case_04_demo_result.json
    ├── case_04_bad_result.json
    ├── case_16_demo_result.json
    └── case_16_bad_result.json
```

### 2.4 静态门户

```text
frontend-static/
├── index.html
├── styles.css
├── app.js
├── portal-data.js
└── README.md
```

### 2.5 最小提交流

```text
submission-service/
├── service.py
├── README.md
└── storage/
    ├── submissions/<submission_id>/solution.py
    ├── results/<submission_id>.json
    └── status/<submission_id>.json
```

---

## 三、验收命令

### 3.1 JSON 全量解析

```bash
python - <<'PY'
import json
from pathlib import Path
files = list(Path('decision-optimization-lab').rglob('*.json'))
for p in files:
    json.loads(p.read_text(encoding='utf-8'))
print(f'json ok: {len(files)} files')
PY
```

结果：`json ok: 18 files`

### 3.2 Python 编译检查

```bash
python -m py_compile \
  decision-optimization-lab/runner/evaluate.py \
  decision-optimization-lab/submission-service/service.py \
  decision-optimization-lab/course-assets/cases/case_01/template.py \
  decision-optimization-lab/course-assets/cases/case_01/validator.py \
  decision-optimization-lab/course-assets/cases/case_04/template.py \
  decision-optimization-lab/course-assets/cases/case_04/validator.py \
  decision-optimization-lab/course-assets/cases/case_16/template.py \
  decision-optimization-lab/course-assets/cases/case_16/validator.py
```

结果：通过。

### 3.3 前端静态脚本检查

```bash
node --check decision-optimization-lab/frontend-static/app.js
node --check decision-optimization-lab/frontend-static/portal-data.js
```

结果：通过。

### 3.4 课程资产路径检查

检查内容：

- 每个案例的 `template.py`、`validator.py`、`rubric.json` 存在。
- 每个案例 manifest 指向的原始 README、参考解、公开数据集存在。

结果：`case asset paths ok`

### 3.5 Runner 输出检查

预期状态：

| 结果文件 | 预期状态 |
|----------|----------|
| `case_01_demo_result.json` | SUCCESS |
| `case_01_bad_result.json` | FAILED |
| `case_04_demo_result.json` | SUCCESS |
| `case_04_bad_result.json` | FAILED |
| `case_16_demo_result.json` | SUCCESS |
| `case_16_bad_result.json` | FAILED |

结果：`runner outputs ok: 6`

### 3.6 静态门户引用检查

检查内容：

- `index.html` 引用 `styles.css`
- `index.html` 引用 `portal-data.js`
- `index.html` 引用 `app.js`

结果：`frontend references ok`

### 3.7 提交流检查

```bash
python decision-optimization-lab/submission-service/service.py list
```

结果：

- 本地提交数：2
- 包含 `SUCCESS`
- 包含 `FAILED`
- `status/*.json` 与 `results/*.json` 均可解析

---

## 四、功能验收

### 4.1 课程案例

| 案例 | 类型 | 当前能力 |
|------|------|----------|
| case_01 | 精确建模 | 生产分配 LP，可检查资源可行性、目标值一致性、最优 gap |
| case_04 | 精确建模 | 分配问题，可检查唯一性、完整性、最优 gap |
| case_16 | 启发式算法 | TSP，可检查路线合法性、路线长度、收敛数据、启发式基准 gap |

### 4.2 Runner 样例结果

| 样例 | 状态 | 说明 |
|------|------|------|
| case_01_demo | SUCCESS | 正确生产分配方案 |
| case_01_bad | FAILED | 资源超限、目标值不一致 |
| case_04_demo | SUCCESS | 最优分配方案 |
| case_04_bad | FAILED | 重复分配、缺失分配 |
| case_16_demo | SUCCESS | 合法 TSP 路线 |
| case_16_bad | FAILED | 缺城市、重复城市、缺少收敛数据 |

### 4.3 静态门户

当前门户支持：

- 课程概览。
- 三个首批案例卡片。
- 案例筛选。
- 案例详情面板。
- 六个 runner 结果摘要。
- Canvas 状态图。
- Day 6/后续提交流入口提示。

入口：

```text
frontend-static/index.html
```

### 4.4 最小提交流

当前本地提交流支持：

- `submit`：复制提交文件，调用 runner，保存结果和状态。
- `show`：查看单个提交。
- `list`：列出所有本地提交。

这对应未来后端的最小 API：

- `POST /submissions`
- `GET /submissions/:id`
- `GET /submissions`

---

## 五、已知限制

1. 当前不是安全沙箱，学生代码仍在本机 Python 环境执行。
2. 当前没有数据库，submission service 使用本地 JSON 文件保存状态。
3. 静态门户使用 `portal-data.js` 的快照数据，不会自动读取最新 runner 输出。
4. case_01 的 LP 基准通过标准形基枚举实现，适合当前课程数据规模，但不是生产级优化求解器。
5. case_16 的 `optimalObjective` 是最近邻+2opt 启发式基准，不是数学最优值。
6. 当前没有用户认证、权限控制、班级管理和正式上传接口。
7. 当前没有超时、内存限制、禁网等沙箱安全控制。

---

## 六、下一周建议

优先级从高到低：

1. 增加安全执行层：超时、隔离目录、禁网、资源限制。
2. 让静态门户自动读取 runner/submission 输出，减少手工同步。
3. 将 submission service 包装成轻量 HTTP API。
4. 增加教师视图：按学生/案例查看提交状态。
5. 扩展更多课程案例的 manifest、template、validator。
6. 加入实验报告字段和人工评分入口。

---

## 七、结论

教学平台 1.0 的目标已经达成：

- 有标准化课程资产。
- 有首批三类代表案例。
- 有本地自动评测闭环。
- 有正确/错误样例验证。
- 有静态课程门户。
- 有最小提交流状态原型。
- 有明确的已知限制和下一阶段路线。
