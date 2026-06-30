"""case_01 学生提交模板：生产分配问题。

要求实现 solve(data, params=None)，返回结构化结果。
"""


def solve(data, params=None):
    """求解生产分配问题。

    Args:
        data: 题目 JSON 数据。
        params: 可选参数，本案例可忽略。

    Returns:
        dict，至少包含：
        {
            "objective": 最大利润,
            "solution": {"产品A": 数量, ...},
            "metrics": {
                "shadow_prices": {"原料(吨)": 影子价格, ...},
                "resource_usage": {"原料(吨)": 使用量, ...}
            }
        }
    """
    raise NotImplementedError("请在这里实现 case_01 的求解逻辑")
