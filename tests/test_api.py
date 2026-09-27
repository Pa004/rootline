"""P7 tests: API create/get/candidates/graph/evidence over the corpus repo."""

from pathlib import Path

from fastapi.testclient import TestClient
from rootline_api.app import create_app
from rootline_core.corpus import materialize_regression_01


def _client(tmp_path: Path) -> tuple[TestClient, str, str]:
    repo = tmp_path / "repo"
    truth = materialize_regression_01(repo)
    client = TestClient(create_app(tmp_path / "store"))
    created = client.post(
        "/api/v1/analyses",
        json={"repo": str(repo), "test_results": str(repo / "results.xml")},
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["candidate_count"] == 2
    return client, body["id"], truth["culprit_message"]


def test_full_flow_candidates_graph_evidence(tmp_path: Path) -> None:
    client, analysis_id, culprit = _client(tmp_path)

    full = client.get(f"/api/v1/analyses/{analysis_id}")
    assert full.status_code == 200
    assert full.json()["schema_version"] == "1.0"

    page1 = client.get(f"/api/v1/analyses/{analysis_id}/candidates", params={"limit": 1})
    assert page1.status_code == 200
    assert page1.json()["items"][0]["message"] == culprit
    cursor = page1.json()["next_cursor"]
    assert cursor is not None
    page2 = client.get(
        f"/api/v1/analyses/{analysis_id}/candidates", params={"limit": 1, "cursor": cursor}
    )
    assert len(page2.json()["items"]) == 1
    assert page2.json()["next_cursor"] is None

    graph = client.get(f"/api/v1/analyses/{analysis_id}/graph", params={"limit": 200})
    assert graph.status_code == 200
    kinds = {e["kind"] for e in graph.json()["edges"]}
    assert {"changes", "depends", "fails"} <= kinds

    sha = page1.json()["items"][0]["commit_sha"]
    evidence = client.get(f"/api/v1/analyses/{analysis_id}/evidence/{sha[:12]}")
    assert evidence.status_code == 200
    assert evidence.json()["commit_sha"] == sha


def test_unknown_ids_return_404(tmp_path: Path) -> None:
    client = TestClient(create_app(tmp_path / "store"))

    assert client.get("/api/v1/analyses/nope").status_code == 404
    assert client.get("/api/v1/analyses/nope/candidates").status_code == 404
    assert client.get("/api/v1/analyses/nope/graph").status_code == 404
    assert client.get("/api/v1/analyses/nope/evidence/abc").status_code == 404


def test_bad_repo_returns_400(tmp_path: Path) -> None:
    client = TestClient(create_app(tmp_path / "store"))
    created = client.post("/api/v1/analyses", json={"repo": str(tmp_path / "missing")})

    assert created.status_code == 400


def test_cors_allows_dashboard_origin(tmp_path: Path) -> None:
    client, analysis_id, _ = _client(tmp_path)
    response = client.get(
        f"/api/v1/analyses/{analysis_id}",
        headers={"Origin": "https://rootline-73m.pages.dev"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
