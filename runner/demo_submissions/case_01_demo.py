"""Demo submission for case_01.

This intentionally avoids solver dependencies so Day 2 can verify the runner
pipeline on a clean Python installation.
"""


def solve(data, params=None):
    products = data["products"]
    if len(products) != 2:
        raise ValueError("Day 2 demo only supports two-product LP data")

    p1, p2 = products
    resources = data["resources"]
    profits = data["profits"]
    limits = data["limits"]
    consumption = data["consumption"]

    candidates = [(0.0, 0.0)]

    # Axis intersections.
    for product_index, product in enumerate(products):
        max_value = min(
            limits[r] / consumption[product][r]
            for r in resources
            if consumption[product][r] > 0
        )
        point = [0.0, 0.0]
        point[product_index] = max_value
        candidates.append(tuple(point))

    # Pairwise constraint intersections for the common 2D teaching case.
    for i, r1 in enumerate(resources):
        for r2 in resources[i + 1:]:
            a11 = consumption[p1][r1]
            a12 = consumption[p2][r1]
            a21 = consumption[p1][r2]
            a22 = consumption[p2][r2]
            det = a11 * a22 - a12 * a21
            if abs(det) < 1e-12:
                continue
            x1 = (limits[r1] * a22 - a12 * limits[r2]) / det
            x2 = (a11 * limits[r2] - limits[r1] * a21) / det
            candidates.append((x1, x2))

    feasible = []
    for x1, x2 in candidates:
        if x1 < -1e-9 or x2 < -1e-9:
            continue
        if all(
            consumption[p1][r] * x1 + consumption[p2][r] * x2 <= limits[r] + 1e-9
            for r in resources
        ):
            feasible.append((max(0.0, x1), max(0.0, x2)))

    best = max(feasible, key=lambda x: profits[p1] * x[0] + profits[p2] * x[1])
    objective = profits[p1] * best[0] + profits[p2] * best[1]
    resource_usage = {
        r: consumption[p1][r] * best[0] + consumption[p2][r] * best[1]
        for r in resources
    }

    return {
        "objective": objective,
        "solution": {
            p1: best[0],
            p2: best[1],
        },
        "metrics": {
            "shadow_prices": {},
            "resource_usage": resource_usage,
        },
    }
