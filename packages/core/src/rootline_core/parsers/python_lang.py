"""Python adapter over tree-sitter (static imports + def/class symbols)."""

from __future__ import annotations

from tree_sitter import Node
from tree_sitter_language_pack import get_parser

from rootline_core.parsers.base import Import, LanguageAdapter, Symbol

_NAME_TYPES = ("dotted_name", "identifier")


def _text(node: Node, source: bytes) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", "replace")


def _first_named(node: Node, *types: str) -> Node | None:
    for child in node.children:
        if child.is_named and child.type in types:
            return child
    return None


def _definition_name(node: Node, source: bytes) -> str | None:
    named = node.child_by_field_name("name") or _first_named(node, "identifier")
    return _text(named, source) if named is not None else None


class PythonAdapter(LanguageAdapter):
    language = "python"

    def __init__(self) -> None:
        self._parser = get_parser("python")

    def symbols(self, source: bytes) -> list[Symbol]:
        found: list[Symbol] = []
        self._collect(self._parser.parse(source).root_node, source, found)
        return found

    def _collect(self, node: Node, source: bytes, found: list[Symbol]) -> None:
        if node.type in ("function_definition", "class_definition"):
            name = _definition_name(node, source)
            if name is not None:
                kind = "function" if node.type == "function_definition" else "class"
                found.append(Symbol(name=name, kind=kind))
        for child in node.children:
            self._collect(child, source, found)

    def imports(self, source: bytes) -> list[Import]:
        found: list[Import] = []
        self._collect_imports(self._parser.parse(source).root_node, source, found)
        return found

    def _collect_imports(self, node: Node, source: bytes, found: list[Import]) -> None:
        if node.type == "import_statement":
            for child in node.children:
                if child.type == "dotted_name":
                    found.append(Import(module=_text(child, source), names=()))
                elif child.type == "aliased_import":
                    name = _definition_name(child, source)
                    if name is not None:
                        found.append(Import(module=name, names=()))
        elif node.type == "import_from_statement":
            found.append(self._from_import(node, source))
        else:
            for child in node.children:
                self._collect_imports(child, source, found)

    def _from_import(self, node: Node, source: bytes) -> Import:
        module = ""
        names: list[str] = []
        seen_import_keyword = False
        for child in node.children:
            if child.type == "import":
                seen_import_keyword = True
            elif child.type in _NAME_TYPES and child.is_named:
                text = _text(child, source)
                if not seen_import_keyword and not module:
                    module = text
                elif seen_import_keyword:
                    names.append(text)
            elif child.type == "aliased_import" and seen_import_keyword:
                name = _definition_name(child, source)
                if name is not None:
                    names.append(name)
        return Import(module=module, names=tuple(names))
