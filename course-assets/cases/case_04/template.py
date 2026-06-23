"""case_04 学生提交模板：分配问题。"""


def solve(data, params=None):
    """求解分配问题。

    Args:
        data: 题目 JSON 数据，包含 worker_names、task_names、cost_matrix。
        params: 可选参数。

    Returns:
        dict，至少包含：
        {
            "objective": 最小总成本,
            "solution": [
                {"worker": "张工", "task": "项目Beta"},
                ...
            ],
            "metrics": {
                "assignment_matrix": [[0, 1, ...], ...]
            }
        }
    """
    raise NotImplementedError("请在这里实现 case_04 的求解逻辑")
