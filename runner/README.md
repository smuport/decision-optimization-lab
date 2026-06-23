# Local Runner

Day 2 的目标是先跑通最小本地评测闭环：

```bash
python runner/evaluate.py \
  --case case_01 \
  --dataset small \
  --submission runner/demo_submissions/case_01_demo.py
```

当前 runner 做四件事：

1. 读取 `course-assets/cases/<case_id>/case_manifest.json`。
2. 根据 dataset id 读取公开数据集。
3. 动态加载学生提交中的 `solve(data, params=None)`。
4. 调用案例 `validator.py` 输出统一 result JSON。

注意：当前版本还不是安全沙箱。时间限制、内存限制、隔离执行和完整评分逻辑放到 Day 3/4 之后逐步补上。
