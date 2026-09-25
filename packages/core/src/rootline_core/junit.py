"""JUnit XML ingestion with test-to-file mapping (FR-004). Read-only."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree

OUTCOME_PASSED = "passed"
OUTCOME_FAILED = "failed"
OUTCOME_ERROR = "error"
OUTCOME_SKIPPED = "skipped"


@dataclass(frozen=True)
class TestResult:
    name: str
    classname: str
    file: str | None  # repo-relative path, None when unmapped (warn upstream)
    outcome: str
    message: str
    duration: float


def parse_junit(path: str | Path) -> list[TestResult]:
    root = ElementTree.parse(path).getroot()
    cases = root.iter("testcase") if root.tag != "testcase" else [root]
    return [_to_result(case) for case in cases]


def _to_result(case: ElementTree.Element) -> TestResult:
    outcome, message = _outcome_and_message(case)
    return TestResult(
        name=case.get("name", ""),
        classname=case.get("classname", ""),
        file=None,
        outcome=outcome,
        message=message,
        duration=float(case.get("time", "0") or "0"),
    )


def _outcome_and_message(case: ElementTree.Element) -> tuple[str, str]:
    for tag, outcome in (("failure", OUTCOME_FAILED), ("error", OUTCOME_ERROR)):
        found = case.find(tag)
        if found is not None:
            return outcome, (found.get("message", "") + "\n" + (found.text or "")).strip()
    if case.find("skipped") is not None:
        return OUTCOME_SKIPPED, ""
    return OUTCOME_PASSED, ""


def resolve_files(results: list[TestResult], repo_root: str | Path) -> list[TestResult]:
    root = Path(repo_root)
    return [
        TestResult(
            name=r.name,
            classname=r.classname,
            file=_resolve_file(r.classname, root),
            outcome=r.outcome,
            message=r.message,
            duration=r.duration,
        )
        for r in results
    ]


def _resolve_file(classname: str, root: Path) -> str | None:
    dotted = classname.replace(".", "/") + ".py"
    if (root / dotted).is_file():
        return dotted
    stem = classname.split(".")[-1] if classname else ""
    if stem:
        matches = sorted(root.rglob(f"{stem}.py"))
        if matches:
            return str(matches[0].relative_to(root)).replace("\\", "/")
    return None
