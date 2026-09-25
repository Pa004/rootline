"""P1 tests: Git history ingestion over a synthetic repository."""

from pathlib import Path

from git import Repo
from rootline_core.git import HistoryWindow, is_shallow, list_commits, open_repo


def _make_repo(path: Path) -> Repo:
    repo = Repo.init(path, initial_branch="main")
    with repo.config_writer() as config:
        config.set_value("user", "name", "Rootline Test")
        config.set_value("user", "email", "test@rootline.dev")
    commits = [
        ("a.txt", "one\n", "commit one"),
        ("b.txt", "two\n", "commit two"),
        ("a.txt", "one\nthree\n", "commit three"),
    ]
    for filename, content, message in commits:
        (path / filename).write_text(content, encoding="utf-8")
        repo.index.add([filename])
        repo.index.commit(message)
    return repo


def test_list_commits_newest_first(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    found = list_commits(repo, HistoryWindow(baseline="HEAD~50", max_commits=50))

    assert [c.message for c in found] == ["commit three", "commit two", "commit one"]
    assert found[0].parent_shas == (found[1].sha,)
    assert found[2].parent_shas == ()
    assert len(found[0].sha) == 40
    assert found[0].timestamp > 0


def test_list_commits_reports_changed_files_and_lines(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    found = list_commits(repo, HistoryWindow(baseline="HEAD~50", max_commits=50))

    assert [(f.path, f.insertions) for f in found[0].files] == [("a.txt", 1)]
    assert [f.path for f in found[1].files] == ["b.txt"]


def test_history_window_caps_commits(tmp_path: Path) -> None:
    repo = _make_repo(tmp_path)
    found = list_commits(repo, HistoryWindow(baseline="HEAD~50", max_commits=2))

    assert [c.message for c in found] == ["commit three", "commit two"]


def test_open_repo_and_shallow_flag(tmp_path: Path) -> None:
    _make_repo(tmp_path)
    repo = open_repo(tmp_path / "a.txt")

    assert repo.working_dir is not None
    assert is_shallow(repo) is False
