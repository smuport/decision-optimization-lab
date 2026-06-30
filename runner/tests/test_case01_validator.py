import importlib.util
import json
import tempfile
import unittest
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
EXERCISE_DIR = ROOT / "course-assets" / "cases" / "case_01" / "exercises" / "production_planning"


def load_validator():
    spec = importlib.util.spec_from_file_location("case01_validator_test", EXERCISE_DIR / "validator.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def load_runner():
    spec = importlib.util.spec_from_file_location("exercise_runner_test", ROOT / "runner" / "evaluate.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class Case01NumericToleranceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.validator = load_validator()
        cls.data = json.loads((EXERCISE_DIR / "datasets" / "public" / "data_small.json").read_text(encoding="utf-8"))
        cls.rubric = json.loads((EXERCISE_DIR / "rubric.json").read_text(encoding="utf-8"))

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


class Case01ExerciseRunnerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runner = load_runner()

    def evaluate_file(self, path):
        return self.runner.evaluate("production_planning", "small", Path(path))

    def test_new_exercise_key_runs_correct_submission(self):
        result = self.evaluate_file(ROOT / "runner" / "demo_submissions" / "case_01_demo.py")
        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["artifacts"]["exerciseId"], "production_planning")

    def test_wrong_submission_is_rejected(self):
        result = self.evaluate_file(ROOT / "runner" / "demo_submissions" / "case_01_bad.py")
        self.assertEqual(result["status"], "FAILED")

    def test_runtime_error_is_structured(self):
        with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8") as submission:
            submission.write("def solve(data, params=None):\n    raise RuntimeError('boom')\n")
            submission.flush()
            result = self.evaluate_file(submission.name)
        self.assertEqual(result["status"], "RUNTIME_ERROR")
        self.assertTrue(any("boom" in message for message in result["messages"]))

    def test_four_decimal_solution_passes_through_runner(self):
        with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8") as submission:
            submission.write("def solve(data, params=None):\n    return {'objective': 46.6667, 'solution': {'产品A': 6.6667, '产品B': 6.6667}, 'metrics': {'shadow_prices': {}, 'resource_usage': {}}}\n")
            submission.flush()
            result = self.evaluate_file(submission.name)
        self.assertEqual(result["status"], "SUCCESS")

    def test_legacy_case_mapping_remains_available(self):
        exercise_code = self.runner.LEGACY_CASE_EXERCISES["case_01"]
        result = self.runner.evaluate(exercise_code, "small", ROOT / "runner" / "demo_submissions" / "case_01_demo.py", legacy_case_id="case_01")
        self.assertEqual(result["status"], "SUCCESS")


if __name__ == "__main__":
    unittest.main()
