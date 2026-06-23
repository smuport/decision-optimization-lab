"""Validator for case_16 TSP simulated annealing submissions."""

from __future__ import annotations

import math

EPS = 1e-7


def validate(data, student_result, rubric=None):
    if not isinstance(student_result, dict):
        return _invalid("学生结果必须是 dict")
    if "objective" not in student_result or "solution" not in student_result:
        return _invalid("结果必须包含 objective 和 solution")
    if not isinstance(student_result["solution"], list):
        return _invalid("solution 必须是城市编号列表")

    coords = data["coordinates"]
    n = len(coords)
    route, route_messages = parse_route(student_result["solution"], n)
    distance_matrix = build_distance_matrix(coords)

    feasible = not route_messages
    route_cost = tour_cost(route, distance_matrix) if feasible else None
    claimed_objective = as_float(student_result.get("objective"))
    objective_error = (
        abs(claimed_objective - route_cost)
        if feasible and claimed_objective is not None
        else None
    )

    baseline_route = two_opt_improve(nearest_neighbor_route(distance_matrix), distance_matrix)
    baseline_cost = tour_cost(baseline_route, distance_matrix)
    gap = None
    if feasible and baseline_cost > EPS:
        gap = max(0.0, (route_cost - baseline_cost) / baseline_cost * 100)

    visualization = student_result.get("visualization") or {}
    convergence = visualization.get("convergence")
    convergence_ok = is_numeric_list(convergence)

    metrics = student_result.get("metrics") or {}
    iterations = as_float(metrics.get("iterations")) if isinstance(metrics, dict) else None

    messages = list(route_messages)
    if feasible and claimed_objective is None:
        messages.append("objective 必须是数字")
    if feasible and objective_error is not None and objective_error > 1e-5:
        messages.append(f"申报 objective 与路线长度不一致，误差 {objective_error:.6g}")
    if not convergence_ok:
        messages.append("visualization.convergence 缺失或不是数字列表")
    if iterations is None:
        messages.append("metrics.iterations 缺失或不是数字")
    if feasible and gap is not None:
        messages.append(f"合法路线，较最近邻+2opt基准 gap={gap:.4f}%")

    score_items = {}
    score_items["route_feasibility"] = 25 if feasible else 0
    if feasible and objective_error is not None and objective_error <= 1e-5:
        if gap is not None and gap <= 0.1:
            score_items["solution_quality"] = 35
        elif gap is not None and gap <= 5:
            score_items["solution_quality"] = 30
        elif gap is not None and gap <= 15:
            score_items["solution_quality"] = 22
        elif gap is not None and gap <= 35:
            score_items["solution_quality"] = 12
        else:
            score_items["solution_quality"] = 5
    else:
        score_items["solution_quality"] = 0
    score_items["efficiency"] = 15 if iterations is not None and iterations <= max(1, data.get("max_iter", 0)) else 8 if iterations is not None else 0
    score_items["convergence"] = 10 if convergence_ok else 0
    score = min(100, sum(score_items.values()))

    status = "SUCCESS" if feasible and objective_error is not None and objective_error <= 1e-5 else "FAILED"
    if feasible and status == "SUCCESS" and gap is not None and gap > 35:
        status = "WRONG_ANSWER"

    return {
        "status": status,
        "isFeasible": feasible,
        "objective": route_cost,
        "optimalObjective": baseline_cost,
        "gap": gap,
        "runtimeMs": 0,
        "memoryMb": None,
        "score": score,
        "scoreItems": score_items,
        "metrics": {
            "objectiveError": objective_error,
            "iterations": iterations,
            "baselineRoute": baseline_route,
            "cityCount": n,
        },
        "visualization": {
            "route": route if feasible else [],
            "convergence": convergence if convergence_ok else [],
        },
        "messages": messages or ["通过 case_16 自动检查"],
    }


def parse_route(raw_route, n):
    route = []
    messages = []
    for idx, value in enumerate(raw_route):
        if isinstance(value, bool):
            messages.append(f"第 {idx + 1} 个城市编号不是整数")
            continue
        try:
            city = int(value)
        except (TypeError, ValueError):
            messages.append(f"第 {idx + 1} 个城市编号不是整数")
            continue
        route.append(city)
    expected = set(range(n))
    actual = set(route)
    if len(route) != n:
        messages.append(f"路线长度应为 {n}，实际为 {len(route)}")
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing:
        messages.append(f"路线缺少城市: {missing}")
    if extra:
        messages.append(f"路线包含非法城市: {extra}")
    if len(route) != len(actual):
        messages.append("路线存在重复城市")
    return route, messages


def build_distance_matrix(coords):
    matrix = []
    for x1, y1 in coords:
        row = []
        for x2, y2 in coords:
            row.append(math.hypot(x1 - x2, y1 - y2))
        matrix.append(row)
    return matrix


def tour_cost(route, distance_matrix):
    return sum(
        distance_matrix[route[i]][route[(i + 1) % len(route)]]
        for i in range(len(route))
    )


def nearest_neighbor_route(distance_matrix):
    n = len(distance_matrix)
    unvisited = set(range(1, n))
    route = [0]
    while unvisited:
        last = route[-1]
        nxt = min(unvisited, key=lambda city: distance_matrix[last][city])
        route.append(nxt)
        unvisited.remove(nxt)
    return route


def two_opt_improve(route, distance_matrix):
    best = route[:]
    best_cost = tour_cost(best, distance_matrix)
    improved = True
    while improved:
        improved = False
        for i in range(1, len(best) - 2):
            for j in range(i + 1, len(best)):
                if j - i == 1:
                    continue
                candidate = best[:]
                candidate[i:j] = reversed(candidate[i:j])
                candidate_cost = tour_cost(candidate, distance_matrix)
                if candidate_cost + 1e-9 < best_cost:
                    best = candidate
                    best_cost = candidate_cost
                    improved = True
        route = best
    return best


def is_numeric_list(value):
    if not isinstance(value, list) or not value:
        return False
    return all(as_float(item) is not None for item in value)


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
