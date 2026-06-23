"""Intentionally wrong case_04 submission for validator testing."""


def solve(data, params=None):
    workers = data.get("worker_names") or [f"工人{i + 1}" for i in range(len(data["cost_matrix"]))]
    tasks = data.get("task_names") or [f"任务{j + 1}" for j in range(len(data["cost_matrix"][0]))]
    return {
        "objective": 0,
        "solution": [
            {"worker": workers[0], "task": tasks[0]},
            {"worker": workers[0], "task": tasks[0]},
        ],
        "metrics": {}
    }
