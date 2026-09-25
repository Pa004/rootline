"""Human-readable explanation for a ranked candidate (FR-007)."""

from __future__ import annotations

from rootline_core.ranking import CandidateScore


def explain(candidate: CandidateScore, failing_tests: list[str]) -> str:
    lines = [
        f"Most probable cause: commit {candidate.commit_sha[:12]}",
        f"Evidence strength score: {candidate.score:.2f} (not a probability)",
        "",
        "Evidence:",
    ]
    for item in candidate.evidence:
        if item.points > 0:
            lines.append(f"    + [{item.kind}] {item.detail} ({item.points:+.2f})")
    contradictions = [e for e in candidate.evidence if e.points < 0]
    if contradictions:
        lines.append("")
        lines.append("Contradictory evidence:")
        for item in contradictions:
            lines.append(f"    - [{item.kind}] {item.detail} ({item.points:+.2f})")
    lines.append("")
    lines.append("Suggested verification:")
    targets = ", ".join(failing_tests) if failing_tests else "<affected test>"
    lines.append(f"    Revert commit {candidate.commit_sha[:12]} and rerun {targets}.")
    return "\n".join(lines)
