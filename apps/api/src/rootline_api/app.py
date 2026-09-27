"""Rootline API (spec §16). Local full mode; demo caps arrive with deploy."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from rootline_core.pipeline import run_analysis
from rootline_core.ranking import CandidateScore

from rootline_api.store import FileStore, UnknownAnalysisError

DEFAULT_LIMIT = 50


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    repo: str
    test_results: str | None = None
    baseline: str = "HEAD~50"
    max_commits: int = 50
    max_files: int = 500
    config: str | None = None


class AnalysisCreated(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    candidate_count: int
    top_sha: str | None
    top_score: float | None


class CandidatePage(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: list[CandidateScore]
    next_cursor: str | None


class GraphPage(BaseModel):
    model_config = ConfigDict(frozen=True)

    nodes: list[dict[str, str]]
    edges: list[dict[str, str]]
    next_cursor: str | None


def create_app(store_dir: str | Path | None = None) -> FastAPI:
    store = FileStore(store_dir or Path(os.environ.get("ROOTLINE_STORE", "analyses")))
    app = FastAPI(title="Rootline API")
    # Local-first dev tool without secrets; the web dashboard calls it cross-origin.
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"])
    app.state.store = store

    def _store(request: Request) -> FileStore:
        store = request.app.state.store
        assert isinstance(store, FileStore)
        return store

    @app.post("/api/v1/analyses", response_model=AnalysisCreated)
    def create_analysis(body: AnalysisRequest, request: Request) -> AnalysisCreated:
        try:
            run = run_analysis(
                body.repo,
                body.test_results,
                body.baseline,
                body.max_commits,
                body.max_files,
                body.config,
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        analysis_id = _store(request).save(run.analysis, run.graph)
        top = run.analysis.candidates[0] if run.analysis.candidates else None
        return AnalysisCreated(
            id=analysis_id,
            candidate_count=len(run.analysis.candidates),
            top_sha=top.commit_sha if top else None,
            top_score=top.score if top else None,
        )

    @app.get("/api/v1/analyses/{analysis_id}")
    def get_analysis(analysis_id: str, request: Request) -> dict[str, object]:
        try:
            analysis = _store(request).load_analysis(analysis_id)
        except UnknownAnalysisError as exc:
            raise HTTPException(status_code=404, detail="Unknown analysis.") from exc
        return analysis.model_dump(mode="json")

    @app.get("/api/v1/analyses/{analysis_id}/candidates", response_model=CandidatePage)
    def get_candidates(
        analysis_id: str, request: Request, limit: int = DEFAULT_LIMIT, cursor: str = "0"
    ) -> CandidatePage:
        try:
            candidates = _store(request).load_analysis(analysis_id).candidates
        except UnknownAnalysisError as exc:
            raise HTTPException(status_code=404, detail="Unknown analysis.") from exc
        items, next_cursor = _page(candidates, limit, cursor)
        return CandidatePage(items=items, next_cursor=next_cursor)

    @app.get("/api/v1/analyses/{analysis_id}/graph", response_model=GraphPage)
    def get_graph(
        analysis_id: str, request: Request, limit: int = DEFAULT_LIMIT, cursor: str = "0"
    ) -> GraphPage:
        try:
            graph = _store(request).load_graph(analysis_id)
        except UnknownAnalysisError as exc:
            raise HTTPException(status_code=404, detail="Unknown analysis.") from exc
        nodes = [{"id": n, **{k: str(v) for k, v in graph.nodes[n].items()}} for n in graph.nodes]
        edges = [
            {"source": str(u), "target": str(v), **{k: str(x) for k, x in d.items()}}
            for u, v, d in graph.edges(data=True)
        ]
        node_items, node_cursor = _page(nodes, limit, cursor)
        edge_items, _ = _page(edges, limit, cursor)
        return GraphPage(nodes=node_items, edges=edge_items, next_cursor=node_cursor)

    @app.get("/api/v1/analyses/{analysis_id}/evidence/{sha}")
    def get_evidence(analysis_id: str, sha: str, request: Request) -> dict[str, object]:
        try:
            candidates = _store(request).load_analysis(analysis_id).candidates
        except UnknownAnalysisError as exc:
            raise HTTPException(status_code=404, detail="Unknown analysis.") from exc
        match = next((c for c in candidates if c.commit_sha.startswith(sha)), None)
        if match is None:
            raise HTTPException(status_code=404, detail="Unknown candidate.")
        return match.model_dump(mode="json")

    return app


def _page[T](items: list[T], limit: int, cursor: str) -> tuple[list[T], str | None]:
    try:
        offset = max(int(cursor), 0)
    except ValueError:
        offset = 0
    window = items[offset : offset + max(limit, 1)]
    rest = offset + max(limit, 1)
    return window, (str(rest) if rest < len(items) else None)
