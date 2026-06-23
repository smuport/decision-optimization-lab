#!/usr/bin/env python3
"""Minimal local submission service for the 1.0 teaching platform prototype.

The service simulates the backend submission flow without a database or web
server:

submit -> copy solution -> run local evaluator -> write status/result JSON
show   -> read one submission status and result summary
list   -> show all local submissions
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SERVICE_DIR = ROOT / "submission-service"
STORAGE_DIR = SERVICE_DIR / "storage"
SUBMISSIONS_DIR = STORAGE_DIR / "submissions"
RESULTS_DIR = STORAGE_DIR / "results"
STATUS_DIR = STORAGE_DIR / "status"
EVALUATE_PATH = ROOT / "runner" / "evaluate.py"


def main() -> int:
    parser = argparse.ArgumentParser(description="Local submission service")
    subparsers = parser.add_subparsers(dest="command", required=True)

    submit_parser = subparsers.add_parser("submit", help="create and evaluate a submission")
    submit_parser.add_argument("--case", required=True, help="case id, e.g. case_01")
    submit_parser.add_argument("--dataset", default="small", help="dataset id")
    submit_parser.add_argument("--student", default="demo-student", help="student id")
    submit_parser.add_argument("--file", required=True, help="submission Python file")

    show_parser = subparsers.add_parser("show", help="show one submission")
    show_parser.add_argument("submission_id")

    subparsers.add_parser("list", help="list local submissions")

    args = parser.parse_args()
    ensure_storage()
    if args.command == "submit":
        payload = submit(args.case, args.dataset, args.student, Path(args.file))
    elif args.command == "show":
        payload = show(args.submission_id)
    else:
        payload = list_submissions()
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def ensure_storage() -> None:
    for path in (SUBMISSIONS_DIR, RESULTS_DIR, STATUS_DIR):
        path.mkdir(parents=True, exist_ok=True)


def submit(case_id: str, dataset_id: str, student_id: str, source_file: Path) -> dict[str, Any]:
    if not source_file.exists():
        raise FileNotFoundError(f"提交文件不存在: {source_file}")

    submission_id = f"sub_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    submission_dir = SUBMISSIONS_DIR / submission_id
    submission_dir.mkdir(parents=True, exist_ok=False)
    copied_file = submission_dir / "solution.py"
    shutil.copy2(source_file, copied_file)

    result_path = RESULTS_DIR / f"{submission_id}.json"
    status_path = STATUS_DIR / f"{submission_id}.json"
    status = {
        "submissionId": submission_id,
        "studentId": student_id,
        "caseId": case_id,
        "datasetId": dataset_id,
        "status": "RUNNING",
        "score": 0,
        "sourceFile": str(source_file),
        "storedFile": str(copied_file),
        "resultPath": str(result_path),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    write_json(status_path, status)

    evaluator = load_evaluator()
    result = evaluator.evaluate(
        case_id=case_id,
        dataset_id=dataset_id,
        submission_path=copied_file,
        output_path=result_path,
    )
    write_json(result_path, result)

    status.update(
        {
            "status": result["status"],
            "score": result["score"],
            "isFeasible": result["isFeasible"],
            "updatedAt": now_iso(),
        }
    )
    write_json(status_path, status)
    return {
        "submission": status,
        "result": summarize_result(result),
    }


def show(submission_id: str) -> dict[str, Any]:
    status_path = STATUS_DIR / f"{submission_id}.json"
    if not status_path.exists():
        raise FileNotFoundError(f"找不到提交: {submission_id}")
    status = read_json(status_path)
    result_path = Path(status["resultPath"])
    result = read_json(result_path) if result_path.exists() else None
    return {
        "submission": status,
        "result": summarize_result(result) if result else None,
    }


def list_submissions() -> dict[str, Any]:
    rows = []
    for path in sorted(STATUS_DIR.glob("*.json")):
        status = read_json(path)
        rows.append(
            {
                "submissionId": status["submissionId"],
                "studentId": status["studentId"],
                "caseId": status["caseId"],
                "datasetId": status["datasetId"],
                "status": status["status"],
                "score": status.get("score", 0),
                "updatedAt": status["updatedAt"],
            }
        )
    return {
        "count": len(rows),
        "submissions": rows,
    }


def summarize_result(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": result["status"],
        "isFeasible": result["isFeasible"],
        "objective": result.get("objective"),
        "optimalObjective": result.get("optimalObjective"),
        "gap": result.get("gap"),
        "score": result["score"],
        "messages": result.get("messages", []),
    }


def load_evaluator() -> ModuleType:
    spec = importlib.util.spec_from_file_location("local_runner_evaluate", EVALUATE_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"无法加载 evaluator: {EVALUATE_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["local_runner_evaluate"] = module
    spec.loader.exec_module(module)
    return module


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
