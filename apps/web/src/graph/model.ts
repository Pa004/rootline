/**
 * Graph model: node/edge types, demo data and pure graph algorithms.
 *
 * Rendering-agnostic on purpose — React Flow and the SVG views
 * all consume these helpers. No DOM, no canvas, fully unit-testable.
 */

export interface GraphNode {
  id: string;
  type: "commit" | "file" | "symbol" | "test";
  label: string;
  outcome?: string;
  score?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: "changes" | "fails" | "covers" | "contains" | "depends";
}

/** Demo graph mirroring backend node/edge kinds (used without API). */
export const DEMO_NODES: GraphNode[] = [
  { id: "commit:8a92f1", type: "commit", label: "8a92f1" },
  { id: "commit:41bc77", type: "commit", label: "41bc77" },
  { id: "file:app/db.py", type: "file", label: "db.py" },
  { id: "file:app/users.py", type: "file", label: "users.py" },
  { id: "file:tests/test_users.py", type: "file", label: "test_users.py" },
  { id: "symbol:app/db.py::get_db", type: "symbol", label: "get_db()" },
  { id: "symbol:app/users.py::create_user", type: "symbol", label: "create_user()" },
  { id: "test::test_create_user", type: "test", label: "test_create_user ✕", outcome: "failed" },
  { id: "test::test_list_users", type: "test", label: "test_list_users ✓", outcome: "passed" },
];

export const DEMO_EDGES: GraphEdge[] = [
  { source: "commit:8a92f1", target: "file:app/db.py", kind: "changes" },
  { source: "commit:41bc77", target: "file:tests/test_users.py", kind: "changes" },
  { source: "file:app/db.py", target: "symbol:app/db.py::get_db", kind: "contains" },
  { source: "file:app/users.py", target: "symbol:app/users.py::create_user", kind: "contains" },
  { source: "file:tests/test_users.py", target: "file:app/users.py", kind: "depends" },
  { source: "file:app/users.py", target: "file:app/db.py", kind: "depends" },
  { source: "test::test_create_user", target: "file:tests/test_users.py", kind: "fails" },
  { source: "test::test_list_users", target: "file:tests/test_users.py", kind: "covers" },
];

export interface TraceHighlight {
  nodes: Set<string>;
  edges: Set<string>;
}

function edgeId(e: GraphEdge): string {
  return `${e.source}→${e.target}:${e.kind}`;
}

/** Nodes/edges on any shortest commit→failing-test path (undirected BFS). */
export function tracePath(
  edges: GraphEdge[],
  startId: string,
  goalIds: Set<string>,
): TraceHighlight {
  const adjacency = new Map<string, { to: string; id: string }[]>();
  const link = (a: string, b: string, id: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push({ to: b, id });
  };
  for (const e of edges) {
    const id = edgeId(e);
    link(e.source, e.target, id);
    link(e.target, e.source, id);
  }
  const prev = new Map<string, { from: string; via: string }>([[startId, { from: "", via: "" }]]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { to, id } of adjacency.get(current) ?? []) {
      if (!prev.has(to)) {
        prev.set(to, { from: current, via: id });
        queue.push(to);
      }
    }
  }
  const nodes = new Set<string>();
  const edgeIds = new Set<string>();
  for (const goal of goalIds) {
    if (!prev.has(goal)) continue;
    let cursor: string = goal;
    nodes.add(cursor);
    while (cursor !== startId) {
      const step = prev.get(cursor)!;
      edgeIds.add(step.via);
      cursor = step.from;
      nodes.add(cursor);
    }
  }
  return { nodes, edges: edgeIds };
}

/** Ordered node ids along the shortest start→goal path (first reachable goal). */
export function orderTrace(
  edges: GraphEdge[],
  startId: string,
  goalIds: Set<string>,
): string[] {
  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push(b);
  };
  for (const e of edges) {
    link(e.source, e.target);
    link(e.target, e.source);
  }
  const prev = new Map<string, string>([[startId, ""]]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const to of adjacency.get(current) ?? []) {
      if (!prev.has(to)) {
        prev.set(to, current);
        queue.push(to);
      }
    }
  }
  const goal = [...goalIds].find((g) => prev.has(g));
  if (!goal) return [];
  const path = [goal];
  while (path[path.length - 1] !== startId) {
    path.push(prev.get(path[path.length - 1])!);
  }
  return path.reverse();
}

/** Node ids within `depth` undirected hops of any seed. */
export function neighborsWithin(
  edges: GraphEdge[],
  seeds: Set<string>,
  depth: number,
): Set<string> {
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const e of edges) {
    link(e.source, e.target);
    link(e.target, e.source);
  }
  const seen = new Set(seeds);
  let frontier = [...seeds];
  for (let i = 0; i < depth && frontier.length > 0; i += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const to of adjacency.get(id) ?? []) {
        if (!seen.has(to)) {
          seen.add(to);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

export interface SmartFilter {
  text: string;
  kinds: Set<GraphNode["type"]>;
  affects: string;
}

/**
 * Mini query language: `kind:file`, `affects:test_create_user`, or plain
 * label text. Tokens combine with AND (kinds intersect).
 */
export function parseSmartFilter(query: string): SmartFilter {
  const kinds = new Set<GraphNode["type"]>();
  const known: GraphNode["type"][] = ["commit", "file", "symbol", "test"];
  let affects = "";
  const textParts: string[] = [];
  for (const token of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    if (token.startsWith("kind:") || token.startsWith("type:")) {
      const kind = token.split(":", 2)[1] as GraphNode["type"];
      if (known.includes(kind)) kinds.add(kind);
    } else if (token.startsWith("affects:")) {
      affects = token.slice("affects:".length);
    } else {
      textParts.push(token);
    }
  }
  return { text: textParts.join(" "), kinds, affects };
}
