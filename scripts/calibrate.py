"""Grid-search evidence weights maximizing MRR over the corpus.

Usage: uv run scripts/calibrate.py
Prints a [weights] TOML block for rootline.toml plus per-case ranks.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from rootline_core.calibration import find_best, format_toml, mean_reciprocal_rank, rank_of
from rootline_core.config import DEFAULT_WEIGHTS
from rootline_core.corpus import CASES
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="rootline-calibrate-") as tmpdir:
        root = Path(tmpdir)
        cases = []
        for name, materialize in CASES.items():
            dest = root / name
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
            cases.append((truth, graph, commits, results))
        print(
            f"# defaults MRR: {mean_reciprocal_rank(DEFAULT_WEIGHTS, cases):.3f}"
            f" over {len(cases)} cases"
        )
        best, best_mrr = find_best(cases)
        print(f"# calibrated MRR: {best_mrr:.3f}")
        print(format_toml(best), end="")
        for case in cases:
            print(f"# {case[0]['failing_test']}: rank {rank_of(best, case)}")


if __name__ == "__main__":
    main()
