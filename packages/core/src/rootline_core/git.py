"""Git history ingestion (FR-002). Read-only; never mutates the repository."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from git import Commit, Repo
from git.exc import BadName, GitCommandError

DEFAULT_BASELINE = "HEAD~50"
DEFAULT_MAX_COMMITS = 50
DEFAULT_MAX_FILES = 500


@dataclass(frozen=True)
class FileChange:
    path: str
    insertions: int
    deletions: int


@dataclass(frozen=True)
class CommitInfo:
    sha: str
    author: str
    timestamp: int
    message: str
    parent_shas: tuple[str, ...]
    files: tuple[FileChange, ...]


@dataclass(frozen=True)
class HistoryWindow:
    baseline: str = DEFAULT_BASELINE
    max_commits: int = DEFAULT_MAX_COMMITS
    max_files: int = DEFAULT_MAX_FILES


def open_repo(path: str | Path) -> Repo:
    return Repo(path, search_parent_directories=True)


def is_shallow(repo: Repo) -> bool:
    return (Path(repo.git_dir) / "shallow").exists()


def list_commits(repo: Repo, window: HistoryWindow) -> list[CommitInfo]:
    try:
        raw: list[Commit] = list(
            repo.iter_commits(f"{window.baseline}..HEAD", max_count=window.max_commits)
        )
    except (BadName, GitCommandError):
        raw = list(repo.iter_commits("HEAD", max_count=window.max_commits))
    if not raw:
        raw = list(repo.iter_commits("HEAD", max_count=window.max_commits))
    return [_to_commit_info(commit, window.max_files) for commit in raw]


def _to_commit_info(commit: Commit, max_files: int) -> CommitInfo:
    stats = commit.stats.files
    files = tuple(
        FileChange(
            path=str(path),
            insertions=int(entry.get("insertions", 0)),
            deletions=int(entry.get("deletions", 0)),
        )
        for path, entry in list(stats.items())[:max_files]
    )
    raw_message = commit.message
    if isinstance(raw_message, bytes):
        raw_message = raw_message.decode("utf-8", "replace")
    message = raw_message
    return CommitInfo(
        sha=commit.hexsha,
        author=f"{commit.author.name} <{commit.author.email}>",
        timestamp=commit.committed_date,
        message=message.strip(),
        parent_shas=tuple(parent.hexsha for parent in commit.parents),
        files=files,
    )
