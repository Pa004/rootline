"""Weight calibration: grid-search maximizing MRR over labeled cases."""

from __future__ import annotations

import itertools

from rootline_core.config import DEFAULT_WEIGHTS, Weights
from rootline_core.git import CommitInfo
from rootline_core.graph import EvidenceGraph
from rootline_core.junit import TestResult
from rootline_core.ranking import score_candidates

GRID = [0.0, 0.15, 0.3]
CONTRA_GRID = [0.0, 0.08]
FIELDS = ("temporal", "structural", "execution", "test", "semantic")
ALL_FIELDS = (*FIELDS, "contradiction")

Case = tuple[dict[str, str], EvidenceGraph, list[CommitInfo], list[TestResult]]


def rank_of(weights: Weights, case: Case) -> int | None:
    truth, graph, commits, results = case
    ranked = score_candidates(graph, commits, results, weights)
    return next(
        (i + 1 for i, c in enumerate(ranked) if c.message == truth["culprit_message"]),
        None,
    )


def mean_reciprocal_rank(weights: Weights, cases: list[Case]) -> float:
    if not cases:
        return 0.0
    total = sum(1.0 / rank for rank in (rank_of(weights, c) for c in cases) if rank)
    return total / len(cases)


def distance_from_defaults(weights: Weights) -> float:
    mine = [float(getattr(weights, f)) for f in ALL_FIELDS]
    theirs = [float(getattr(DEFAULT_WEIGHTS, f)) for f in ALL_FIELDS]
    return sum(abs(a - b) for a, b in zip(mine, theirs, strict=True))


def find_best(cases: list[Case]) -> tuple[Weights, float]:
    """Best weights by MRR; ties go to the closest to defaults."""
    best = DEFAULT_WEIGHTS
    best_mrr = mean_reciprocal_rank(best, cases)
    best_dist = 0.0
    for values in itertools.product(GRID, repeat=len(FIELDS)):
        for contra in CONTRA_GRID:
            candidate = Weights(**dict(zip(FIELDS, values, strict=True)), contradiction=contra)
            score = mean_reciprocal_rank(candidate, cases)
            dist = distance_from_defaults(candidate)
            if score > best_mrr or (score == best_mrr and dist < best_dist):
                best, best_mrr, best_dist = candidate, score, dist
    return best, best_mrr


def format_toml(weights: Weights) -> str:
    lines = ["[weights]"]
    lines.extend(f"{field} = {getattr(weights, field):.2f}" for field in ALL_FIELDS)
    return "\n".join(lines) + "\n"
