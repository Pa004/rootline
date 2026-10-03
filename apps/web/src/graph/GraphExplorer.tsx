import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Download, Layers, Search, SlidersHorizontal, ZoomIn } from "lucide-react";
import { toPng } from "html-to-image";
import { useUi } from "../store";
import type { CandidateScore } from "../types";
import { EvidenceNode } from "./EvidenceNode";
import { layoutFlow, type FlowDirection } from "./flowLayout";
import { edgeIdentity, matchNodes, toReactFlow } from "./flowRf";
import { neighborsWithin, parseSmartFilter, type GraphEdge, type GraphNode } from "./model";
import { useGraphData } from "./useGraphData";

const TYPES: GraphNode["type"][] = ["commit", "file", "symbol", "test"];

const EDGE_LEGEND: { kind: GraphEdge["kind"]; swatch: string; label: string }[] = [
  { kind: "changes", swatch: "#38bdf8", label: "changes" },
  { kind: "fails", swatch: "#ef4444", label: "fails" },
  { kind: "covers", swatch: "#34d399", label: "covers" },
  { kind: "depends", swatch: "#a1a1aa", label: "depends (dashed)" },
  { kind: "contains", swatch: "#a1a1aa", label: "contains (dashed)" },
];

const nodeTypes = { evidence: EvidenceNode };

const FLOW_LABEL: Record<FlowDirection, string> = { LR: "horizontal", TB: "vertical" };

/** Module-level empty so the default prop keeps a stable identity. */
const NO_CANDIDATES: CandidateScore[] = [];

function ExplorerInner({
  nodes: propNodes,
  edges: propEdges,
  candidates = NO_CANDIDATES,
}: {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  candidates?: CandidateScore[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [trace, setTrace] = useState(true);
  const [direction, setDirection] = useState<FlowDirection>("LR");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const { select, theme, reduceMotion } = useUi();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const {
    nodes,
    edges: baseEdges,
    traced,
    topId,
  } = useGraphData(candidates, propNodes, propEdges, trace);

  const visible = useMemo(() => {
    const kept = nodes.filter((n) => !hidden.has(n.type));
    const ids = new Set(kept.map((n) => n.id));
    return { nodes: kept, edges: baseEdges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
  }, [nodes, baseEdges, hidden]);

  const positions = useMemo(
    () => layoutFlow(visible.nodes, visible.edges, direction),
    [visible, direction],
  );

  const flowData = useMemo(
    () =>
      toReactFlow({
        nodes: visible.nodes,
        edges: visible.edges,
        positions,
        topSuspectId: topId ?? undefined,
        highlight: traced,
        animate: !reduceMotion,
      }),
    [visible, positions, topId, traced, reduceMotion],
  );
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Reset + refit only when the underlying data actually changes. Keyed on
  // a fingerprint (not object identity) so fresh-but-equal parent arrays
  // can't cause a setState render loop.
  const fingerprint = useMemo(
    () =>
      JSON.stringify([
        direction,
        trace,
        topId,
        visible.nodes.map((n) => n.id),
        visible.edges.map((e) => edgeIdentity(e)),
      ]),
    [direction, trace, topId, visible],
  );
  useEffect(() => {
    setRfNodes(flowData.rfNodes);
    setRfEdges(flowData.rfEdges);
    fitView({ padding: 0.15, duration: reduceMotion ? 0 : 300 });
    // flowData is fully determined by fingerprint inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, fitView, reduceMotion, setRfEdges, setRfNodes]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setDetail(node.id);
      if (node.id.startsWith("commit:")) {
        select(node.id.slice("commit:".length));
      }
    },
    [select],
  );

  function search(raw: string) {
    if (raw.trim() === "") return;
    const filter = parseSmartFilter(raw);
    let pool = nodes.filter(
      (n) =>
        (filter.kinds.size === 0 || filter.kinds.has(n.type)) &&
        (filter.text === "" ||
          n.label.toLowerCase().includes(filter.text) ||
          n.id.toLowerCase().includes(filter.text)),
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
    const ids = matchNodes(pool, "", new Set());
    const first = pool[0];
    setRfNodes((current) =>
      current.map((n) => ({ ...n, selected: ids.has(n.id) })),
    );
    // fitView by node id follows parent groups automatically.
    fitView({ nodes: [{ id: first.id }], padding: 0.4, maxZoom: 1.2, duration: reduceMotion ? 0 : 300 });
    setDetail(first.id);
  }

  function exportPng() {
    const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport) return;
    void (async () => {
      const url = await toPng(viewport, {
        backgroundColor: theme === "light" ? "#ffffff" : "#18181b",
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = "evidence-graph.png";
      link.click();
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
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
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
          Cards are commits, files, symbols and tests. Click a card for detail;
          uncheck types to filter.
        </p>
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <div
          role="application"
          aria-label="evidence graph"
          className="h-96 min-w-0 rounded border border-(--border) bg-(--surface)"
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.2}
            maxZoom={2.5}
          >
            <Background />
            <MiniMap pannable zoomable aria-label="graph minimap" />
          </ReactFlow>
        </div>
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
      <aside
        className="min-w-0 rounded border border-(--border) bg-(--surface) p-3 lg:col-start-2 lg:row-start-2 lg:h-full"
        aria-labelledby="graph-controls-title"
      >
        <h3 id="graph-controls-title" className="flex items-center gap-1.5 text-sm font-semibold">
          <SlidersHorizontal size={15} aria-hidden="true" />
          Graph controls
        </h3>
        <div
          className="mt-3 flex flex-col gap-4 text-sm"
          role="toolbar"
          aria-labelledby="graph-controls-title"
          aria-orientation="vertical"
        >
        <div role="group" aria-labelledby="graph-ctl-layout">
          <p id="graph-ctl-layout" className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-(--muted)">
            <Layers size={12} aria-hidden="true" />
            Layout
          </p>
          <label className="flex items-center gap-1">
            <span className="sr-only">Arrange nodes</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as FlowDirection)}
              aria-label="graph layout"
              className="min-w-0 flex-1 rounded bg-(--surface-2) px-2 py-1 text-sm"
            >
              {(Object.keys(FLOW_LABEL) as FlowDirection[]).map((d) => (
                <option key={d} value={d}>
                  {FLOW_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-xs text-(--muted)">Arrange nodes left-to-right or top-to-bottom.</p>
        </div>
        <div role="group" aria-labelledby="graph-ctl-zoom">
          <p id="graph-ctl-zoom" className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-(--muted)">
            <ZoomIn size={12} aria-hidden="true" />
            Zoom
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => zoomIn({ duration: reduceMotion ? 0 : 200 })}
              aria-label="zoom in"
              title="Zoom in"
              className="flex-1 rounded bg-(--surface-2) px-2 py-1 text-sm"
            >
              +
            </button>
            <button
              onClick={() => zoomOut({ duration: reduceMotion ? 0 : 200 })}
              aria-label="zoom out"
              title="Zoom out"
              className="flex-1 rounded bg-(--surface-2) px-2 py-1 text-sm"
            >
              −
            </button>
            <button
              onClick={() => fitView({ padding: 0.15 })}
              aria-label="fit graph to view"
              title="Fit whole graph in view"
              className="flex-1 rounded bg-(--surface-2) px-2 py-1 text-sm"
            >
              Fit
            </button>
          </div>
          <p className="mt-1 text-xs text-(--muted)">Zoom in, out, or fit the whole graph in view.</p>
        </div>
        <div role="group" aria-labelledby="graph-ctl-search">
          <p id="graph-ctl-search" className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-(--muted)">
            <Search size={12} aria-hidden="true" />
            Search
          </p>
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
              className="min-w-0 flex-1 rounded bg-(--surface-2) px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded bg-(--surface-2) px-2 py-1 text-sm">
              Find
            </button>
          </form>
          <p className="mt-1 text-xs text-(--muted)">Center a card by name, kind or dependency.</p>
          {notice && (
            <p className="mt-1 text-sm text-(--muted)" role="status">
              {notice}
            </p>
          )}
        </div>
        <div role="group" aria-labelledby="graph-ctl-export">
          <p id="graph-ctl-export" className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-(--muted)">
            <Download size={12} aria-hidden="true" />
            Export
          </p>
          <button
            onClick={exportPng}
            aria-label="export graph as PNG"
            title="Download graph as PNG image"
            className="w-full rounded bg-(--surface-2) px-2 py-1 text-sm"
          >
            PNG
          </button>
          <p className="mt-1 text-xs text-(--muted)">Download the current view as an image.</p>
        </div>
        </div>
      </aside>
    </div>
  );
}

export function GraphExplorer(props: {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  candidates?: CandidateScore[];
}) {
  return (
    <ReactFlowProvider>
      <ExplorerInner {...props} />
    </ReactFlowProvider>
  );
}
