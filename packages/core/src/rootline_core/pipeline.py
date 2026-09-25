"""End-to-end analysis pipeline shared by the CLI and the API."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rootline_core.config import load_weights
from rootline_core.git import HistoryWindow, is_shallow, list_commits, open_repo
from rootline_core.graph import EvidenceGraph, build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files
from rootline_core.ranking import Analysis, build_analysis


@dataclass(frozen=True)
class AnalysisRun:
    analysis: Analysis
    graph: EvidenceGraph
    shallow: bool


def run_analysis(
    repo: str | Path,
    test_results: str | Path | None = None,
    baseline: str = "HEAD~50",
    max_commits: int = 50,
    max_files: int = 500,
    config: str | Path | None = None,
) -> AnalysisRun:
    root = Path(repo)
    git_repo = open_repo(root)
    try:
        shallow = is_shallow(git_repo)
        commits = list_commits(
            git_repo,
            HistoryWindow(baseline=baseline, max_commits=max_commits, max_files=max_files),
        )
        results = resolve_files(parse_junit(test_results), root) if test_results else []
        graph = build_evidence_graph(commits, results, repo_root=root)
        analysis = build_analysis(graph, commits, results, load_weights(config))
        return AnalysisRun(analysis=analysis, graph=graph, shallow=shallow)
    finally:
        git_repo.close()
