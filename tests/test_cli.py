"""P5 tests: CLI end to end over a synthetic repository."""

from pathlib import Path

from git import Repo
from rootline_cli.cli import app
from typer.testing import CliRunner

RUNNER = CliRunner()
USERS = "from app.db import get_db\n\n\ndef create_user(name):\n    return get_db(name)\n"
DB_V1 = "def get_db(name):\n    return name\n"
DB_V2 = "def get_db(name):\n    return None\n"
TESTS = "from app.users import create_user\n"
XML = """<?xml version="1.0" encoding="utf-8"?>
<testsuite name="api" tests="2">
  <testcase classname="tests.test_users" name="test_create_user" time="0.1">
    <failure message="bad">trace</failure>
  </testcase>
  <testcase classname="tests.test_users" name="test_list_users" time="0.1" />
</testsuite>
"""


def _repo(path: Path) -> str:
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
    culprit = repo.index.commit("tweak create user lookup")
    (path / "results.xml").write_text(XML, encoding="utf-8")
    return culprit.hexsha


def _analysis(tmp_path: Path) -> Path:
    _repo(tmp_path)
    out = tmp_path / "analysis.json"
    result = RUNNER.invoke(
        app,
        [
            "analyze",
            str(tmp_path),
            "--test-results",
            str(tmp_path / "results.xml"),
            "--baseline",
            "HEAD~5",
            "--output",
            str(out),
        ],
    )
    assert result.exit_code == 1, result.output
    return out


def test_init_writes_sample_config(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    result = RUNNER.invoke(app, ["init"])

    assert result.exit_code == 0, result.output
    assert (tmp_path / "rootline.toml").read_text(encoding="utf-8").startswith("[weights]")


def test_analyze_candidates_explain_export_report(tmp_path: Path) -> None:
    out = _analysis(tmp_path)

    assert '"schema_version": "1.0"' in out.read_text(encoding="utf-8")
    for args in (
        ["candidates", str(out)],
        ["explain", str(out)],
        ["export", str(out), "--output", str(tmp_path / "a.csv")],
        ["report", str(out), "--output", str(tmp_path / "r.html")],
    ):
        result = RUNNER.invoke(app, args)
        assert result.exit_code == 0, result.output
    assert (tmp_path / "r.html").read_text(encoding="utf-8").startswith("<!doctype html>")
    assert "tweak create user lookup" in RUNNER.invoke(app, ["candidates", str(out)]).output


def test_fail_on_high_gates_exit_code(tmp_path: Path) -> None:
    _repo(tmp_path)
    out = tmp_path / "analysis.json"
    result = RUNNER.invoke(
        app,
        [
            "analyze",
            str(tmp_path),
            "--test-results",
            str(tmp_path / "results.xml"),
            "--baseline",
            "HEAD~5",
            "--output",
            str(out),
            "--fail-on",
            "high",
        ],
    )

    assert result.exit_code == 0, result.output


def test_blast_radius_and_verify_plan(tmp_path: Path) -> None:
    sha = _repo(tmp_path)
    blast = RUNNER.invoke(app, ["blast-radius", str(tmp_path), sha[:12]])

    assert blast.exit_code == 0, blast.output
    assert "app/db.py" in blast.output
    assert "app/users.py" in blast.output
    verify = RUNNER.invoke(app, ["verify", str(tmp_path), sha, "--test", "test_create_user"])

    assert verify.exit_code == 0, verify.output
    assert "Plan:" in verify.output
