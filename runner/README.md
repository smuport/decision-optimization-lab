# Local Runner

当前 runner 以 Exercise 为定位主键：

```bash
python runner/evaluate.py \
  --exercise production_planning \
  --dataset small \
  --submission runner/demo_submissions/case_01_demo.py
```

Week2 的 case01 命令仍可使用，内部会映射到 `production_planning`：

```bash
python runner/evaluate.py --case case_01 --dataset small --submission runner/demo_submissions/case_01_demo.py
```

当前 runner 做四件事：

1. 读取 `course-assets/cases/<case_id>/exercises/<exercise_code>/exercise_manifest.json`。
2. 根据 dataset key 读取 Exercise 数据集。
3. 动态加载学生提交中的 `solve(data, params=None)`。
4. 调用练习 `validator.py` 输出统一 result JSON。

注意：当前版本还不是安全沙箱。时间限制、内存限制、隔离执行和完整评分逻辑放到 Day 3/4 之后逐步补上。
