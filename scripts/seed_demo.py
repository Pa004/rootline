"""Seed the demo Worker R2 layout from the regression corpus (deterministic).

Writes workers/api/seed/analyses/{index.json,{id}.json,{id}.graph.json}.
Upload with wrangler (see workers/api/README.md). Run: uv run scripts/seed_demo.py
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import networkx as nx
from rootline_core.corpus import CASES
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files
from rootline_core.ranking import build_analysis

DEMO_ID = "demo-regression-01"
SEED_DIR = Path(__file__).resolve().parent.parent / "workers" / "api" / "seed" / "analyses"


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="rootline-seed-") as tmpdir:
        dest = Path(tmpdir)
        CASES["regression-01"](dest)
        repo = open_repo(dest)
        try:
            commits = list_commits(repo, HistoryWindow(baseline="HEAD~50", max_commits=50))
            results = resolve_files(parse_junit(dest / "results.xml"), dest)
            graph = build_evidence_graph(commits, results, repo_root=dest)
            analysis = build_analysis(graph, commits, results)
        finally:
            repo.close()
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    (SEED_DIR / f"{DEMO_ID}.json").write_text(analysis.model_dump_json(indent=2), encoding="utf-8")
    (SEED_DIR / f"{DEMO_ID}.graph.json").write_text(
        json.dumps(nx.node_link_data(graph, edges="edges", nodes="nodes")),
        encoding="utf-8",
    )
    top = analysis.candidates[0] if analysis.candidates else None
    (SEED_DIR / "index.json").write_text(
        json.dumps(
            [
                {
                    "id": DEMO_ID,
                    "candidate_count": len(analysis.candidates),
                    "top_sha": top.commit_sha if top else None,
                    "top_score": top.score if top else None,
                }
            ]
        ),
        encoding="utf-8",
    )
    print(f"seeded {SEED_DIR} with {len(analysis.candidates)} candidate(s)")


if __name__ == "__main__":
    main()
