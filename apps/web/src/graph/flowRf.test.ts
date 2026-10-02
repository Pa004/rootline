import { describe, expect, it } from "vitest";
import { layoutFlow } from "./flowLayout";
import { edgeIdentity, matchNodes, toReactFlow } from "./flowRf";
import { DEMO_EDGES, DEMO_NODES, tracePath, type GraphEdge } from "./model";

describe("edgeIdentity", () => {
  it("carries source, target and kind in a stable id", () => {
    expect(edgeIdentity({ source: "a", target: "b", kind: "depends" })).toBe("a→b:depends");
  });
});

describe("toReactFlow", () => {
  const positions = layoutFlow(DEMO_NODES, DEMO_EDGES, "LR");
  const traced = tracePath(
    DEMO_EDGES,
    "commit:8a92f1",
    new Set(["test::test_create_user"]),
  );

  it("converts every node with dagre positions and card data", () => {
    const { rfNodes, rfEdges } = toReactFlow({
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      positions,
      highlight: null,
      animate: true,
    });
    expect(rfNodes).toHaveLength(DEMO_NODES.length);
    expect(rfEdges).toHaveLength(DEMO_EDGES.length);
    expect(rfNodes.every((n) => n.type === "evidence")).toBe(true);
    const commit = rfNodes.find((n) => n.id === "commit:8a92f1")!;
    expect(commit.position).toEqual({
      x: positions.get("commit:8a92f1")!.x,
      y: positions.get("commit:8a92f1")!.y,
    });
    expect(commit.data).toMatchObject({ label: "8a92f1", nodeType: "commit" });
  });

  it("rings the top suspect, glows the path and never dims text", () => {
    const { rfNodes, rfEdges } = toReactFlow({
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      positions,
      topSuspectId: "commit:8a92f1",
      highlight: traced,
      animate: true,
    });
    const suspect = rfNodes.find((n) => n.id === "commit:8a92f1")!;
    expect(JSON.stringify(suspect.style)).toContain("boxShadow");
    const onPath = rfNodes.find((n) => n.id !== "commit:8a92f1" && traced.nodes.has(n.id))!;
    expect(JSON.stringify(onPath.style)).toContain("14b8a6");
    // Off-path cards stay fully opaque: dimmed small text fails WCAG contrast.
    const offPath = rfNodes.find((n) => !traced.nodes.has(n.id))!;
    expect(offPath.style?.opacity ?? 1).toBe(1);
    expect(offPath.style).not.toHaveProperty("boxShadow");
    const tracedEdge = rfEdges.find((e) => traced.edges.has(e.id))!;
    expect(tracedEdge.animated).toBe(true);
    expect(tracedEdge.style).toMatchObject({ stroke: "#14b8a6", strokeWidth: 3 });
  });

  it("disables edge animation for reduced motion", () => {
    const { rfEdges } = toReactFlow({
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      positions,
      topSuspectId: "commit:8a92f1",
      highlight: traced,
      animate: false,
    });
    expect(rfEdges.every((e) => e.animated !== true)).toBe(true);
  });

  it("keeps full opacity when nothing is traced", () => {
    const { rfNodes, rfEdges } = toReactFlow({
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      positions,
      highlight: null,
      animate: true,
    });
    expect(rfNodes.every((n) => n.style?.opacity !== 0.25)).toBe(true);
    expect(rfEdges.every((e) => e.animated !== true)).toBe(true);
  });

  it("styles fails edges red and structural edges dashed", () => {
    const { rfEdges } = toReactFlow({
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      positions,
      highlight: null,
      animate: true,
    });
    const fails = rfEdges.find((e) => e.label === "fails")!;
    expect(fails.style).toMatchObject({ stroke: "#ef4444" });
    const depends = rfEdges.find((e) => e.label === "depends")!;
    expect(depends.style).toMatchObject({ strokeDasharray: "6 4" });
  });
});

describe("matchNodes", () => {
  it("matches label text case-insensitively and respects kind sets", () => {
    expect(matchNodes(DEMO_NODES, "DB.PY", new Set())).toContain("file:app/db.py");
    expect(matchNodes(DEMO_NODES, "db.py", new Set(["commit"]))).toEqual(new Set());
    expect(matchNodes(DEMO_NODES, "", new Set(["test"]))).toEqual(
      new Set(["test::test_create_user", "test::test_list_users"]),
    );
  });
});

describe("tracePath edge identity", () => {
  it("uses the same id format as the React Flow adapter", () => {
    const edges: GraphEdge[] = [{ source: "a", target: "b", kind: "depends" }];
    const traced = tracePath(edges, "a", new Set(["b"]));
    expect([...traced.edges]).toEqual([edgeIdentity(edges[0])]);
  });
});
