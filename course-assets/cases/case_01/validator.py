"""Validator for case_01 production allocation.

The validator checks student output structure, resource feasibility, objective
consistency, and compares against an exact LP benchmark computed by enumerating
basic feasible solutions in standard form. The data sizes in this course have a
small number of resource constraints, so this remains lightweight.
"""

from __future__ import annotations

from itertools import combinations

EPS = 1e-7


def validate(data, student_result, rubric=None):
    if not isinstance(student_result, dict):
        return _invalid("学生结果必须是 dict")
    if "objective" not in student_result or "solution" not in student_result:
        return _invalid("结果必须包含 objective 和 solution")
    if not isinstance(student_result["solution"], dict):
        return _invalid("solution 必须是 产品 -> 数量 的 dict")

    products = data["products"]
    resources = data["resources"]
    profits = data["profits"]
    limits = data["limits"]
    consumption = data["consumption"]

    quantities, format_messages = parse_quantities(products, student_result["solution"])
    usage = {
        r: sum(consumption[p][r] * quantities[p] for p in products)
        for r in resources
    }
    violations = {
        r: max(0.0, usage[r] - limits[r])
        for r in resources
    }
    max_violation = max(violations.values(), default=0.0)
    has_negative = any(v < -EPS for v in quantities.values())
    computed_objective = sum(profits[p] * quantities[p] for p in products)
    claimed_objective = as_float(student_result.get("objective"))
    objective_error = (
        abs(claimed_objective - computed_objective)
        if claimed_objective is not None
        else float("inf")
    )
    feasible = not has_negative and max_violation <= 1e-5 and not format_messages

    optimal_objective, optimal_solution = solve_lp_by_basis_enumeration(data)
    gap = None
    if feasible and optimal_objective and optimal_objective > EPS:
        gap = max(0.0, (optimal_objective - computed_objective) / optimal_objective * 100)

    score_items = {}
    score_items["feasibility"] = 20 if feasible else max(0, 20 - min(20, max_violation * 5))
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
    score_items["objective_consistency"] = 10 if objective_error <= 1e-5 else 0

    metrics = student_result.get("metrics") or {}
    shadow_prices = metrics.get("shadow_prices") if isinstance(metrics, dict) else None
    resource_usage_reported = metrics.get("resource_usage") if isinstance(metrics, dict) else None
    score_items["dual_shadow_price"] = 0
    if isinstance(shadow_prices, dict):
        score_items["dual_shadow_price"] += 8
    if isinstance(resource_usage_reported, dict):
        score_items["dual_shadow_price"] += 7
    if feasible and optimal_solution is not None:
        score_items["dual_shadow_price"] += 5

    score_items["robustness"] = 10 if feasible and claimed_objective is not None else 0
    score = min(100, sum(score_items.values()))

    messages = []
    messages.extend(format_messages)
    if has_negative:
        messages.append("存在负产量，违反非负约束")
    if max_violation > 1e-5:
        messages.append(f"资源约束违反，最大超限 {max_violation:.6g}")
    if objective_error > 1e-5:
        messages.append(f"申报 objective 与 solution 计算值不一致，误差 {objective_error:.6g}")
    if feasible and gap is not None:
        messages.append(f"可行解，目标值 gap={gap:.4f}%")
    if not messages:
        messages.append("通过 case_01 自动检查")

    status = "SUCCESS" if feasible and (gap is not None and gap <= 1e-5) else "WRONG_ANSWER"
    if not feasible:
        status = "FAILED"

    return {
        "status": status,
        "isFeasible": feasible,
        "objective": computed_objective,
        "optimalObjective": optimal_objective,
        "gap": gap,
        "runtimeMs": 0,
        "memoryMb": None,
        "score": score,
        "scoreItems": score_items,
        "metrics": {
            "resourceUsage": usage,
            "resourceViolation": violations,
            "objectiveError": objective_error,
            "optimalSolution": optimal_solution,
        },
        "visualization": {},
        "messages": messages,
    }


def parse_quantities(products, solution):
    quantities = {}
    messages = []
    for product in products:
        value = as_float(solution.get(product))
        if value is None:
            messages.append(f"solution 缺少产品 {product}")
            value = 0.0
        quantities[product] = value
    extras = sorted(set(solution) - set(products))
    if extras:
        messages.append(f"solution 包含未知产品: {', '.join(extras)}")
    return quantities, messages


def solve_lp_by_basis_enumeration(data):
    products = data["products"]
    resources = data["resources"]
    profits = data["profits"]
    limits = data["limits"]
    consumption = data["consumption"]
    m = len(resources)
    n = len(products)

    columns = []
    objective = []
    names = []
    for product in products:
        columns.append([float(consumption[product][r]) for r in resources])
        objective.append(float(profits[product]))
        names.append(("product", product))
    for i, resource in enumerate(resources):
        col = [0.0] * m
        col[i] = 1.0
        columns.append(col)
        objective.append(0.0)
        names.append(("slack", resource))

    b = [float(limits[r]) for r in resources]
    best_value = float("-inf")
    best_solution = None

    for basis in combinations(range(n + m), m):
        matrix = [[columns[j][i] for j in basis] for i in range(m)]
        basic = solve_linear_system(matrix, b)
        if basic is None or any(v < -1e-7 for v in basic):
            continue
        full = [0.0] * (n + m)
        for idx, value in zip(basis, basic):
            full[idx] = 0.0 if abs(value) < 1e-9 else value
        if not satisfies_constraints(columns, full, b):
            continue
        value = sum(objective[i] * full[i] for i in range(n + m))
        if value > best_value:
            best_value = value
            best_solution = {
                products[i]: full[i]
                for i in range(n)
            }

    if best_solution is None:
        return None, None
    return best_value, best_solution


def solve_linear_system(matrix, rhs):
    n = len(rhs)
    a = [list(row) + [float(rhs[i])] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-10:
            return None
        if pivot != col:
            a[col], a[pivot] = a[pivot], a[col]
        div = a[col][col]
        for j in range(col, n + 1):
            a[col][j] /= div
        for r in range(n):
            if r == col:
                continue
            factor = a[r][col]
            if abs(factor) < 1e-12:
                continue
            for j in range(col, n + 1):
                a[r][j] -= factor * a[col][j]
    return [a[i][n] for i in range(n)]


def satisfies_constraints(columns, full, rhs):
    for row, limit in enumerate(rhs):
        lhs = sum(columns[col][row] * full[col] for col in range(len(full)))
        if abs(lhs - limit) > 1e-5:
            return False
    return True


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
