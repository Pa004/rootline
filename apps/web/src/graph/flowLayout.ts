import dagre from "dagre";

import type { GraphEdge, GraphNode } from "./model";

export type FlowDirection = "LR" | "TB";

export interface PlacedNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_SIZE: Record<GraphNode["type"], { width: number; height: number }> = {
  commit: { width: 88, height: 44 },
  file: { width: 176, height: 44 },
  symbol: { width: 176, height: 40 },
  test: { width: 176, height: 44 },
};

/**
 * Deterministic layered layout: dagre ranks every node flat (dagre cannot
 * route edges to compound parents, so grouping happens in React Flow —
 * see `groupSymbols` in flowRf.ts). Same input → same coordinates.
 */
export function layoutFlow(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: FlowDirection,
): Map<string, PlacedNode> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, ranksep: 60, nodesep: 40, marginx: 10, marginy: 10 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    const size = NODE_SIZE[n.type];
    g.setNode(n.id, { width: size.width, height: size.height });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const out = new Map<string, PlacedNode>();
  for (const n of nodes) {
    const placed = g.node(n.id) as { x: number; y: number; width: number; height: number };
    out.set(n.id, {
      x: placed.x - placed.width / 2,
      y: placed.y - placed.height / 2,
      width: placed.width,
      height: placed.height,
    });
  }
  return out;
}
