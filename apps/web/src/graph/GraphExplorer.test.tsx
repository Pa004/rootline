import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphExplorer } from "./GraphExplorer";
import {
  DEMO_EDGES,
  DEMO_NODES,
  neighborsWithin,
  orderTrace,
  parseSmartFilter,
  tracePath,
  type GraphEdge,
} from "./model";

vi.mock("html-to-image", () => ({ toPng: vi.fn(async () => "data:image/png;base64,x") }));

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function stubLayoutApis() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

describe("orderTrace", () => {
  it("orders nodes from commit to failing test", () => {
    const ordered = orderTrace(
      [
        { source: "commit:c1", target: "file:a", kind: "changes" },
        { source: "file:a", target: "file:b", kind: "depends" },
        { source: "test:t", target: "file:b", kind: "fails" },
      ],
      "commit:c1",
      new Set(["test:t"]),
    );
    expect(ordered).toEqual(["commit:c1", "file:a", "file:b", "test:t"]);
  });

  it("returns empty when nothing is reachable", () => {
    expect(orderTrace([], "commit:c1", new Set(["test:t"]))).toEqual([]);
  });
});

describe("neighborsWithin", () => {
  const edges: GraphEdge[] = [
    { source: "a", target: "b", kind: "depends" },
    { source: "b", target: "c", kind: "depends" },
    { source: "c", target: "d", kind: "depends" },
  ];

  it("expands N hops from seeds", () => {
    expect(neighborsWithin(edges, new Set(["b"]), 1)).toEqual(new Set(["a", "b", "c"]));
    expect(neighborsWithin(edges, new Set(["b"]), 2)).toEqual(
      new Set(["a", "b", "c", "d"]),
    );
  });
});

describe("parseSmartFilter", () => {
  it("parses kinds, affects and text", () => {
    expect(parseSmartFilter("kind:file db.py")).toEqual({
      text: "db.py",
      kinds: new Set(["file"]),
      affects: "",
    });
    expect(parseSmartFilter("affects:test_create_user")).toEqual({
      text: "",
      kinds: new Set(),
      affects: "test_create_user",
    });
    expect(parseSmartFilter("type:bogus hello")).toEqual({
      text: "hello",
      kinds: new Set(),
      affects: "",
    });
  });
});

describe("GraphExplorer", () => {
  it("renders DOM cards instead of canvas, with filters and legend", () => {
    stubLayoutApis();
    render(
      <Providers>
        <GraphExplorer nodes={DEMO_NODES} edges={DEMO_EDGES} />
      </Providers>,
    );
    expect(screen.getByLabelText("show commit nodes")).toBeInTheDocument();
    expect(screen.getByRole("application", { name: "evidence graph" })).toBeInTheDocument();
    // Node cards are real text (selectable, screen-reader visible).
    expect(screen.getAllByText("db.py").length).toBeGreaterThan(0);
    expect(document.querySelector("canvas")).toBeNull();
    expect(screen.getByLabelText("edge legend")).toBeInTheDocument();
    expect(screen.getByLabelText("trace causal path")).toBeChecked();
    fireEvent.click(screen.getByLabelText("show symbol nodes"));
    expect(screen.getByLabelText("show symbol nodes")).not.toBeChecked();
  });

  it("finds a node by label and shows its detail", () => {
    stubLayoutApis();
    render(
      <Providers>
        <GraphExplorer nodes={DEMO_NODES} edges={DEMO_EDGES} />
      </Providers>,
    );
    fireEvent.change(screen.getByLabelText("find node by label"), {
      target: { value: "db.py" },
    });
    fireEvent.click(screen.getByText("Find"));
    expect(screen.getByText(/file:app\/db\.py/)).toBeInTheDocument();
  });

  it("announces no-match searches without crashing", () => {
    stubLayoutApis();
    render(
      <Providers>
        <GraphExplorer nodes={DEMO_NODES} edges={DEMO_EDGES} />
      </Providers>,
    );
    fireEvent.change(screen.getByLabelText("find node by label"), {
      target: { value: "zzz-no-such-node" },
    });
    fireEvent.click(screen.getByText("Find"));
    expect(screen.getByRole("status")).toHaveTextContent(/No nodes match/);
  });

  it("switches direction and exports PNG", async () => {
    stubLayoutApis();
    const { toPng } = await import("html-to-image");
    render(
      <Providers>
        <GraphExplorer nodes={DEMO_NODES} edges={DEMO_EDGES} />
      </Providers>,
    );
    fireEvent.change(screen.getByLabelText("graph layout"), { target: { value: "TB" } });
    expect(screen.getByLabelText("graph layout")).toHaveValue("TB");
    fireEvent.click(screen.getByLabelText("zoom in"));
    fireEvent.click(screen.getByLabelText("fit graph to view"));
    fireEvent.click(screen.getByLabelText("export graph as PNG"));
    await vi.waitFor(() => expect(toPng).toHaveBeenCalled());
  });
});
