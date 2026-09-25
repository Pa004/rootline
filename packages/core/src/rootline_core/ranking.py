"""Candidate ranking with inspectable breakdown (FR-006, FR-007).

MVP semantics per evidence kind:
- temporal: recency within the analysis window (newest first).
- execution: a failing test resolves to a file the commit changed.
- structural: dependency hops (HEAD tree) from a failing test's file
  to a file the commit changed, attenuated 0.5 per hop.
- test: the commit is implicated by at least one failing test.
- semantic: token overlap between commit message and failing test names.
- contradiction: passing tests resolving to files the commit changed.
"""

from __future__ import annotations

import re

import networkx as nx
from pydantic import BaseModel, ConfigDict

from rootline_core.config import DEFAULT_WEIGHTS, SCHEMA_VERSION, Weights
from rootline_core.git import CommitInfo
from rootline_core.graph import FAILING_OUTCOMES, EvidenceGraph, file_node
from rootline_core.junit import TestResult

_TOKEN = re.compile(r"[a-z0-9]+")


class EvidenceItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: str
    points: float
    detail: str


class CandidateScore(BaseModel):
    model_config = ConfigDict(frozen=True)

    commit_sha: str
    message: str
    score: float
    evidence: list[EvidenceItem]


class Analysis(BaseModel):
    model_config = ConfigDict(frozen=True)

    schema_version: str = SCHEMA_VERSION
    candidates: list[CandidateScore]


def _tokens(text: str) -> set[str]:
    return set(_TOKEN.findall(text.lower()))


def _hops(graph: EvidenceGraph, failing_files: set[str], target: str) -> int | None:
    depends: EvidenceGraph = nx.DiGraph()
    depends.add_edges_from(
        (u, v) for u, v, data in graph.edges(data=True) if data.get("kind") == "depends"
    )
    best: int | None = None
    for source in failing_files:
        if source == target or source not in depends or target not in depends:
            continue
        try:
            length = int(nx.shortest_path_length(depends, source, target))
        except nx.NetworkXNoPath:
            continue
        if best is None or length < best:
            best = length
    return best


def score_candidates(
    graph: EvidenceGraph,
    commits: list[CommitInfo],
    results: list[TestResult],
    weights: Weights = DEFAULT_WEIGHTS,
) -> list[CandidateScore]:
    failing = [r for r in results if r.outcome in FAILING_OUTCOMES and r.file]
    passing = [r for r in results if r.file and r not in failing]
    failing_files = {str(r.file) for r in failing}
    test_tokens = set().union(*[_tokens(f"{r.classname} {r.name}") for r in failing])
    scored = [
        _score_one(graph, c, i, len(commits), failing_files, passing, test_tokens, weights)
        for i, c in enumerate(commits)
    ]
    return sorted(scored, key=lambda c: c.score, reverse=True)


def _score_one(
    graph: EvidenceGraph,
    commit: CommitInfo,
    index: int,
    total: int,
    failing_files: set[str],
    passing: list[TestResult],
    test_tokens: set[str],
    weights: Weights,
) -> CandidateScore:
    changed = {f.path for f in commit.files}
    linked = failing_files & changed
    evidence: list[EvidenceItem] = []
    temporal = weights.temporal * (1.0 - index / max(total - 1, 1))
    evidence.append(
        EvidenceItem(
            kind="temporal",
            points=temporal,
            detail=f"commit #{index + 1} of {total} in window",
        )
    )
    if linked:
        evidence.append(
            EvidenceItem(
                kind="execution",
                points=weights.execution,
                detail=f"failing test resolves to changed {sorted(linked)[0]}",
            )
        )
        evidence.append(
            EvidenceItem(
                kind="test",
                points=weights.test,
                detail=f"{len(linked)} failing test file(s) linked",
            )
        )
    else:
        failing_ids = {file_node(p) for p in failing_files}
        for target in sorted(changed):
            hops = _hops(graph, failing_ids, file_node(target))
            if hops is not None:
                evidence.append(
                    EvidenceItem(
                        kind="structural",
                        points=weights.structural * (0.5 ** (hops - 1)),
                        detail=f"{hops} hop(s) from failing test via imports",
                    )
                )
                evidence.append(
                    EvidenceItem(
                        kind="test",
                        points=weights.test,
                        detail="failing test reaches changed file via imports",
                    )
                )
                break
    overlap = test_tokens & _tokens(commit.message)
    if overlap and test_tokens:
        evidence.append(
            EvidenceItem(
                kind="semantic",
                points=weights.semantic * len(overlap) / len(test_tokens),
                detail=f"message shares tokens: {', '.join(sorted(overlap))}",
            )
        )
    passing_linked = sum(1 for r in passing if str(r.file) in changed)
    if passing_linked:
        evidence.append(
            EvidenceItem(
                kind="contradiction",
                points=-weights.contradiction * min(1.0, passing_linked / 2.0),
                detail=f"{passing_linked} passing test file(s) also changed",
            )
        )
    total_points = max(0.0, sum(e.points for e in evidence))
    return CandidateScore(
        commit_sha=commit.sha,
        message=commit.message,
        score=round(total_points, 4),
        evidence=[e for e in evidence if e.points != 0.0],
    )


def build_analysis(
    graph: EvidenceGraph,
    commits: list[CommitInfo],
    results: list[TestResult],
    weights: Weights = DEFAULT_WEIGHTS,
) -> Analysis:
    return Analysis(candidates=score_candidates(graph, commits, results, weights))
