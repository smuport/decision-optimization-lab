# Submission Service Prototype

Day 6 的最小提交流原型。它不是正式后端，而是用本地文件模拟后端 API 的核心状态流。

## 命令

提交并评测：

```bash
python submission-service/service.py submit \
  --student demo-001 \
  --case case_04 \
  --dataset small \
  --file runner/demo_submissions/case_04_demo.py
```

查看一个提交：

```bash
python submission-service/service.py show <submission_id>
```

查看全部提交：

```bash
python submission-service/service.py list
```

## 存储结构

```text
submission-service/storage/
├── submissions/<submission_id>/solution.py
├── results/<submission_id>.json
└── status/<submission_id>.json
```

这套结构对应未来后端的三个核心接口：

- `POST /submissions`
- `GET /submissions/:id`
- `GET /submissions`
