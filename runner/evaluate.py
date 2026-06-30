#!/usr/bin/env python3
"""Local Exercise-aware evaluator for the teaching platform.

This runner intentionally stays small: it loads one case manifest, executes a
student module's solve(data, params=None), calls the Exercise validator, and
writes a standard result JSON. Sandboxing and full scoring are later-week tasks.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import time
import traceback
from pathlib import Path
from types import ModuleType
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CASES_DIR = ROOT / "course-assets" / "cases"
LEGACY_CASE_EXERCISES = {"case_01": "production_planning"}
sys.dont_write_bytecode = True


def main() -> int:
    args = parse_args()
    result = evaluate(
        exercise_code=args.exercise or LEGACY_CASE_EXERCISES.get(args.case),
        dataset_id=args.dataset,
        submission_path=Path(args.submission),
        output_path=Path(args.output) if args.output else None,
        legacy_case_id=args.case,
    )
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0 if result["status"] in {"SUCCESS", "PARTIAL"} else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate one local submission")
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--exercise", help="Exercise code, e.g. production_planning")
    target.add_argument("--case", help="Legacy Case id compatibility, e.g. case_01")
    parser.add_argument("--dataset", default="small", help="Dataset id")
    parser.add_argument("--submission", required=True, help="Path to solution.py")
    parser.add_argument("--output", help="Optional path to write result JSON")
    return parser.parse_args()


def evaluate(
    exercise_code: str | None,
    dataset_id: str,
    submission_path: Path,
    output_path: Path | None = None,
    legacy_case_id: str | None = None,
) -> dict[str, Any]:
    if not exercise_code:
        return error_result("INVALID_OUTPUT", f"案例 {legacy_case_id} 没有兼容的练习映射")

    try:
        located = locate_exercise(exercise_code, legacy_case_id)
        if located is None:
            return error_result("INVALID_OUTPUT", f"找不到练习 manifest: {exercise_code}")
        case_id, exercise_dir, manifest_path = located
        manifest = read_json(manifest_path)
        dataset_path = resolve_dataset_path(manifest_path, manifest, dataset_id)
        data = read_json(dataset_path)
        rubric = read_json(exercise_dir / manifest["rubric"])
        solution_module = load_module(submission_path.resolve(), "student_solution")
        validator_module = load_module(
            (exercise_dir / manifest["validator"]).resolve(),
            f"{case_id}_{exercise_code}_validator",
        )
        solve = getattr(solution_module, manifest.get("entrypoint", "solve"), None)
        validate = getattr(validator_module, "validate", None)
        if not callable(solve):
            return error_result("INVALID_OUTPUT", "学生提交缺少可调用的 solve(data, params=None)")
        if not callable(validate):
            return error_result("INVALID_OUTPUT", "案例 validator 缺少 validate(data, student_result, rubric=None)")

        started = time.perf_counter()
        student_result = solve(data, None)
        runtime_ms = (time.perf_counter() - started) * 1000
        result = validate(data, student_result, rubric)
        result = normalize_result(result)
        result["runtimeMs"] = round(runtime_ms, 3)
        result.setdefault("artifacts", {})
        result["artifacts"].update(
            {
                "caseId": case_id,
                "exerciseId": exercise_code,
                "datasetId": dataset_id,
                "submission": str(submission_path),
                "output": str(output_path) if output_path else None,
            }
        )
        return result
    except Exception as exc:  # Keep Day 2 feedback explicit rather than clever.
        return error_result(
            "RUNTIME_ERROR",
            f"{type(exc).__name__}: {exc}",
            details=traceback.format_exc(limit=5),
        )


def resolve_dataset_path(manifest_path: Path, manifest: dict[str, Any], dataset_id: str) -> Path:
    for dataset in manifest.get("datasets", []):
        if dataset.get("key") == dataset_id:
            path = (manifest_path.parent / dataset["path"]).resolve()
            if not path.exists():
                raise FileNotFoundError(f"数据集文件不存在: {path}")
            return path
    raise ValueError(f"练习 {manifest.get('exercise_code')} 不存在数据集: {dataset_id}")


def locate_exercise(exercise_code: str, case_id: str | None = None) -> tuple[str, Path, Path] | None:
    case_dirs = [CASES_DIR / case_id] if case_id else sorted(CASES_DIR.glob("*"))
    matches = []
    for case_dir in case_dirs:
        exercise_dir = case_dir / "exercises" / exercise_code
        manifest_path = exercise_dir / "exercise_manifest.json"
        if manifest_path.exists():
            matches.append((case_dir.name, exercise_dir, manifest_path))
    if len(matches) > 1:
        raise ValueError(f"练习编码不唯一，无法定位: {exercise_code}")
    return matches[0] if matches else None


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_module(path: Path, module_name: str) -> ModuleType:
    if not path.exists():
        raise FileNotFoundError(f"模块文件不存在: {path}")
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"无法加载模块: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def normalize_result(result: Any) -> dict[str, Any]:
    if not isinstance(result, dict):
        return error_result("INVALID_OUTPUT", "validator 返回值必须是 dict")
    normalized = {
        "status": result.get("status", "FAILED"),
        "isFeasible": bool(result.get("isFeasible", False)),
        "objective": result.get("objective"),
        "optimalObjective": result.get("optimalObjective"),
        "gap": result.get("gap"),
        "runtimeMs": float(result.get("runtimeMs", 0)),
        "memoryMb": result.get("memoryMb"),
        "score": float(result.get("score", 0)),
        "scoreItems": result.get("scoreItems") or {},
        "metrics": result.get("metrics") or {},
        "visualization": result.get("visualization") or {},
        "messages": result.get("messages") or [],
        "artifacts": result.get("artifacts") or {},
    }
    if normalized["status"] not in {
        "SUCCESS",
        "PARTIAL",
        "FAILED",
        "TIMEOUT",
        "RUNTIME_ERROR",
        "WRONG_ANSWER",
        "INVALID_OUTPUT",
    }:
        normalized["status"] = "FAILED"
        normalized["messages"].append("validator 返回了未知 status，已归一化为 FAILED")
    return normalized


def error_result(status: str, message: str, details: str | None = None) -> dict[str, Any]:
    messages = [message]
    if details:
        messages.append(details)
    return {
        "status": status,
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
        "messages": messages,
        "artifacts": {},
    }


if __name__ == "__main__":
    raise SystemExit(main())
