"""TypeScript/JavaScript adapter over tree-sitter (imports + def/class symbols)."""

from __future__ import annotations

from tree_sitter import Node
from tree_sitter_language_pack import get_parser

from rootline_core.parsers.base import Import, LanguageAdapter, Symbol

_FUNCTION_TYPES = frozenset({"function_declaration", "generator_function_declaration"})


def _text(node: Node, source: bytes) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", "replace")


def _name(node: Node, source: bytes) -> str | None:
    named = node.child_by_field_name("name")
    if named is None:
        wanted = ("identifier", "type_identifier")
        named = next((c for c in node.children if c.is_named and c.type in wanted), None)
    return _text(named, source) if named is not None else None


def _module_fragment(node: Node, source: bytes) -> str | None:
    fragment = next(
        (
            c
            for c in node.children
            if c.type == "string"
            for c in c.children
            if c.type == "string_fragment"
        ),
        None,
    )
    return _text(fragment, source) if fragment is not None else None


class TypeScriptAdapter(LanguageAdapter):
    language = "typescript"

    def __init__(self, parser_name: str = "typescript") -> None:
        self._parser = get_parser(parser_name)

    def symbols(self, source: bytes) -> list[Symbol]:
        found: list[Symbol] = []
        self._collect(self._parser.parse(source).root_node, source, found)
        return found

    def _collect(self, node: Node, source: bytes, found: list[Symbol]) -> None:
        if node.type in _FUNCTION_TYPES:
            name = _name(node, source)
            if name is not None:
                found.append(Symbol(name=name, kind="function"))
        elif node.type == "class_declaration":
            name = _name(node, source)
            if name is not None:
                found.append(Symbol(name=name, kind="class"))
        elif node.type == "method_definition":
            prop = next((c for c in node.children if c.type == "property_identifier"), None)
            if prop is not None:
                found.append(Symbol(name=_text(prop, source), kind="function"))
        elif node.type == "variable_declarator":
            self._collect_declarator(node, source, found)
        for child in node.children:
            self._collect(child, source, found)

    def _collect_declarator(self, node: Node, source: bytes, found: list[Symbol]) -> None:
        name_node = node.child_by_field_name("name")
        value = node.child_by_field_name("value")
        if (
            name_node is not None
            and value is not None
            and value.type in ("arrow_function", "function_expression")
        ):
            found.append(Symbol(name=_text(name_node, source), kind="function"))

    def imports(self, source: bytes) -> list[Import]:
        found: list[Import] = []
        self._collect_imports(self._parser.parse(source).root_node, source, found)
        return found

    def _collect_imports(self, node: Node, source: bytes, found: list[Import]) -> None:
        if node.type == "import_statement":
            module = _module_fragment(node, source)
            if module is not None:
                found.append(Import(module=module, names=tuple(self._binding_names(node, source))))
        elif node.type == "export_statement":
            module = _module_fragment(node, source)
            if module is not None:
                found.append(Import(module=module, names=()))
        else:
            for child in node.children:
                self._collect_imports(child, source, found)

    def _binding_names(self, node: Node, source: bytes) -> list[str]:
        names: list[str] = []
        for child in node.children:
            if child.type == "import_clause":
                names.extend(self._clause_names(child, source))
        return names

    def _clause_names(self, clause: Node, source: bytes) -> list[str]:
        names: list[str] = []
        for child in clause.children:
            if child.type == "identifier":
                names.append(_text(child, source))
            elif child.type == "named_imports":
                names.extend(self._specifier_names(child, source))
        return names

    def _specifier_names(self, named: Node, source: bytes) -> list[str]:
        names: list[str] = []
        for spec in named.children:
            if spec.type != "import_specifier":
                continue
            first = next((c for c in spec.children if c.type == "identifier"), None)
            if first is not None:
                names.append(_text(first, source))
        return names
