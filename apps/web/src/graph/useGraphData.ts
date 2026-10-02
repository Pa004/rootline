import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiConfigured, fetchGraph } from "../api";
import type { CandidateScore } from "../types";
import { DEMO_EDGES, DEMO_NODES, tracePath, type GraphEdge, type GraphNode } from "./model";

const ANALYSIS_ID = (import.meta.env.VITE_ANALYSIS_ID as string | undefined) ?? "";

export interface EvidenceData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ranks: Map<string, number>;
  traced: { nodes: Set<string>; edges: Set<string> } | null;
  topId: string | null;
  truncated: boolean;
  live: boolean;
}

/** Shared graph + ranking derivation for explorer, timeline and treemap. */
const NO_CANDIDATES: CandidateScore[] = [];

export function useGraphData(
  candidates: CandidateScore[] = NO_CANDIDATES,
  propNodes?: GraphNode[],
  propEdges?: GraphEdge[],
  trace = true,
): EvidenceData {
  const live = apiConfigured() && ANALYSIS_ID.length > 0;
  const remote = useQuery({
    queryKey: ["graph", ANALYSIS_ID],
    queryFn: () => fetchGraph(ANALYSIS_ID),
    enabled: live && propNodes === undefined,
    retry: false,
    staleTime: 60000,
  });
  const baseNodes = propNodes ?? remote.data?.nodes ?? DEMO_NODES;
  const baseEdges = propEdges ?? remote.data?.edges ?? DEMO_EDGES;

  const ranks = useMemo(() => {
    const top = [...candidates].sort((a, b) => b.score - a.score).slice(0, 3);
    return new Map(top.map((c) => [`commit:${c.commit_sha}`, c.score]));
  }, [candidates]);

  const nodes: GraphNode[] = useMemo(
    () =>
      baseNodes.map((n) =>
        n.type === "commit" && ranks.has(n.id) ? { ...n, score: ranks.get(n.id) } : n,
      ),
    [baseNodes, ranks],
  );

  const traced = useMemo(() => {
    if (!trace || ranks.size === 0) return null;
    const topId = [...ranks.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const failing = new Set(
      nodes.filter((n) => n.type === "test" && n.outcome === "failed").map((n) => n.id),
    );
    if (failing.size === 0) return null;
    return tracePath(baseEdges, topId, failing);
  }, [trace, ranks, nodes, baseEdges]);

  const topId = ranks.size > 0 ? [...ranks.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;

  return {
    nodes,
    edges: baseEdges,
    ranks,
    traced,
    topId,
    truncated: remote.data?.truncated ?? false,
    live,
  };
}
