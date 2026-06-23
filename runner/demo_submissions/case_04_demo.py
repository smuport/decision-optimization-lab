"""Demo submission for case_04 using bitmask dynamic programming."""


def solve(data, params=None):
    cost = data["cost_matrix"]
    workers = data.get("worker_names") or [f"工人{i + 1}" for i in range(len(cost))]
    tasks = data.get("task_names") or [f"任务{j + 1}" for j in range(len(cost[0]))]
    m = len(workers)
    n = len(tasks)

    if m <= n:
        best_cost, pairs = assign_rows_to_columns(cost)
    else:
        transposed = [[cost[i][j] for i in range(m)] for j in range(n)]
        best_cost, task_worker_pairs = assign_rows_to_columns(transposed)
        pairs = [(worker, task) for task, worker in task_worker_pairs]

    return {
        "objective": best_cost,
        "solution": [
            {"worker": workers[i], "task": tasks[j]}
            for i, j in pairs
        ],
        "metrics": {}
    }


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
    return min(dp.values(), key=lambda item: item[0])
