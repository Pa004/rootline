"""Analysis stores for local full mode: files (default) or SQLite.

Select with the store path: a ``.db``/``.sqlite3`` suffix uses SQLite,
anything else a directory of JSON files. Same interface, no new deps
(sqlite3 is stdlib).
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path
from typing import cast

import networkx as nx
from rootline_core.graph import EvidenceGraph
from rootline_core.ranking import Analysis


class UnknownAnalysisError(KeyError):
    pass


def open_store(path: str | Path) -> FileStore | SQLiteStore:
    text = str(path)
    if text.endswith(".db") or text.endswith(".sqlite3"):
        return SQLiteStore(text)
    return FileStore(text)


class FileStore:
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, analysis: Analysis, graph: EvidenceGraph) -> str:
        analysis_id = uuid.uuid4().hex
        (self.root / f"{analysis_id}.json").write_text(
            analysis.model_dump_json(indent=2), encoding="utf-8"
        )
        (self.root / f"{analysis_id}.graph.json").write_text(
            json.dumps(nx.node_link_data(graph, edges="edges", nodes="nodes")),
            encoding="utf-8",
        )
        return analysis_id

    def load_analysis(self, analysis_id: str) -> Analysis:
        path = self._path(f"{analysis_id}.json")
        return Analysis.model_validate_json(path.read_text(encoding="utf-8"))

    def load_graph(self, analysis_id: str) -> EvidenceGraph:
        path = self._path(f"{analysis_id}.graph.json")
        data = json.loads(path.read_text(encoding="utf-8"))
        return cast(EvidenceGraph, nx.node_link_graph(data, edges="edges", nodes="nodes"))

    def _path(self, name: str) -> Path:
        path = self.root / name
        if not path.is_file():
            raise UnknownAnalysisError(name)
        return path


class SQLiteStore:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS analyses"
                " (id TEXT PRIMARY KEY, analysis_json TEXT NOT NULL,"
                " graph_json TEXT NOT NULL)"
            )

    def save(self, analysis: Analysis, graph: EvidenceGraph) -> str:
        analysis_id = uuid.uuid4().hex
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                "INSERT INTO analyses (id, analysis_json, graph_json) VALUES (?, ?, ?)",
                (
                    analysis_id,
                    analysis.model_dump_json(),
                    json.dumps(nx.node_link_data(graph, edges="edges", nodes="nodes")),
                ),
            )
        return analysis_id

    def load_analysis(self, analysis_id: str) -> Analysis:
        return Analysis.model_validate_json(self._column(analysis_id, "analysis_json"))

    def load_graph(self, analysis_id: str) -> EvidenceGraph:
        data = json.loads(self._column(analysis_id, "graph_json"))
        return cast(EvidenceGraph, nx.node_link_graph(data, edges="edges", nodes="nodes"))

    def _column(self, analysis_id: str, column: str) -> str:
        with sqlite3.connect(self.path) as connection:
            row = connection.execute(
                f"SELECT {column} FROM analyses WHERE id = ?", (analysis_id,)
            ).fetchone()
        if row is None:
            raise UnknownAnalysisError(analysis_id)
        return str(row[0])
