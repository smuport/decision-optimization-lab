"""case_16 学生提交模板：模拟退火求解 TSP。"""


def solve(data, params=None):
    """求解 TSP。

    Args:
        data: 题目 JSON 数据，包含 coordinates 和默认 SA 参数。
        params: 可选参数，可覆盖 T0、alpha、T_min、max_iter、seed。

    Returns:
        dict，至少包含：
        {
            "objective": 路线总长度,
            "solution": [0, 3, 2, ...],
            "metrics": {
                "iterations": 20000,
                "seed": 42
            },
            "visualization": {
                "convergence": [初始值, ..., 最终值]
            }
        }
    """
    raise NotImplementedError("请在这里实现 case_16 的求解逻辑")
