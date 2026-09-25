"""Ranking weights and rootline.toml loading (FR-006)."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass
from pathlib import Path

SCHEMA_VERSION = "1.0"


@dataclass(frozen=True)
class Weights:
    temporal: float = 0.20
    structural: float = 0.25
    execution: float = 0.25
    test: float = 0.15
    semantic: float = 0.10
    contradiction: float = 0.08


DEFAULT_WEIGHTS = Weights()


def load_weights(path: str | Path | None) -> Weights:
    if path is None:
        return DEFAULT_WEIGHTS
    data = tomllib.loads(Path(path).read_text(encoding="utf-8"))
    section = data.get("weights", {})
    if not isinstance(section, dict):
        return DEFAULT_WEIGHTS
    fields = set(Weights.__dataclass_fields__)
    values = {k: float(section[k]) for k in fields if k in section}
    return Weights(
        temporal=values.get("temporal", DEFAULT_WEIGHTS.temporal),
        structural=values.get("structural", DEFAULT_WEIGHTS.structural),
        execution=values.get("execution", DEFAULT_WEIGHTS.execution),
        test=values.get("test", DEFAULT_WEIGHTS.test),
        semantic=values.get("semantic", DEFAULT_WEIGHTS.semantic),
        contradiction=values.get("contradiction", DEFAULT_WEIGHTS.contradiction),
    )
