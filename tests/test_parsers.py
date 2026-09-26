"""P2/P8 tests: Python + TypeScript adapters, registry routing."""

from rootline_core.parsers.base import Import, Symbol
from rootline_core.parsers.python_lang import PythonAdapter
from rootline_core.parsers.registry import adapter_for
from rootline_core.parsers.ts_lang import TypeScriptAdapter

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
    assert isinstance(adapter_for("src/app.ts"), TypeScriptAdapter)
    assert isinstance(adapter_for("src/view.tsx"), TypeScriptAdapter)
    assert isinstance(adapter_for("src/legacy.js"), TypeScriptAdapter)
    assert adapter_for("Makefile") is None


TS_SOURCE = b"""import os from "os";
import { a, b as c } from "./mod";
export * from "./shared";

export function foo(x: number): number {
  return x;
}

export class Bar {
  method() {}
}

const arrow = async (y: string) => y;

function* gen() {
  yield 1;
}
"""

TS_ADAPTER = TypeScriptAdapter()


def test_typescript_symbols_in_order() -> None:
    assert TS_ADAPTER.symbols(TS_SOURCE) == [
        Symbol(name="foo", kind="function"),
        Symbol(name="Bar", kind="class"),
        Symbol(name="method", kind="function"),
        Symbol(name="arrow", kind="function"),
        Symbol(name="gen", kind="function"),
    ]


def test_typescript_imports_capture_modules_and_names() -> None:
    assert TS_ADAPTER.imports(TS_SOURCE) == [
        Import(module="os", names=("os",)),
        Import(module="./mod", names=("a", "b")),
        Import(module="./shared", names=()),
    ]


def test_typescript_empty_source_yields_nothing() -> None:
    assert TS_ADAPTER.symbols(b"") == []
    assert TS_ADAPTER.imports(b"") == []
