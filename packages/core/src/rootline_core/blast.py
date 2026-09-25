"""Blast-radius queries over the evidence graph (FR-012)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from rootline_core.graph import EvidenceGraph, commit_node


class BlastRadius(BaseModel):
    model_config = ConfigDict(frozen=True)

    commit_sha: str
    changed_files: list[str]
    dependent_files: list[str]
    covering_tests: list[str]


def blast_radius(graph: EvidenceGraph, sha: str) -> BlastRadius:
    cid = commit_node(sha)
    changed = sorted(
        str(v).removeprefix("file:")
        for _, v, data in graph.out_edges(cid, data=True)
        if data.get("kind") == "changes"
    )
    changed_ids = {f"file:{p}" for p in changed}
    dependents = sorted(
        {
            str(u).removeprefix("file:")
            for target in changed_ids
            for u, _, data in graph.in_edges(target, data=True)
            if data.get("kind") == "depends" and u not in changed_ids
        }
    )
    scope = changed_ids | {f"file:{p}" for p in dependents}
    tests = sorted(
        {
            str(graph.nodes[u].get("name", u)).removeprefix("test:")
            for fid in scope
            for u, _, data in graph.in_edges(fid, data=True)
            if data.get("kind") in ("fails", "covers")
        }
    )
    return BlastRadius(
        commit_sha=sha,
        changed_files=changed,
        dependent_files=dependents,
        covering_tests=tests,
    )
