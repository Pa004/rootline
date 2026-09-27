"""P17 tests: MCP tool functions over the corpus repo (no session needed)."""

from pathlib import Path

from rootline_core.corpus import materialize_regression_01
from rootline_mcp.tools import blast_radius_for_commit, explain_candidate, rank_causes


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    materialize_regression_01(repo)
    return repo


def test_rank_causes_top_is_culprit(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    analysis = rank_causes(str(repo), str(repo / "results.xml"))

    assert analysis["schema_version"] == "1.0"
    assert analysis["candidates"][0]["message"] == "tweak create user lookup"


def test_explain_candidate_and_unknown_sha(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    analysis = rank_causes(str(repo), str(repo / "results.xml"))
    sha = analysis["candidates"][0]["commit_sha"]

    text = explain_candidate(analysis, sha[:12], ["test_create_user"])
    assert "Most probable cause" in text
    assert "test_create_user" in text
    assert explain_candidate(analysis, "0" * 40).startswith("Unknown candidate")


def test_blast_radius_lists_changed_file(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    analysis = rank_causes(str(repo), str(repo / "results.xml"))
    sha = analysis["candidates"][0]["commit_sha"]

    blast = blast_radius_for_commit(str(repo), sha)
    assert "app/db.py" in blast["changed_files"]
    assert "app/users.py" in blast["dependent_files"]
