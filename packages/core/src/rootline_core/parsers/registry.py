"""Extension-to-adapter registry (Python + TypeScript/JavaScript)."""

from __future__ import annotations

from collections.abc import Callable
from functools import partial
from pathlib import Path

from rootline_core.parsers.base import LanguageAdapter
from rootline_core.parsers.python_lang import PythonAdapter
from rootline_core.parsers.ts_lang import TypeScriptAdapter

_PYTHON = PythonAdapter()
_TS = partial(TypeScriptAdapter, "typescript")
_TSX = partial(TypeScriptAdapter, "tsx")


def _python_factory() -> LanguageAdapter:
    return _PYTHON


_FACTORIES: dict[str, Callable[[], LanguageAdapter]] = {
    "py": _python_factory,
    "pyi": _python_factory,
    "ts": _TS,
    "mts": _TS,
    "cts": _TS,
    "tsx": _TSX,
    "js": _TS,
    "mjs": _TS,
    "cjs": _TS,
    "jsx": _TSX,
}
_CACHE: dict[str, LanguageAdapter] = {}


def adapter_for(path: str | Path) -> LanguageAdapter | None:
    key = Path(path).suffix.lstrip(".").lower()
    factory = _FACTORIES.get(key)
    if factory is None:
        return None
    if key not in _CACHE:
        _CACHE[key] = factory()
    return _CACHE[key]
