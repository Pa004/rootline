"""Restricted subprocess runner for `verify --command` (spec §18).

Hard rules: argv list only (never shell=True), working directory pinned
to the throwaway worktree, timeout enforced, and the environment is
rebuilt from an allowlist with secret-looking variables stripped.
This is harm reduction for local opt-in runs — not a sandbox.
Untrusted code still must not run without explicit user consent.
"""

from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

SECRET_HINTS = (
    "TOKEN",
    "SECRET",
    "PASSWORD",
    "PASSWD",
    "API_KEY",
    "PRIVATE_KEY",
    "AWS_",
    "GH_",
    "GITHUB_",
    "OPENAI_",
    "ANTHROPIC_",
)

ALLOWLIST = frozenset(
    {
        "PATH",
        "PATHEXT",
        "SYSTEMROOT",
        "SYSTEMDRIVE",
        "WINDIR",
        "TEMP",
        "TMP",
        "HOME",
        "USERPROFILE",
        "LANG",
        "LC_ALL",
        "TZ",
        "PYTHONUTF8",
        "PYTHONIOENCODING",
    }
)


@dataclass(frozen=True)
class RunResult:
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool


def sanitized_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if k in ALLOWLIST}
    for key in list(env):
        if any(hint in key.upper() for hint in SECRET_HINTS):
            del env[key]
    if extra:
        env.update(extra)
    return env


def run_command(argv: list[str], cwd: str | Path, timeout: int) -> RunResult:
    try:
        completed = subprocess.run(
            argv,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=sanitized_env(),
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        return RunResult(
            returncode=-1,
            stdout=_decode(exc.stdout),
            stderr=_decode(exc.stderr),
            timed_out=True,
        )
    return RunResult(
        returncode=completed.returncode,
        stdout=completed.stdout,
        stderr=completed.stderr,
        timed_out=False,
    )


def _decode(value: bytes | str | None) -> str:
    if value is None:
        return ""
    return value.decode("utf-8", "replace") if isinstance(value, bytes) else value
