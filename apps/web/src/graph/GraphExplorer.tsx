import { useEffect, useRef, useState } from "react";
import { useUi } from "../store";
import {
  DARK_GRAPH,
  DEMO_EDGES,
  DEMO_NODES,
  LIGHT_GRAPH,
  buildElements,
  createGraph,
  type GraphEdge,
  type GraphNode,
} from "./cytoscape";

const TYPES: GraphNode["type"][] = ["commit", "file", "symbol", "test"];

export function GraphExplorer({
  nodes = DEMO_NODES,
  edges = DEMO_EDGES,
}: {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<ReturnType<typeof createGraph> | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const { select, theme, reduceMotion } = useUi();

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = createGraph(
      containerRef.current,
      buildElements(nodes, edges, hidden),
      theme === "light" ? LIGHT_GRAPH : DARK_GRAPH,
      !reduceMotion,
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
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, hidden, select, theme, reduceMotion]);

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

  return (
    <div>
      <fieldset className="flex gap-3 text-sm">
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
      </fieldset>
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
      {detail && (
        <p className="mt-2 font-mono text-sm" aria-live="polite">
          selected: {detail}
        </p>
      )}
    </div>
  );
}
