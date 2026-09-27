import cytoscape from "cytoscape";

export interface GraphNode {
  id: string;
  type: "commit" | "file" | "symbol" | "test";
  label: string;
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
        data: { id: n.id, label: n.label, type: n.type },
      })),
    ...edges
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .map((e, i) => ({
        data: { id: `e${i}`, source: e.source, target: e.target, label: e.kind },
      })),
  ];
}

export function nodeStyle(type: string): { shape: cytoscape.Css.NodeShape; color: string } {
  return NODE_STYLE[type as GraphNode["type"]] ?? { shape: "ellipse", color: "#71717a" };
}

export interface GraphTheme {
  label: string;
  edge: string;
}

export const DARK_GRAPH: GraphTheme = { label: "#e4e4e7", edge: "#52525b" };
export const LIGHT_GRAPH: GraphTheme = { label: "#27272a", edge: "#a1a1aa" };

export function createGraph(
  container: HTMLElement,
  elements: ReturnType<typeof buildElements>,
  theme: GraphTheme = DARK_GRAPH,
) {
  return cytoscape({
    container,
    elements,
    layout: { name: "cose", animate: false },
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
        selector: ":selected",
        style: { "border-width": 3, "border-color": theme.label },
      },
    ],
  });
}
