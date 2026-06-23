"""Validator for case_04 assignment problem."""

from __future__ import annotations

EPS = 1e-7


def validate(data, student_result, rubric=None):
    if not isinstance(student_result, dict):
        return _invalid("学生结果必须是 dict")
    if "objective" not in student_result or "solution" not in student_result:
        return _invalid("结果必须包含 objective 和 solution")
    if not isinstance(student_result["solution"], list):
        return _invalid("solution 必须是分配列表")

    cost = data["cost_matrix"]
    workers = data.get("worker_names") or [f"工人{i + 1}" for i in range(len(cost))]
    tasks = data.get("task_names") or [f"任务{j + 1}" for j in range(len(cost[0]))]
    worker_to_idx = {name: i for i, name in enumerate(workers)}
    task_to_idx = {name: j for j, name in enumerate(tasks)}

    parsed, parse_messages = parse_assignments(student_result["solution"], worker_to_idx, task_to_idx)
    used_workers = {}
    used_tasks = {}
    total_cost = 0.0
    messages = list(parse_messages)

    for worker, task in parsed:
        used_workers[worker] = used_workers.get(worker, 0) + 1
        used_tasks[task] = used_tasks.get(task, 0) + 1
        total_cost += float(cost[worker][task])

    duplicate_workers = [workers[i] for i, count in used_workers.items() if count > 1]
    duplicate_tasks = [tasks[j] for j, count in used_tasks.items() if count > 1]
    if duplicate_workers:
        messages.append(f"工人重复分配: {', '.join(duplicate_workers)}")
    if duplicate_tasks:
        messages.append(f"任务重复分配: {', '.join(duplicate_tasks)}")

    m = len(workers)
    n = len(tasks)
    if m <= n:
        missing_workers = [workers[i] for i in range(m) if i not in used_workers]
        if missing_workers:
            messages.append(f"存在未分配工人: {', '.join(missing_workers)}")
    if n <= m:
        missing_tasks = [tasks[j] for j in range(n) if j not in used_tasks]
        if missing_tasks:
            messages.append(f"存在未完成任务: {', '.join(missing_tasks)}")

    claimed_objective = as_float(student_result.get("objective"))
    objective_error = abs(claimed_objective - total_cost) if claimed_objective is not None else float("inf")
    if objective_error > 1e-5:
        messages.append(f"申报 objective 与分配成本不一致，误差 {objective_error:.6g}")

    feasible = not parse_messages and not duplicate_workers and not duplicate_tasks
    if m <= n:
        feasible = feasible and len(used_workers) == m
    if n <= m:
        feasible = feasible and len(used_tasks) == n

    optimal_cost, optimal_pairs = solve_assignment_dp(cost, workers, tasks)
    gap = None
    if feasible and optimal_cost is not None and optimal_cost > EPS:
        gap = max(0.0, (total_cost - optimal_cost) / optimal_cost * 100)
    elif feasible and optimal_cost == 0:
        gap = 0.0 if abs(total_cost) <= 1e-7 else None

    score_items = {}
    score_items["feasibility"] = 30 if feasible else max(0, 30 - 5 * len(messages))
    if feasible and gap is not None:
        if gap <= 1e-5:
            score_items["optimality"] = 35
        elif gap <= 1:
            score_items["optimality"] = 30
        elif gap <= 5:
            score_items["optimality"] = 24
        elif gap <= 15:
            score_items["optimality"] = 14
        else:
            score_items["optimality"] = 5
    else:
        score_items["optimality"] = 0
    score_items["rectangular_robustness"] = 15 if feasible else 0
    score_items["efficiency"] = 10
    score = min(100, sum(score_items.values()))

    if feasible and gap is not None:
        messages.append(f"可行分配，成本 gap={gap:.4f}%")
    if not messages:
        messages.append("通过 case_04 自动检查")

    status = "SUCCESS" if feasible and gap is not None and gap <= 1e-5 else "WRONG_ANSWER"
    if not feasible:
        status = "FAILED"

    return {
        "status": status,
        "isFeasible": feasible,
        "objective": total_cost,
        "optimalObjective": optimal_cost,
        "gap": gap,
        "runtimeMs": 0,
        "memoryMb": None,
        "score": score,
        "scoreItems": score_items,
        "metrics": {
            "assignmentCount": len(parsed),
            "objectiveError": objective_error,
            "optimalAssignment": [
                {"worker": workers[i], "task": tasks[j]}
                for i, j in optimal_pairs
            ],
        },
        "visualization": {
            "assignments": [
                {"worker": workers[i], "task": tasks[j], "cost": cost[i][j]}
                for i, j in parsed
            ],
        },
        "messages": messages,
    }


def parse_assignments(solution, worker_to_idx, task_to_idx):
    parsed = []
    messages = []
    for idx, item in enumerate(solution):
        if not isinstance(item, dict):
            messages.append(f"第 {idx + 1} 条分配不是 dict")
            continue
        worker = item.get("worker")
        task = item.get("task")
        if worker not in worker_to_idx:
            messages.append(f"未知工人: {worker}")
            continue
        if task not in task_to_idx:
            messages.append(f"未知任务: {task}")
            continue
        parsed.append((worker_to_idx[worker], task_to_idx[task]))
    return parsed, messages


def solve_assignment_dp(cost, workers, tasks):
    m = len(workers)
    n = len(tasks)
    if m <= n:
        return assign_rows_to_columns(cost)
    transposed = [[cost[i][j] for i in range(m)] for j in range(n)]
    best, pairs = assign_rows_to_columns(transposed)
    return best, [(worker, task) for task, worker in pairs]


def assign_rows_to_columns(cost):
    rows = len(cost)
    cols = len(cost[0])
    dp = {0: (0.0, [])}
    for row in range(rows):
        next_dp = {}
        for mask, (current_cost, pairs) in dp.items():
            for col in range(cols):
                if mask & (1 << col):
                    continue
                new_mask = mask | (1 << col)
                new_cost = current_cost + float(cost[row][col])
                if new_mask not in next_dp or new_cost < next_dp[new_mask][0]:
                    next_dp[new_mask] = (new_cost, pairs + [(row, col)])
        dp = next_dp
    best_cost, best_pairs = min(dp.values(), key=lambda item: item[0])
    return best_cost, best_pairs


def as_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _invalid(message):
    return {
        "status": "INVALID_OUTPUT",
        "isFeasible": False,
        "objective": None,
        "optimalObjective": None,
        "gap": None,
        "runtimeMs": 0,
        "memoryMb": None,
        "score": 0,
        "scoreItems": {},
        "metrics": {},
        "visualization": {},
        "messages": [message],
    }
