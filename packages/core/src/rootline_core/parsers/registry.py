"""Extension-to-adapter registry. Only Python in MVP; TS/JS arrive next."""

from __future__ import annotations

from pathlib import Path

from rootline_core.parsers.base import LanguageAdapter
from rootline_core.parsers.python_lang import PythonAdapter

_ADAPTERS: dict[str, LanguageAdapter] = {
    "py": PythonAdapter(),
    "pyi": PythonAdapter(),
}


def adapter_for(path: str | Path) -> LanguageAdapter | None:
    return _ADAPTERS.get(Path(path).suffix.lstrip(".").lower())
