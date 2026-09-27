"""Rootline demo API on Cloudflare Python Workers (read-only).

Bundle budget: fastapi + pydantic only. Data comes from the BLOB KV namespace
binding seeded by scripts/seed_demo.py. Paginated endpoints mirror
apps/api (limit/cursor) to respect the 10ms CPU / 128MB Worker limits.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from store_kv import paginate, read_index, read_json

from workers import asgi

DEFAULT_LIMIT = 50


class CandidatePage(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: list[dict[str, object]]
    next_cursor: str | None


class GraphPage(BaseModel):
    model_config = ConfigDict(frozen=True)

    nodes: list[dict[str, str]]
    edges: list[dict[str, str]]
    next_cursor: str | None


app = FastAPI(title="Rootline demo API")


def _kv(request: Request):
    return request.scope["env"].BLOB


@app.get("/api/v1/analyses")
async def list_analyses(request: Request) -> list[dict]:
    return await read_index(_kv(request))


@app.get("/api/v1/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, request: Request) -> dict:
    analysis = await read_json(_kv(request), f"analyses/{analysis_id}.json")
    if analysis is None:
        raise HTTPException(status_code=404, detail="Unknown analysis.")
    return analysis


@app.get("/api/v1/analyses/{analysis_id}/candidates", response_model=CandidatePage)
async def get_candidates(
    analysis_id: str, request: Request, limit: int = DEFAULT_LIMIT, cursor: str = "0"
) -> CandidatePage:
    analysis = await read_json(_kv(request), f"analyses/{analysis_id}.json")
    if analysis is None:
        raise HTTPException(status_code=404, detail="Unknown analysis.")
    items, next_cursor = paginate(list(analysis.get("candidates", [])), limit, cursor)
    return CandidatePage(items=items, next_cursor=next_cursor)


@app.get("/api/v1/analyses/{analysis_id}/graph", response_model=GraphPage)
async def get_graph(
    analysis_id: str, request: Request, limit: int = DEFAULT_LIMIT, cursor: str = "0"
) -> GraphPage:
    graph = await read_json(_kv(request), f"analyses/{analysis_id}.graph.json")
    if graph is None:
        raise HTTPException(status_code=404, detail="Unknown analysis.")
    nodes = [
        {"id": str(n.get("id", "")), **{k: str(v) for k, v in n.items() if k != "id"}}
        for n in graph.get("nodes", [])
    ]
    edges = [
        {
            "source": str(e.get("source", "")),
            "target": str(e.get("target", "")),
            **{k: str(v) for k, v in e.items() if k not in ("source", "target")},
        }
        for e in graph.get("edges", [])
    ]
    node_items, node_cursor = paginate(nodes, limit, cursor)
    edge_items, _ = paginate(edges, limit, cursor)
    return GraphPage(nodes=node_items, edges=edge_items, next_cursor=node_cursor)


@app.get("/api/v1/analyses/{analysis_id}/evidence/{sha}")
async def get_evidence(analysis_id: str, sha: str, request: Request) -> dict:
    analysis = await read_json(_kv(request), f"analyses/{analysis_id}.json")
    if analysis is None:
        raise HTTPException(status_code=404, detail="Unknown analysis.")
    match = next(
        (c for c in analysis.get("candidates", []) if str(c.get("commit_sha", "")).startswith(sha)),
        None,
    )
    if match is None:
        raise HTTPException(status_code=404, detail="Unknown candidate.")
    return match


Default = asgi.entrypoint(app)
