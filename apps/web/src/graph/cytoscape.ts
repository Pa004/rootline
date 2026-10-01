import cytoscape from "cytoscape";

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
  { id: "test::test_create_user", type: "test", label: "test_create_user ✕" },
  { id: "test::test_list_users", type: "test", label: "test_list_users ✓" },
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

const NODE_STYLE: Record<GraphNode["type"], { shape: cytoscape.Css.NodeShape; color: string }> = {
  commit: { shape: "diamond", color: "#38bdf8" },
  file: { shape: "round-rectangle", color: "#a78bfa" },
  symbol: { shape: "ellipse", color: "#34d399" },
  test: { shape: "octagon", color: "#fbbf24" },
};

export function buildElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  hiddenTypes: Set<string>,
) {
  const visible = new Set(nodes.filter((n) => !hiddenTypes.has(n.type)).map((n) => n.id));
  return [
    ...nodes
      .filter((n) => visible.has(n.id))
      .map((n) => ({
        data: {
          id: n.id,
          label: rankLabel(n),
          type: n.type,
          outcome: n.outcome ?? "",
          score: n.score ?? -1,
        },
      })),
    ...edges
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .map((e) => ({
        data: {
          id: `${e.source}→${e.target}:${e.kind}`,
          source: e.source,
          target: e.target,
          label: e.kind,
          kind: e.kind,
        },
      })),
  ];
}

/** Top suspects get their rank baked into the label. */
function rankLabel(n: GraphNode): string {
  if (n.type === "commit" && n.score !== undefined && n.score >= 0) {
    return `${n.label} · ${n.score.toFixed(2)}`;
  }
  return n.label;
}

/** Nodes/edges on any shortest commit→failing-test path (undirected BFS). */
export function tracePath(
  edges: GraphEdge[],
  startId: string,
  goalIds: Set<string>,
): { nodes: Set<string>; edges: Set<string> } {
  const adjacency = new Map<string, { to: string; id: string }[]>();
  const link = (a: string, b: string, id: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push({ to: b, id });
  };
  for (const e of edges) {
    const id = `${e.source}→${e.target}:${e.kind}`;
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

export function nodeStyle(type: string): { shape: cytoscape.Css.NodeShape; color: string } {
  return NODE_STYLE[type as GraphNode["type"]] ?? { shape: "ellipse", color: "#71717a" };
}

export interface GraphTheme {
  label: string;
  edge: string;
  accent: string;
}

export const DARK_GRAPH: GraphTheme = { label: "#e4e4e7", edge: "#52525b", accent: "#5eead4" };
export const LIGHT_GRAPH: GraphTheme = { label: "#27272a", edge: "#a1a1aa", accent: "#0f766e" };

export function createGraph(
  container: HTMLElement,
  elements: ReturnType<typeof buildElements>,
  theme: GraphTheme = DARK_GRAPH,
  animate = true,
) {
  return cytoscape({
    container,
    elements,
    layout: { name: "cose", animate, animationDuration: 400 },
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "font-size": 10,
          color: theme.label,
          "background-color": "#71717a",
          shape: "ellipse",
        },
      },
      ...Object.entries(NODE_STYLE).map(([type, s]) => ({
        selector: `node[type = "${type}"]`,
        style: { shape: s.shape, "background-color": s.color },
      })),
      {
        selector: "node[type = 'test'][outcome = 'failed']",
        style: { "border-width": 3, "border-color": "#ef4444" },
      },
      {
        selector: "edge",
        style: {
          label: "data(label)",
          "font-size": 8,
          color: theme.label,
          "line-color": theme.edge,
          "target-arrow-shape": "triangle",
          "target-arrow-color": theme.edge,
          "curve-style": "bezier",
        },
      },
      {
        selector: "edge[kind = 'fails']",
        style: { "line-color": "#ef4444", "target-arrow-color": "#ef4444", width: 2 },
      },
      {
        selector: "edge[kind = 'changes']",
        style: { "line-color": "#38bdf8", "target-arrow-color": "#38bdf8", width: 2 },
      },
      {
        selector: "edge[kind = 'covers']",
        style: { "line-color": "#34d399", "target-arrow-color": "#34d399" },
      },
      {
        selector: "edge[kind = 'depends']",
        style: { "line-style": "dashed" },
      },
      {
        selector: "edge[kind = 'contains']",
        style: { "line-style": "dotted" },
      },
      {
        selector: ".traced",
        style: { "border-width": 3, "border-color": theme.accent },
      },
      {
        selector: "edge.traced",
        style: {
          "line-color": theme.accent,
          "target-arrow-color": theme.accent,
          width: 3,
        },
      },
      {
        selector: ".dimmed",
        style: { opacity: 0.22 },
      },
      {
        selector: ":selected",
        style: { "border-width": 3, "border-color": theme.label },
      },
    ],
  });
}
