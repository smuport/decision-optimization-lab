# 1.0 版本一周构建计划

> 目标：用 1 周时间搭建出教学平台 1.0 的可运行雏形。1.0 不追求完整企业级 OJ，而是完成“课程资料可浏览、首批案例可标准化、评测接口可跑通、最小在线平台有明确入口”的教学闭环。

---

## 额度控制

用户要求：每天额度用量不要超过每周额度的 8%。

执行规则：

1. 每天只推进一个清晰小目标，不同时展开多个大模块。
2. 每天优先产出可验证文件或可运行命令。
3. 单日结束时记录：完成内容、验证证据、下一天入口。
4. 如果某天任务超出预估，先收束成可提交骨架，不继续扩张范围。
5. 本周总目标保持不变，但每天只消耗一小块上下文和实现工作。

---

## 1.0 范围

### 必须完成

- 课程资产标准化目录。
- 首批 3 个案例的 manifest、rubric、template。
- 统一评测结果 schema。
- 本地 runner 的最小评测入口。
- 静态课程门户或可被前端消费的课程 manifest。
- 最小 API/数据模型草案落入工程结构。
- 1.0 版本验收清单。

### 暂不纳入 1.0

- 完整排行榜。
- MinIO 对象存储。
- BullMQ 分布式队列。
- 多机部署。
- 复杂教师数据看板。
- 代码查重和 AI 辅助反馈。

---

## 每日小目标

| 天数 | 小目标 | 当日交付物 | 验收方式 |
|------|--------|------------|----------|
| Day 1 | 固定 1.0 路线并建立课程资产骨架 | `WEEK1_BUILD_PLAN.md`、`course_manifest.json`、3 个案例 manifest/rubric/template、结果 schema | 文件存在，JSON 可解析，模板接口一致 |
| Day 2 | 实现本地 runner 最小入口 | `runner/evaluate.py`、加载 manifest、执行学生模板、输出标准 result JSON | 用 demo 提交跑通 case_01 small |
| Day 3 | 完成 case_01 与 case_04 validator | `validator.py`、公开数据评测、错误样例 | 正确解通过，错误解给出明确原因 |
| Day 4 | 完成 case_16 TSP validator | 路线合法性、目标值、GAP、收敛数据检查 | demo TSP 解能输出可展示结果 |
| Day 5 | 搭建静态课程门户骨架 | 前端页面或静态 HTML/JS，读取 course manifest | 浏览器可查看案例列表和详情 |
| Day 6 | 最小后端/提交流设计落地 | API stub 或轻量服务，提交目录、结果目录、状态文件 | 能模拟上传、评测、查看结果 |
| Day 7 | 1.0 集成验收与文档收口 | `VERSION_1_ACCEPTANCE.md`、运行说明、已知限制 | 按清单逐项验证，给出下一周计划 |

---

## Day 1 验收清单

- [x] 存在课程总 manifest。
- [x] 存在 case_01、case_04、case_16 的案例 manifest。
- [x] 每个案例都有 rubric。
- [x] 每个案例都有统一 `solve(data, params=None)` 模板。
- [x] 存在统一结果 schema。
- [x] 明确 Day 2 的入口命令。

## Day 2 验收清单

- [x] 存在 `runner/evaluate.py`。
- [x] runner 能读取案例 manifest 和数据集。
- [x] runner 能动态加载学生提交中的 `solve(data, params=None)`。
- [x] runner 能调用案例 validator。
- [x] runner 能输出标准 result JSON。
- [x] 用 `case_01` small demo 提交跑通最小闭环。

## Day 3 验收清单

- [x] `case_01` validator 能检查输出结构、资源可行性、objective 一致性和最优值 gap。
- [x] `case_04` validator 能检查分配唯一性、完整性、objective 一致性和最优值 gap。
- [x] `case_01` 正确 demo 返回 `SUCCESS`。
- [x] `case_01` 错误 demo 返回 `FAILED` 并给出资源超限/目标值不一致原因。
- [x] `case_04` 正确 demo 返回 `SUCCESS`。
- [x] `case_04` 错误 demo 返回 `FAILED` 并给出重复分配/缺失分配原因。

## Day 4 验收清单

- [x] `case_16` validator 能检查路线是否为完整城市排列。
- [x] `case_16` validator 能重算路线长度并检查 objective 一致性。
- [x] `case_16` validator 能检查 `visualization.convergence` 和 `metrics.iterations`。
- [x] `case_16` validator 能给出最近邻+2opt 启发式基准和 gap。
- [x] `case_16` 正确 demo 返回 `SUCCESS`。
- [x] `case_16` 错误 demo 返回 `FAILED` 并给出缺城市、重复城市等原因。

## Day 5 验收清单

- [x] 存在静态门户入口 `frontend-static/index.html`。
- [x] 存在独立样式、数据和交互脚本。
- [x] 页面可展示课程概览、3 个案例、6 个 runner 结果摘要。
- [x] 页面包含案例筛选、案例详情和评测状态可视化。
- [x] `app.js` 与 `portal-data.js` 通过 Node 语法检查。
- [x] HTML 引用的 CSS/JS 文件均存在。

## Day 6 验收清单

- [x] 存在本地提交流原型 `submission-service/service.py`。
- [x] 支持 `submit` 命令：复制提交文件、调用 runner、保存状态和结果。
- [x] 支持 `show` 命令：查看单个提交状态和结果摘要。
- [x] 支持 `list` 命令：查看本地全部提交。
- [x] 存在提交目录、结果目录和状态目录。
- [x] 正确提交可得到 `SUCCESS`，错误提交可得到 `FAILED`。

## Day 7 验收清单

- [x] 存在 `VERSION_1_ACCEPTANCE.md`。
- [x] JSON 全量解析通过。
- [x] Python 文件编译检查通过。
- [x] 前端静态脚本语法检查通过。
- [x] 课程资产路径检查通过。
- [x] runner 六个样例输出状态符合预期。
- [x] submission service 的 `list`、状态 JSON、结果 JSON 检查通过。

---

## 每日收工记录

### Day 1

状态：已完成基础骨架。

完成：

- 建立 1.0 一周构建计划。
- 建立首批课程资产目录。
- 建立首批案例标准化文件骨架。
- 通过 JSON 解析、模板编译、manifest 源路径检查。

下一步：

- Day 2 实现 `runner/evaluate.py`，先跑通 case_01 的 demo 提交。

### Day 2

状态：已完成最小本地评测闭环。

完成：

- 新增 `runner/evaluate.py`，支持 `--case`、`--dataset`、`--submission`、`--output`。
- 新增 `runner/README.md`，记录最小 runner 用法和边界。
- 新增 `runner/demo_submissions/case_01_demo.py`，用于验证 case_01 small。
- 生成示例结果 `runner/output/case_01_demo_result.json`。

验证：

```bash
python -m py_compile \
  decision-optimization-lab/runner/evaluate.py \
  decision-optimization-lab/runner/demo_submissions/case_01_demo.py

python decision-optimization-lab/runner/evaluate.py \
  --case case_01 \
  --dataset small \
  --submission decision-optimization-lab/runner/demo_submissions/case_01_demo.py \
  --output decision-optimization-lab/runner/output/case_01_demo_result.json
```

结果摘要：

- `status`: `PARTIAL`
- `objective`: `46.66666666666667`
- `runtimeMs`: runner 已记录
- `messages`: 当前仍提示 Day 3 补充完整评分逻辑

下一步：

- Day 3 完成 `case_01` 与 `case_04` 的 validator，使 demo 正确解能得到可行性和分数，错误解能得到明确失败原因。

### Day 3

状态：已完成 `case_01` 与 `case_04` 的真实 validator。

完成：

- `case_01/validator.py`：实现生产分配结果结构检查、资源约束检查、objective 一致性检查、标准形基枚举 LP 基准解、gap 与分项评分。
- `case_04/validator.py`：实现分配列表解析、重复工人/任务检查、完整性检查、位掩码 DP 最优分配、gap 与分项评分。
- 新增错误样例 `case_01_bad.py`、正确样例 `case_04_demo.py`、错误样例 `case_04_bad.py`。
- 更新四个评测输出 JSON：`case_01_demo_result.json`、`case_01_bad_result.json`、`case_04_demo_result.json`、`case_04_bad_result.json`。

验证摘要：

| 样例 | 状态 | 可行 | 目标值 | 最优值 | GAP | 分数 |
|------|------|------|--------|--------|-----|------|
| case_01_demo | SUCCESS | true | 46.6667 | 46.6667 | 0.0 | 95 |
| case_01_bad | FAILED | false | 6993.0 | 46.6667 | null | 0 |
| case_04_demo | SUCCESS | true | 13.0 | 13.0 | 0.0 | 90 |
| case_04_bad | FAILED | false | 18.0 | 13.0 | null | 15 |

下一步：

- Day 4 完成 `case_16` TSP validator，检查路线合法性、路线长度、GAP、运行时间和收敛数据格式。

### Day 4

状态：已完成 `case_16` TSP validator。

完成：

- `case_16/validator.py`：实现城市路线合法性检查、欧氏距离矩阵、路线长度重算、objective 一致性检查、最近邻+2opt 基准、gap 计算、收敛数据检查。
- 新增 `case_16_demo.py`：用最近邻+2opt 生成合法路线和收敛数据。
- 新增 `case_16_bad.py`：故意输出缺城市、重复城市、空收敛曲线的错误路线。
- 生成 `case_16_demo_result.json` 和 `case_16_bad_result.json`。

验证摘要：

| 样例 | 状态 | 可行 | 目标值 | 基准值 | GAP | 分数 |
|------|------|------|--------|--------|-----|------|
| case_16_demo | SUCCESS | true | 479.8342 | 479.8342 | 0.0 | 85 |
| case_16_bad | FAILED | false | null | 479.8342 | null | 0 |

额外验证：

- 当前 `runner/output` 下所有 `case_*_result.json` 都包含 runner 必需字段。
- 清理了验证产生的 `__pycache__`。

下一步：

- Day 5 搭建静态课程门户骨架，先用纯静态页面读取课程/案例 manifest，展示案例列表、案例详情入口和 runner 结果摘要。

### Day 5

状态：已完成静态课程门户骨架。

完成：

- 新增 `frontend-static/index.html`，作为 1.0 静态门户入口。
- 新增 `frontend-static/styles.css`，提供课程工作台式布局和响应式样式。
- 新增 `frontend-static/portal-data.js`，汇总课程、案例和 runner 结果摘要，使页面可直接通过 HTML 打开。
- 新增 `frontend-static/app.js`，渲染课程概览、案例卡片、筛选、详情面板、评测结果表和 canvas 状态图。
- 新增 `frontend-static/README.md`，记录入口与验证方式。

验证：

```bash
node --check decision-optimization-lab/frontend-static/app.js
node --check decision-optimization-lab/frontend-static/portal-data.js
```

数据摘要：

- 案例数：3
- runner 结果：6
- SUCCESS：3
- FAILED：3

下一步：

- Day 6 搭建最小后端/提交流设计，先用轻量本地服务或文件状态模拟上传、评测和结果查询。

### Day 6

状态：已完成最小提交流原型。

完成：

- 新增 `submission-service/service.py`，提供 `submit`、`show`、`list` 三个命令。
- 新增 `submission-service/README.md`，说明命令和存储结构。
- 建立 `submission-service/storage/submissions`、`results`、`status` 三类目录。
- 用 `case_04_demo.py` 模拟正确提交，状态为 `SUCCESS`，分数 90。
- 用 `case_16_bad.py` 模拟错误提交，状态为 `FAILED`，分数 0。

验证：

```bash
python -m py_compile decision-optimization-lab/submission-service/service.py

python decision-optimization-lab/submission-service/service.py submit \
  --student demo-001 \
  --case case_04 \
  --dataset small \
  --file decision-optimization-lab/runner/demo_submissions/case_04_demo.py

python decision-optimization-lab/submission-service/service.py list
python decision-optimization-lab/submission-service/service.py show <submission_id>
```

存储结构：

```text
submission-service/storage/
├── submissions/<submission_id>/solution.py
├── results/<submission_id>.json
└── status/<submission_id>.json
```

下一步：

- Day 7 做 1.0 集成验收与文档收口，补 `VERSION_1_ACCEPTANCE.md`，逐项证明 1.0 范围内的交付物可用。

### Day 7

状态：已完成 1.0 集成验收与文档收口。

完成：

- 新增 `VERSION_1_ACCEPTANCE.md`，逐项记录 1.0 范围、交付物、验收命令、功能结论、已知限制和下一周建议。
- 复查课程资产、runner、静态门户、submission service 的当前状态。
- 完成机器可验证的集成检查。

验证摘要：

- JSON 全量解析：18 个文件通过。
- Python 编译检查：runner、submission service、3 个案例模板与 validator 通过。
- 前端脚本检查：`frontend-static/app.js`、`portal-data.js` 通过。
- 课程资产路径检查：通过。
- runner 输出检查：6 个样例状态符合预期。
- submission service 检查：本地 2 个提交，包含 `SUCCESS` 和 `FAILED`。

1.0 结论：

- 本周目标已完成；后续进入 1.1 阶段，优先补安全执行层、轻量 HTTP API 和教师视图。
