"""Root pytest fixtures: expose the worker lite module (stdlib-only)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "workers" / "api" / "src"))
