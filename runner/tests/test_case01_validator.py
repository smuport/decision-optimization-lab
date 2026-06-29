import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CASE_DIR = ROOT / "course-assets" / "cases" / "case_01"


def load_validator():
    spec = importlib.util.spec_from_file_location("case01_validator_test", CASE_DIR / "validator.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class Case01NumericToleranceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.validator = load_validator()
        cls.data = json.loads((CASE_DIR / "datasets" / "data_small.json").read_text(encoding="utf-8"))
        cls.rubric = json.loads((CASE_DIR / "rubric.json").read_text(encoding="utf-8"))

    def test_rounded_optimal_solution_is_accepted(self):
        result = self.validator.validate(
            self.data,
            {
                "objective": 46.6667,
                "solution": {"产品A": 6.6667, "产品B": 6.6667},
                "metrics": {"shadow_prices": {}, "resource_usage": {}},
            },
            self.rubric,
        )

        self.assertEqual(result["status"], "SUCCESS")
        self.assertTrue(result["isFeasible"])
        self.assertEqual(result["scoreItems"]["objective_consistency"], 10)

    def test_real_constraint_violation_is_rejected(self):
        result = self.validator.validate(
            self.data,
            {"objective": 48.0, "solution": {"产品A": 7.0, "产品B": 7.0}},
            self.rubric,
        )

        self.assertEqual(result["status"], "FAILED")
        self.assertFalse(result["isFeasible"])
        self.assertTrue(any("资源约束违反" in message for message in result["messages"]))

    def test_material_objective_mismatch_is_not_tolerated(self):
        result = self.validator.validate(
            self.data,
            {"objective": 40.0, "solution": {"产品A": 6.6667, "产品B": 6.6667}},
            self.rubric,
        )

        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["scoreItems"]["objective_consistency"], 0)
        self.assertTrue(any("申报 objective" in message for message in result["messages"]))


if __name__ == "__main__":
    unittest.main()
