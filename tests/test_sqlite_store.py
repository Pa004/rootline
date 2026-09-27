"""P22 tests: SQLite store roundtrip and selection."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from rootline_api.app import create_app
from rootline_api.store import (
    FileStore,
    SQLiteStore,
    UnknownAnalysisError,
    open_store,
)
from rootline_core.corpus import materialize_regression_01
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files
from rootline_core.ranking import build_analysis


def _analysis_and_graph(tmp_path: Path):
    repo = tmp_path / "repo"
    materialize_regression_01(repo)
    git_repo = open_repo(repo)
    try:
        commits = list_commits(git_repo, HistoryWindow(baseline="HEAD~50", max_commits=50))
        results = resolve_files(parse_junit(repo / "results.xml"), repo)
        graph = build_evidence_graph(commits, results, repo_root=repo)
        return build_analysis(graph, commits, results), graph
    finally:
        git_repo.close()


def test_open_store_selects_backend_by_suffix(tmp_path: Path) -> None:
    assert isinstance(open_store(tmp_path / "store.db"), SQLiteStore)
    assert isinstance(open_store(tmp_path / "store.sqlite3"), SQLiteStore)
    assert isinstance(open_store(tmp_path / "store"), FileStore)


def test_sqlite_roundtrip_and_unknown_id(tmp_path: Path) -> None:
    analysis, graph = _analysis_and_graph(tmp_path)
    store = SQLiteStore(tmp_path / "store.db")

    analysis_id = store.save(analysis, graph)

    assert store.load_analysis(analysis_id).candidates[0].message == "tweak create user lookup"
    assert store.load_graph(analysis_id).number_of_nodes() > 0
    with pytest.raises(UnknownAnalysisError):
        store.load_analysis("missing")


def test_full_flow_over_sqlite_store(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    materialize_regression_01(repo)
    client = TestClient(create_app(tmp_path / "store.db"))
    created = client.post(
        "/api/v1/analyses",
        json={"repo": str(repo), "test_results": str(repo / "results.xml")},
    )

    assert created.status_code == 200, created.text
    analysis_id = created.json()["id"]
    fetched = client.get(f"/api/v1/analyses/{analysis_id}")

    assert fetched.status_code == 200
    assert fetched.json()["candidates"][0]["message"] == "tweak create user lookup"
