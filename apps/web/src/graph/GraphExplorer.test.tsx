import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { GraphExplorer } from "./GraphExplorer";
import {
  DEMO_EDGES,
  DEMO_NODES,
  buildElements,
  nodeStyle,
  tracePath,
  type GraphEdge,
} from "./cytoscape";

vi.mock("cytoscape", () => ({
  default: () => ({ on: () => undefined, destroy: () => undefined }),
}));

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
});

describe("buildElements", () => {
  it("hides filtered types and their edges", () => {
    const elements = buildElements(DEMO_NODES, DEMO_EDGES, new Set(["symbol"]));
    const ids = elements.map((e) => e.data.id);
    expect(ids).not.toContain("symbol:app/db.py::get_db");
    expect(ids).toContain("file:app/db.py");
    expect(ids).toHaveLength(7 + 6);
  });

  it("keeps everything with no filters", () => {
    const elements = buildElements(DEMO_NODES, DEMO_EDGES, new Set());
    expect(elements).toHaveLength(DEMO_NODES.length + DEMO_EDGES.length);
  });

  it("uses stable edge ids carrying the kind", () => {
    const elements = buildElements(DEMO_NODES, DEMO_EDGES, new Set());
    const edge = elements.find(
      (e) =>
        "source" in e.data &&
        e.data.source === "file:app/users.py" &&
        "kind" in e.data &&
        e.data.kind === "depends",
    );
    assert(edge && "kind" in edge.data);
    expect(edge.data.id).toBe("file:app/users.py→file:app/db.py:depends");
    expect(edge.data.kind).toBe("depends");
  });

  it("bakes top scores into commit labels", () => {
    const nodes = [{ ...DEMO_NODES[0], score: 0.52 }];
    const elements = buildElements(nodes, [], new Set());
    expect(elements[0].data.label).toContain("0.52");
  });
});

describe("tracePath", () => {
  const edges: GraphEdge[] = [
    { source: "commit:c1", target: "file:a", kind: "changes" },
    { source: "file:a", target: "file:b", kind: "depends" },
    { source: "test:t", target: "file:b", kind: "fails" },
    { source: "commit:c2", target: "file:zzz", kind: "changes" },
  ];

  it("finds the undirected commit to failing-test path", () => {
    const traced = tracePath(edges, "commit:c1", new Set(["test:t"]));
    expect(traced.nodes).toEqual(new Set(["commit:c1", "file:a", "file:b", "test:t"]));
    expect(traced.edges).toContain("file:a→file:b:depends");
    expect(traced.edges).toHaveLength(3);
  });

  it("returns empty sets when unreachable", () => {
    const traced = tracePath(edges, "commit:c2", new Set(["test:t"]));
    expect(traced.nodes).toEqual(new Set());
    expect(traced.edges).toEqual(new Set());
  });
});

describe("nodeStyle", () => {
  it("gives commits a non-color encoding distinct from files", () => {
    expect(nodeStyle("commit").shape).not.toBe(nodeStyle("file").shape);
    expect(nodeStyle("bogus").shape).toBe("ellipse");
  });
});

describe("GraphExplorer", () => {
  it("renders filters and announces selection", () => {
    const { container } = render(
      <Providers>
        <GraphExplorer />
      </Providers>,
    );
    expect(screen.getByLabelText("show commit nodes")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-label="evidence graph"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("show symbol nodes"));
    expect(screen.getByLabelText("show symbol nodes")).not.toBeChecked();
  });

  it("shows legend, trace toggle and detail panel", () => {
    render(
      <Providers>
        <GraphExplorer />
      </Providers>,
    );
    expect(screen.getByLabelText("edge legend")).toBeInTheDocument();
    expect(screen.getByLabelText("trace causal path")).toBeChecked();
  });
});
