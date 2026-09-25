"""Filesystem store for analyses and their graphs (local full mode)."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import cast

import networkx as nx
from rootline_core.graph import EvidenceGraph
from rootline_core.ranking import Analysis


class UnknownAnalysisError(KeyError):
    pass


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
