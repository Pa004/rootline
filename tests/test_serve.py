"""P20 tests: `rootline serve` boots and answers (local API)."""

import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

PORT = 8123


def _wait_up(url: str, timeout: float = 60.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                return response.status == 200
        except OSError:
            time.sleep(1.0)
    return False


def test_serve_boots_and_serves_docs(tmp_path: Path) -> None:
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "rootline",
            "serve",
            "--port",
            str(PORT),
            "--store-dir",
            str(tmp_path / "store"),
        ],
        cwd=tmp_path,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        assert _wait_up(f"http://127.0.0.1:{PORT}/docs"), "server did not boot"
        with urllib.request.urlopen(
            f"http://127.0.0.1:{PORT}/api/v1/analyses/nope", timeout=10
        ) as response:
            raise AssertionError(f"expected 404, got {response.status}")
    except urllib.error.HTTPError as exc:
        assert exc.code == 404
    finally:
        proc.terminate()
        proc.wait(timeout=30)
