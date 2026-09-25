"""P2 tests: Python adapter symbols + imports, registry routing."""

from rootline_core.parsers.base import Import, Symbol
from rootline_core.parsers.python_lang import PythonAdapter
from rootline_core.parsers.registry import adapter_for

SOURCE = b"""import os
import pkg.mod as mod
from x import y, z
from . import rel
from pkg import helper as h


def foo(a):
    return a


class Bar:
    def baz(self):
        ...
"""

ADAPTER = PythonAdapter()


def test_symbols_include_nested_definitions_in_order() -> None:
    assert ADAPTER.symbols(SOURCE) == [
        Symbol(name="foo", kind="function"),
        Symbol(name="Bar", kind="class"),
        Symbol(name="baz", kind="function"),
    ]


def test_imports_capture_modules_and_names() -> None:
    assert ADAPTER.imports(SOURCE) == [
        Import(module="os", names=()),
        Import(module="pkg.mod", names=()),
        Import(module="x", names=("y", "z")),
        Import(module="", names=("rel",)),
        Import(module="pkg", names=("helper",)),
    ]


def test_empty_source_yields_nothing() -> None:
    assert ADAPTER.symbols(b"") == []
    assert ADAPTER.imports(b"") == []


def test_registry_routes_by_extension() -> None:
    assert isinstance(adapter_for("pkg/module.py"), PythonAdapter)
    assert adapter_for("pkg/stub.pyi") is not None
    assert adapter_for("src/app.ts") is None
    assert adapter_for("Makefile") is None
