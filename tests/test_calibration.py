"""P19 tests: calibration keeps perfect MRR with valid weights."""

from pathlib import Path

from rootline_core.calibration import ALL_FIELDS, find_best, mean_reciprocal_rank
from rootline_core.config import DEFAULT_WEIGHTS
from rootline_core.corpus import CASES
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files


def _cases(tmp_path: Path) -> list:
    loaded = []
    for name, materialize in CASES.items():
        dest = tmp_path / name
        dest.mkdir()
        truth = materialize(dest)
        repo = open_repo(dest)
        try:
            window = HistoryWindow(baseline=truth.get("baseline", "HEAD~50"), max_commits=50)
            commits = list_commits(repo, window)
            results = resolve_files(parse_junit(dest / truth["results_xml"]), dest)
            graph = build_evidence_graph(commits, results, repo_root=dest)
        finally:
            repo.close()
        loaded.append((truth, graph, commits, results))
    return loaded


def test_calibration_keeps_perfect_mrr_with_valid_weights(tmp_path: Path) -> None:
    cases = _cases(tmp_path)
    assert len(cases) == 4
    assert mean_reciprocal_rank(DEFAULT_WEIGHTS, cases) == 1.0

    best, best_mrr = find_best(cases)

    assert best_mrr == 1.0
    for field in ALL_FIELDS:
        assert 0.0 <= getattr(best, field) <= 1.0
