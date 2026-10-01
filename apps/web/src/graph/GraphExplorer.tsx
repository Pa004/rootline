import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUi } from "../store";
import { apiConfigured, fetchGraph } from "../api";
import type { CandidateScore } from "../types";
import {
  DARK_GRAPH,
  DEMO_EDGES,
  DEMO_NODES,
  LIGHT_GRAPH,
  buildElements,
  createGraph,
  tracePath,
  type GraphEdge,
  type GraphNode,
} from "./cytoscape";

const TYPES: GraphNode["type"][] = ["commit", "file", "symbol", "test"];

const ANALYSIS_ID = (import.meta.env.VITE_ANALYSIS_ID as string | undefined) ?? "";

const EDGE_LEGEND: { kind: GraphEdge["kind"]; swatch: string; label: string }[] = [
  { kind: "changes", swatch: "#38bdf8", label: "changes" },
  { kind: "fails", swatch: "#ef4444", label: "fails" },
  { kind: "covers", swatch: "#34d399", label: "covers" },
  { kind: "depends", swatch: "repeating-linear-gradient(90deg, #71717a 55%, transparent 45%)", label: "depends" },
  { kind: "contains", swatch: "repeating-linear-gradient(90deg, #71717a 25%, transparent 25%)", label: "contains" },
];

export function GraphExplorer({
  nodes: propNodes,
  edges: propEdges,
  candidates = [],
}: {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  candidates?: CandidateScore[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<ReturnType<typeof createGraph> | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [trace, setTrace] = useState(true);
  const { select, theme, reduceMotion } = useUi();

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

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = createGraph(
      containerRef.current,
      buildElements(nodes, baseEdges, hidden),
      theme === "light" ? LIGHT_GRAPH : DARK_GRAPH,
      !reduceMotion,
    );
    cyRef.current = cy;
    if (traced) {
      cy.elements().addClass("dimmed");
      traced.nodes.forEach((id) => cy.getElementById(id).removeClass("dimmed").addClass("traced"));
      traced.edges.forEach((id) => cy.getElementById(id).removeClass("dimmed").addClass("traced"));
    }
    cy.on("tap", "node", (event) => {
      const id = String(event.target.id());
      setDetail(id);
      if (id.startsWith("commit:")) {
        select(id.slice("commit:".length));
      }
    });
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, baseEdges, hidden, select, theme, reduceMotion, traced]);

  function toggle(type: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const detailNode = detail ? nodes.find((n) => n.id === detail) : undefined;
  const detailEdges = detail
    ? baseEdges.filter((e) => e.source === detail || e.target === detail)
    : [];

  return (
    <div>
      <fieldset className="flex flex-wrap gap-3 text-sm">
        <legend className="sr-only">Filter node types</legend>
        {TYPES.map((t) => (
          <label key={t} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!hidden.has(t)}
              onChange={() => toggle(t)}
              aria-label={`show ${t} nodes`}
            />
            {t}
          </label>
        ))}
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={trace}
            onChange={() => setTrace(!trace)}
            aria-label="trace causal path"
          />
          trace path
        </label>
      </fieldset>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--muted)" aria-label="edge legend">
        {EDGE_LEGEND.map((e) => (
          <span key={e.kind} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-6"
              style={{ background: e.swatch }}
            />
            {e.label}
          </span>
        ))}
      </div>
      <p className="mt-1 text-sm text-(--muted)">
        Diamonds are commits, rounded squares files, circles symbols, octagons
        tests. Click a node for detail; uncheck types to filter.
      </p>
      <div
        ref={containerRef}
        role="application"
        aria-label="evidence graph"
        className="mt-2 h-96 w-full rounded border border-(--border) bg-(--surface)"
      />
      {detailNode && (
        <div className="mt-2 rounded border border-(--border) bg-(--surface) p-3 text-sm" aria-live="polite">
          <p className="font-mono">
            {detailNode.id}
            {detailNode.score !== undefined && ` · score ${detailNode.score.toFixed(2)}`}
            {detailNode.outcome ? ` · ${detailNode.outcome}` : ""}
          </p>
          <p className="mt-1 text-(--muted)">
            {detailEdges.length} linked edge(s):{" "}
            {detailEdges
              .slice(0, 5)
              .map((e) => e.kind)
              .join(", ")}
            {detailEdges.length > 5 ? ` +${detailEdges.length - 5} more` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
