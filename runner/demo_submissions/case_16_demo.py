"""Demo case_16 TSP submission using nearest neighbor plus 2-opt."""

import math


def solve(data, params=None):
    coords = data["coordinates"]
    dist = build_distance_matrix(coords)
    route = nearest_neighbor_route(dist)
    history = [tour_cost(route, dist)]
    route = two_opt_improve(route, dist, history)
    cost = tour_cost(route, dist)
    return {
        "objective": cost,
        "solution": route,
        "metrics": {
            "iterations": len(history),
            "seed": 0
        },
        "visualization": {
            "convergence": history
        }
    }


def build_distance_matrix(coords):
    matrix = []
    for x1, y1 in coords:
        row = []
        for x2, y2 in coords:
            row.append(math.hypot(x1 - x2, y1 - y2))
        matrix.append(row)
    return matrix


def tour_cost(route, dist):
    return sum(dist[route[i]][route[(i + 1) % len(route)]] for i in range(len(route)))


def nearest_neighbor_route(dist):
    n = len(dist)
    unvisited = set(range(1, n))
    route = [0]
    while unvisited:
        last = route[-1]
        nxt = min(unvisited, key=lambda city: dist[last][city])
        route.append(nxt)
        unvisited.remove(nxt)
    return route


def two_opt_improve(route, dist, history):
    best = route[:]
    best_cost = tour_cost(best, dist)
    improved = True
    while improved:
        improved = False
        for i in range(1, len(best) - 2):
            for j in range(i + 1, len(best)):
                if j - i == 1:
                    continue
                candidate = best[:]
                candidate[i:j] = reversed(candidate[i:j])
                candidate_cost = tour_cost(candidate, dist)
                if candidate_cost + 1e-9 < best_cost:
                    best = candidate
                    best_cost = candidate_cost
                    history.append(best_cost)
                    improved = True
        route = best
    if history[-1] != best_cost:
        history.append(best_cost)
    return best
