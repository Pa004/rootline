"""Self-contained offline HTML report (FR-011). No CDN, data embedded."""

from __future__ import annotations

import html

from rootline_core.export import to_json
from rootline_core.ranking import Analysis, CandidateScore

_CSS = (
    "body{font-family:system-ui,sans-serif;max-width:70rem;margin:2rem auto;padding:0 1rem}"
    "table{border-collapse:collapse;width:100%}"
    "th,td{border:1px solid #ccc;padding:.4rem;text-align:left}"
    ".pro{color:#14532d}.con{color:#7f1d1d}"
)


def to_html(analysis: Analysis) -> str:
    rows = "\n".join(_candidate_row(c) for c in analysis.candidates)
    details = "\n".join(_candidate_block(i, c) for i, c in enumerate(analysis.candidates))
    payload = html.escape(to_json(analysis))
    return (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        f"<title>Rootline report</title><style>{_CSS}</style></head><body>"
        "<h1>Rootline report</h1>"
        f"<table><tr><th>Commit</th><th>Message</th><th>Score</th></tr>{rows}</table>"
        f"{details}"
        f"<script type='application/json' id='analysis'>{payload}</script>"
        "</body></html>"
    )


def _candidate_row(candidate: CandidateScore) -> str:
    message = candidate.message.splitlines()[0] if candidate.message else ""
    return (
        f"<tr><td><code>{html.escape(candidate.commit_sha[:12])}</code></td>"
        f"<td>{html.escape(message)}</td><td>{candidate.score:.2f}</td></tr>"
    )


def _candidate_block(index: int, candidate: CandidateScore) -> str:
    items = "\n".join(
        _evidence_item(kind, detail, points)
        for kind, detail, points in (
            (item.kind, item.detail, item.points) for item in candidate.evidence
        )
    )
    message = candidate.message.splitlines()[0] if candidate.message else ""
    return (
        f"<details><summary>#{index + 1}. "
        f"<code>{html.escape(candidate.commit_sha[:12])}</code> "
        f"{candidate.score:.2f} — {html.escape(message)}</summary>"
        f"<ul>{items}</ul></details>"
    )


def _evidence_item(kind: str, detail: str, points: float) -> str:
    cls = "pro" if points > 0 else "con"
    sign = "+" if points > 0 else "-"
    return (
        f"<li class='{cls}'>{sign} [{html.escape(kind)}] {html.escape(detail)} ({points:+.2f})</li>"
    )
