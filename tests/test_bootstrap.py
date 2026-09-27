"""Rootline bootstrap smoke tests (P0)."""

import rootline_cli
import rootline_core


def test_packages_importable() -> None:
    assert rootline_core.__version__ == "0.2.0"
    assert rootline_cli.__version__ == "0.2.0"
