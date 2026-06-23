"""Intentionally wrong case_16 submission for validator testing."""


def solve(data, params=None):
    n = len(data["coordinates"])
    route = list(range(max(0, n - 1)))
    if route:
        route.append(route[0])
    return {
        "objective": 0,
        "solution": route,
        "metrics": {},
        "visualization": {
            "convergence": []
        }
    }
