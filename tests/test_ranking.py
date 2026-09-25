"""P4 tests: ranking orders the culprit first with inspectable breakdown."""

from pathlib import Path

from git import Repo
from rootline_core.config import DEFAULT_WEIGHTS, load_weights
from rootline_core.explain import explain
from rootline_core.export import to_csv, to_json
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import TestResult as JunitResult
from rootline_core.ranking import build_analysis

USERS = "from app.db import get_db\n\n\ndef create_user(name):\n    return get_db(name)\n"
DB_V1 = "def get_db(name):\n    return name\n"
DB_V2 = "def get_db(name):\n    return None\n"
TESTS = (
    "from app.users import create_user\n\n\ndef test_create_user():\n    assert create_user('a')\n"
)


def _repo(path: Path) -> None:
    repo = Repo.init(path, initial_branch="main")
    with repo.config_writer() as config:
        config.set_value("user", "name", "Rootline Test")
        config.set_value("user", "email", "test@rootline.dev")
    (path / "app").mkdir()
    (path / "tests").mkdir()
    (path / "app" / "db.py").write_text(DB_V1, encoding="utf-8")
    (path / "app" / "users.py").write_text(USERS, encoding="utf-8")
    (path / "tests" / "test_users.py").write_text(TESTS, encoding="utf-8")
    repo.index.add(["app/db.py", "app/users.py", "tests/test_users.py"])
    repo.index.commit("add users module and tests")
    (path / "app" / "db.py").write_text(DB_V2, encoding="utf-8")
    repo.index.add(["app/db.py"])
    repo.index.commit("tweak create user lookup")
    (path / "README.md").write_text("docs\n", encoding="utf-8")
    repo.index.add(["README.md"])
    repo.index.commit("update docs")


def _analysis(tmp_path: Path):
    _repo(tmp_path)
    repo = open_repo(tmp_path)
    commits = list_commits(repo, HistoryWindow(baseline="HEAD~2", max_commits=10))
    assert [c.message for c in commits] == ["update docs", "tweak create user lookup"]
    results = [
        JunitResult(
            name="test_create_user",
            classname="",
            file="tests/test_users.py",
            outcome="failed",
            message="",
            duration=0.1,
        ),
        JunitResult(
            name="test_db_ok",
            classname="",
            file="app/db.py",
            outcome="passed",
            message="",
            duration=0.1,
        ),
    ]
    graph = build_evidence_graph(commits, results, repo_root=tmp_path)
    return build_analysis(graph, commits, results)


def test_culprit_ranked_first_with_full_breakdown(tmp_path: Path) -> None:
    analysis = _analysis(tmp_path)
    top, second = analysis.candidates

    assert top.message == "tweak create user lookup"
    assert second.message == "update docs"
    assert top.score > second.score > 0
    kinds = {e.kind for e in top.evidence}
    assert kinds == {"structural", "test", "semantic", "contradiction"}
    assert top.score == round(sum(e.points for e in top.evidence), 4)


def test_explain_and_export(tmp_path: Path) -> None:
    analysis = _analysis(tmp_path)
    text = explain(analysis.candidates[0], ["test_create_user"])

    assert "Most probable cause" in text
    assert "+ [structural]" in text
    assert "Contradictory evidence" in text
    assert "Revert commit" in text
    assert '"schema_version": "1.0"' in to_json(analysis)
    assert to_csv(analysis).splitlines()[0] == "commit_sha,short_sha,message,score"


def test_load_weights_override(tmp_path: Path) -> None:
    toml_path = tmp_path / "rootline.toml"
    toml_path.write_text("[weights]\ntemporal = 0.5\n", encoding="utf-8")

    assert load_weights(None) == DEFAULT_WEIGHTS
    assert load_weights(toml_path).temporal == 0.5
    assert load_weights(toml_path).structural == DEFAULT_WEIGHTS.structural
