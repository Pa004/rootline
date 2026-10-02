/**
 * Pure adapter: Rootline graph model → React Flow nodes/edges.
 *
 * No React, no DOM — every visual decision (colors, badges, dimming)
 * is a plain data transform so unit tests can assert it directly.
 */

import type { Edge, Node } from "@xyflow/react";

import type { PlacedNode } from "./flowLayout";
import type { GraphEdge, GraphNode, TraceHighlight } from "./model";

export interface EvidenceNodeData extends Record<string, unknown> {
  label: string;
  nodeType: GraphNode["type"];
  outcome?: string;
  score?: number;
}

export const EDGE_STYLE: Record<GraphEdge["kind"], { stroke: string; dashed?: boolean }> = {
  changes: { stroke: "#38bdf8" },
  fails: { stroke: "#ef4444" },
  covers: { stroke: "#34d399" },
  contains: { stroke: "#a1a1aa", dashed: true },
  depends: { stroke: "#a1a1aa", dashed: true },
};

export function edgeIdentity(e: GraphEdge): string {
  return `${e.source}→${e.target}:${e.kind}`;
}

function rankBadge(n: GraphNode): string | undefined {
  if (n.type === "commit" && n.score !== undefined && n.score >= 0) {
    return n.score.toFixed(2);
  }
  return undefined;
}

export interface FlowGraphInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Map<string, PlacedNode>;
  /** Id of the top-ranked commit → highlighted as root cause. */
  topSuspectId?: string;
  highlight: TraceHighlight | null;
  /** Edge dash animation (disabled when the user prefers reduced motion). */
  animate: boolean;
}

/** Convert model nodes/edges + dagre positions into React Flow elements. */
export function toReactFlow(input: FlowGraphInput): { rfNodes: Node[]; rfEdges: Edge[] } {
  const { nodes, edges, positions, topSuspectId, highlight, animate } = input;
  const rfNodes: Node<EvidenceNodeData>[] = nodes.map((n) => {
    const pos = positions.get(n.id);
    const traced = highlight?.nodes.has(n.id) ?? false;
    // No opacity dimming: translucent small text fails WCAG contrast, and
    // canvas-era dimming is invisible to assistive tech anyway. The traced
    // path pops through glow rings + animated edges instead.
    return {
      id: n.id,
      type: "evidence",
      position: { x: pos?.x ?? 0, y: pos?.y ?? 0 },
      data: {
        label: n.label,
        nodeType: n.type,
        outcome: n.outcome,
        score: rankBadge(n) !== undefined ? n.score : undefined,
      },
      style: {
        ...(n.id === topSuspectId
          ? { boxShadow: "0 0 0 3px #ef4444, 0 0 24px rgba(239,68,68,.45)" }
          : traced
            ? { boxShadow: "0 0 0 2px #14b8a6, 0 0 16px rgba(20,184,166,.35)" }
            : {}),
      },
    };
  });
  const rfEdges: Edge[] = edges.map((e) => {
    const id = edgeIdentity(e);
    const traced = highlight?.edges.has(id) ?? false;
    const base = EDGE_STYLE[e.kind];
    return {
      id,
      source: e.source,
      target: e.target,
      label: e.kind,
      animated: traced && animate,
      style: {
        stroke: traced ? "#14b8a6" : base.stroke,
        strokeWidth: traced ? 3 : 1.5,
        ...(base.dashed ? { strokeDasharray: "6 4" } : {}),
      },
      labelStyle: { fontSize: 9, fill: "currentColor" },
    };
  });
  return { rfNodes, rfEdges };
}

/** Node ids whose labels match the mini query (candidates, not hidden). */
export function matchNodes(
  nodes: GraphNode[],
  text: string,
  kinds: Set<GraphNode["type"]>,
): Set<string> {
  const q = text.trim().toLowerCase();
  const matched = new Set<string>();
  for (const n of nodes) {
    if (kinds.size > 0 && !kinds.has(n.type)) continue;
    if (q && !n.label.toLowerCase().includes(q) && !n.id.toLowerCase().includes(q)) continue;
    matched.add(n.id);
  }
  return matched;
}
