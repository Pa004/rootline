"""Rootline MCP server (stdio)."""

from __future__ import annotations

from typing import Any

from mcp.server.mcpserver import MCPServer

from rootline_mcp.tools import blast_radius_for_commit, explain_candidate, rank_causes

mcp = MCPServer("rootline")


@mcp.tool()
def rank_causes_tool(
    repo: str,
    test_results: str | None = None,
    baseline: str = "HEAD~50",
    max_commits: int = 50,
) -> dict[str, Any]:
    """Rank commits likely to have caused a regression (evidence graph)."""
    return rank_causes(repo, test_results, baseline, max_commits)


@mcp.tool()
def explain_candidate_tool(analysis: dict[str, Any], sha: str) -> str:
    """Explain a ranked candidate with evidence for and against."""
    return explain_candidate(analysis, sha)


@mcp.tool()
def blast_radius_tool(repo: str, sha: str) -> dict[str, Any]:
    """Files, dependents and tests affected by a commit."""
    return blast_radius_for_commit(repo, sha)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
