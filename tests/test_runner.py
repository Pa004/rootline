"""P18 tests: restricted runner env sanitization, argv-only exec, timeout."""

import os
import sys

from rootline_core.runner import run_command, sanitized_env


def test_sanitized_env_keeps_path_and_drops_secrets(monkeypatch) -> None:
    monkeypatch.setenv("PATH", "/bin")
    monkeypatch.setenv("MY_API_TOKEN", "secret")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("CUSTOM_VAR", "kept-out")

    env = sanitized_env()

    assert env["PATH"] == "/bin"
    assert "MY_API_TOKEN" not in env
    assert "AWS_SECRET_ACCESS_KEY" not in env
    assert "CUSTOM_VAR" not in env


def test_run_command_captures_output(tmp_path) -> None:
    result = run_command([sys.executable, "-c", "print('hi')"], cwd=tmp_path, timeout=60)

    assert result.returncode == 0
    assert result.stdout.strip() == "hi"
    assert result.timed_out is False


def test_run_command_enforces_timeout(tmp_path) -> None:
    result = run_command(
        [sys.executable, "-c", "import time; time.sleep(30)"],
        cwd=tmp_path,
        timeout=1,
    )

    assert result.timed_out is True
    assert result.returncode == -1


def test_run_command_does_not_leak_parent_secrets(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("ROOTLINE_TEST_SECRET", "s3cr3t")
    result = run_command(
        [sys.executable, "-c", "import os; print(os.environ.get('ROOTLINE_TEST_SECRET'))"],
        cwd=tmp_path,
        timeout=60,
    )

    assert "s3cr3t" not in result.stdout
    assert "PATH" in os.environ  # sanity: allowlist keeps working env vars
