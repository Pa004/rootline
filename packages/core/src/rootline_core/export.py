"""Analysis export: versioned JSON and CSV (FR-008)."""

from __future__ import annotations

import csv
import io

from rootline_core.ranking import Analysis


def to_json(analysis: Analysis) -> str:
    return analysis.model_dump_json(indent=2)


def to_csv(analysis: Analysis) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["commit_sha", "short_sha", "message", "score"])
    for candidate in analysis.candidates:
        writer.writerow(
            [
                candidate.commit_sha,
                candidate.commit_sha[:12],
                candidate.message.splitlines()[0] if candidate.message else "",
                candidate.score,
            ]
        )
    return buffer.getvalue()
