"""Intentionally wrong case_01 submission for validator testing."""


def solve(data, params=None):
    products = data["products"]
    return {
        "objective": 999999,
        "solution": {
            products[0]: 999,
            products[1]: 999,
        },
        "metrics": {}
    }
