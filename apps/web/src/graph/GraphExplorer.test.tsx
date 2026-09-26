import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { GraphExplorer } from "./GraphExplorer";
import { DEMO_EDGES, DEMO_NODES, buildElements, nodeStyle } from "./cytoscape";

vi.mock("cytoscape", () => ({
  default: () => ({ on: () => undefined, destroy: () => undefined }),
}));

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
});

describe("nodeStyle", () => {
  it("gives commits a non-color encoding distinct from files", () => {
    expect(nodeStyle("commit").shape).not.toBe(nodeStyle("file").shape);
    expect(nodeStyle("bogus").shape).toBe("ellipse");
  });
});

describe("GraphExplorer", () => {
  it("renders filters and announces selection", () => {
    const { container } = render(<GraphExplorer />);
    expect(screen.getByLabelText("show commit nodes")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-label="evidence graph"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("show symbol nodes"));
    expect(screen.getByLabelText("show symbol nodes")).not.toBeChecked();
  });
});
