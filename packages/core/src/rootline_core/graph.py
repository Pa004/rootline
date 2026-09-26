"""Evidence graph construction (FR-005).

Nodes: commit / file / symbol / test.
Edges: changes (commit→file), contains (file→symbol),
fails/covers (test→file), depends (file→file).

Structure (symbols, imports) is read from the working tree at HEAD.
Known MVP limitation: past renames or deleted files only appear as
change edges, without content structure.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import networkx as nx

from rootline_core.git import CommitInfo
from rootline_core.junit import OUTCOME_ERROR, OUTCOME_FAILED, TestResult
from rootline_core.parsers.base import Import
from rootline_core.parsers.registry import adapter_for

FAILING_OUTCOMES = frozenset({OUTCOME_FAILED, OUTCOME_ERROR})
IGNORED_PARTS = frozenset({".git", ".venv", "__pycache__", "node_modules"})
SOURCE_GLOBS = ("*.py", "*.pyi", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs")
STRIP_SUFFIXES = (".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs")

if TYPE_CHECKING:
    EvidenceGraph = nx.DiGraph[str, dict[str, str], dict[str, str]]
else:
    EvidenceGraph = nx.DiGraph


def commit_node(sha: str) -> str:
    return f"commit:{sha}"


def file_node(path: str) -> str:
    return f"file:{path}"


def symbol_node(path: str, name: str) -> str:
    return f"symbol:{path}::{name}"


def test_node(classname: str, name: str) -> str:
    return f"test:{classname}::{name}"


def build_evidence_graph(
    commits: list[CommitInfo],
    results: list[TestResult],
    repo_root: str | Path | None = None,
) -> EvidenceGraph:
    graph: EvidenceGraph = nx.DiGraph()
    for commit in commits:
        cid = commit_node(commit.sha)
        graph.add_node(cid, type="commit", message=commit.message)
        for changed in commit.files:
            fid = file_node(changed.path)
            graph.add_node(fid, type="file", path=changed.path)
            graph.add_edge(cid, fid, kind="changes")
    for result in results:
        tid = test_node(result.classname, result.name)
        graph.add_node(tid, type="test", outcome=result.outcome, name=result.name)
        if result.file:
            fid = file_node(result.file)
            graph.add_node(fid, type="file", path=result.file)
            kind = "fails" if result.outcome in FAILING_OUTCOMES else "covers"
            graph.add_edge(tid, fid, kind=kind)
    if repo_root is not None:
        _add_structure(graph, Path(repo_root))
    return graph


def _add_structure(graph: EvidenceGraph, root: Path) -> None:
    sources = sorted(
        p
        for glob in SOURCE_GLOBS
        for p in root.rglob(glob)
        if not any(part in IGNORED_PARTS for part in p.parts)
    )
    stems: dict[str, list[str]] = {}
    for path in sources:
        rel = path.relative_to(root).as_posix()
        stems.setdefault(path.stem, []).append(rel)
    for path in sources:
        rel = path.relative_to(root).as_posix()
        adapter = adapter_for(path)
        if adapter is None:
            continue
        source = path.read_bytes()
        fid = file_node(rel)
        if fid not in graph:
            graph.add_node(fid, type="file", path=rel)
        for symbol in adapter.symbols(source):
            graph.add_node(
                symbol_node(rel, symbol.name),
                type="symbol",
                kind=symbol.kind,
            )
            graph.add_edge(fid, symbol_node(rel, symbol.name), kind="contains")
        for imp in adapter.imports(source):
            for target in _resolve_targets(imp, stems, exclude=rel):
                graph.add_edge(fid, file_node(target), kind="depends")


def _resolve_targets(imp: Import, stems: dict[str, list[str]], exclude: str) -> list[str]:
    found: list[str] = []
    candidates = [_module_stem(imp.module)] if imp.module else []
    candidates.extend(_module_stem(n) for n in imp.names)
    for stem in candidates:
        for target in stems.get(stem, []):
            if target != exclude and target not in found:
                found.append(target)
    return sorted(found)


def _module_stem(module: str) -> str:
    """Last path segment without extension: './mod' → 'mod', 'a.b' → 'b'."""
    base = module.split("/")[-1]
    for suffix in STRIP_SUFFIXES:
        if base.endswith(suffix) and len(base) > len(suffix):
            return base[: -len(suffix)]
    return base.split(".")[-1]
