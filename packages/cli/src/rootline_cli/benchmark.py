"""Corpus benchmark: Top-1 / Top-3 / MRR over planted regressions."""

from __future__ import annotations

import tempfile
from dataclasses import dataclass
from pathlib import Path

from rootline_core.corpus import CASES
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files
from rootline_core.ranking import build_analysis


@dataclass(frozen=True)
class CaseScore:
    case: str
    rank: int | None  # 1-based rank of the culprit, None on miss
    top1: bool
    top3: bool


@dataclass(frozen=True)
class BenchmarkReport:
    cases: list[CaseScore]
    top1_accuracy: float
    top3_accuracy: float
    mrr: float


def run_benchmark() -> BenchmarkReport:
    cases = [_run_case(name) for name in CASES]
    hits1 = sum(1 for c in cases if c.top1)
    hits3 = sum(1 for c in cases if c.top3)
    reciprocal = sum(1.0 / c.rank for c in cases if c.rank is not None)
    total = max(len(cases), 1)
    return BenchmarkReport(
        cases=cases,
        top1_accuracy=hits1 / total,
        top3_accuracy=hits3 / total,
        mrr=reciprocal / total,
    )


def _run_case(name: str) -> CaseScore:
    with tempfile.TemporaryDirectory(prefix=f"rootline-{name}-") as tmpdir:
        dest = Path(tmpdir)
        truth = CASES[name](dest)
        repo = open_repo(dest)
        try:
            window = HistoryWindow(baseline=truth.get("baseline", "HEAD~50"), max_commits=50)
            commits = list_commits(repo, window)
            results_path = dest / truth["results_xml"]
            results = resolve_files(parse_junit(results_path), dest)
            graph = build_evidence_graph(commits, results, repo_root=dest)
            candidates = build_analysis(graph, commits, results).candidates
        finally:
            repo.close()
    rank = next(
        (i + 1 for i, c in enumerate(candidates) if c.message == truth["culprit_message"]),
        None,
    )
    return CaseScore(
        case=name,
        rank=rank,
        top1=rank == 1,
        top3=rank is not None and rank <= 3,
    )
