"""Rootline MCP tools (pure functions; server.py exposes them over stdio)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from rootline_core.blast import blast_radius
from rootline_core.explain import explain
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.pipeline import run_analysis
from rootline_core.ranking import Analysis


def rank_causes(
    repo: str,
    test_results: str | None = None,
    baseline: str = "HEAD~50",
    max_commits: int = 50,
) -> dict[str, Any]:
    """Rank candidate causal commits; returns the analysis as a JSON dict."""
    run = run_analysis(repo, test_results, baseline, max_commits)
    return run.analysis.model_dump(mode="json")


def explain_candidate(
    analysis: dict[str, Any], sha: str, failing_tests: list[str] | None = None
) -> str:
    """Explain one candidate (full or prefix SHA) with evidence for/against."""
    parsed = Analysis.model_validate(analysis)
    match = next((c for c in parsed.candidates if c.commit_sha.startswith(sha)), None)
    if match is None:
        return f"Unknown candidate: {sha}"
    return explain(match, failing_tests or [])


def blast_radius_for_commit(repo: str, sha: str, baseline: str = "HEAD~50") -> dict[str, Any]:
    """Changed files, dependents and covering tests for a commit."""
    root = Path(repo)
    git_repo = open_repo(root)
    try:
        commits = list_commits(git_repo, HistoryWindow(baseline=baseline))
        full = next((c.sha for c in commits if c.sha.startswith(sha)), None)
        target = full or git_repo.commit(sha).hexsha
        graph = build_evidence_graph(commits, [], repo_root=root)
        return blast_radius(graph, target).model_dump(mode="json")
    finally:
        git_repo.close()
