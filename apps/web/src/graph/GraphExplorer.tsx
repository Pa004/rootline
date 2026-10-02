import { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "../store";
import type { CandidateScore } from "../types";
import {
  DARK_GRAPH,
  LIGHT_GRAPH,
  buildElements,
  createGraph,
  layoutFor,
  neighborsWithin,
  parseSmartFilter,
  type GraphEdge,
  type GraphNode,
  type LayoutName,
} from "./cytoscape";
import { useGraphData } from "./useGraphData";

const TYPES: GraphNode["type"][] = ["commit", "file", "symbol", "test"];

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
  const [layout, setLayout] = useState<LayoutName>("cose");
  const [query, setQuery] = useState("");
  const { select, theme, reduceMotion } = useUi();

  const { nodes, edges: baseEdges, traced } = useGraphData(candidates, propNodes, propEdges, trace);

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = createGraph(
      containerRef.current,
      [],
      theme === "light" ? LIGHT_GRAPH : DARK_GRAPH,
      !reduceMotion,
      layout,
    );
    cyRef.current = cy;
    cy.on("tap", "node", (event) => {
      const id = String(event.target.id());
      setDetail(id);
      if (id.startsWith("commit:")) {
        select(id.slice("commit:".length));
      }
    });
    return () => {
      cy.stop(true);
      cy.destroy();
      cyRef.current = null;
    };
  }, [select, theme, reduceMotion, layout]);

  const elements = useMemo(
    () => buildElements(nodes, baseEdges, hidden, traced),
    [nodes, baseEdges, hidden, traced],
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().remove();
    cy.add(elements);
    cy.layout(layoutFor(layout, !reduceMotion)).run();
  }, [elements, layout, reduceMotion]);

  function zoom(factor: number) {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }

  const [notice, setNotice] = useState<string | null>(null);

  function search(raw: string) {
    const cy = cyRef.current;
    if (!cy || raw.trim() === "") return;
    const filter = parseSmartFilter(raw);
    let pool = nodes.filter(
      (n) =>
        (filter.kinds.size === 0 || filter.kinds.has(n.type)) &&
        (filter.text === "" || n.label.toLowerCase().includes(filter.text)),
    );
    if (filter.affects !== "") {
      const seeds = new Set(
        nodes.filter((n) => n.label.toLowerCase().includes(filter.affects)).map((n) => n.id),
      );
      const scope = neighborsWithin(baseEdges, seeds, 2);
      pool = pool.filter((n) => scope.has(n.id));
    }
    if (pool.length === 0) {
      setNotice(`No nodes match "${raw}". Try "kind:file", "affects:<name>" or plain text.`);
      return;
    }
    setNotice(null);
    const ids = new Set(pool.map((n) => n.id));
    const found = cy.nodes().filter((n) => ids.has(String(n.id())));
    if (found.length > 0) {
      cy.elements().unselect();
      found.select();
      cy.center(found);
      setDetail(String(found.first().id()));
    }
  }

  function exportPng() {
    const cy = cyRef.current;
    if (!cy) return;
    void (async () => {
      const blob = (await cy.png({
        output: "blob",
        bg: theme === "light" ? "#ffffff" : "#18181b",
      })) as unknown as Blob;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "evidence-graph.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    })();
  }

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
      <div
        className="mt-2 flex flex-wrap items-center gap-2 text-sm"
        role="toolbar"
        aria-label="graph controls"
      >
        <label className="flex items-center gap-1">
          layout
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as LayoutName)}
            aria-label="graph layout"
            className="rounded bg-(--surface-2) px-2 py-1 text-sm"
          >
            <option value="cose">force</option>
            <option value="breadthfirst">layered</option>
            <option value="concentric">radial</option>
          </select>
        </label>
        <button
          onClick={() => zoom(1.25)}
          aria-label="zoom in"
          className="rounded bg-(--surface-2) px-2 py-1 text-sm"
        >
          +
        </button>
        <button
          onClick={() => zoom(0.8)}
          aria-label="zoom out"
          className="rounded bg-(--surface-2) px-2 py-1 text-sm"
        >
          −
        </button>
        <button
          onClick={() => cyRef.current?.fit(undefined, 30)}
          aria-label="fit graph to view"
          className="rounded bg-(--surface-2) px-2 py-1 text-sm"
        >
          Fit
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="flex items-center gap-1"
          role="search"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="find node… (kind:file, affects:name)"
            aria-label="find node by label"
            className="rounded bg-(--surface-2) px-2 py-1 text-sm"
          />
          <button type="submit" className="rounded bg-(--surface-2) px-2 py-1 text-sm">
            Find
          </button>
        </form>
        {notice && (
          <p className="text-sm text-(--muted)" role="status">
            {notice}
          </p>
        )}
        <button
          onClick={exportPng}
          aria-label="export graph as PNG"
          className="rounded bg-(--surface-2) px-2 py-1 text-sm"
        >
          PNG
        </button>
      </div>
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
