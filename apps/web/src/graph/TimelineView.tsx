import { orderTrace } from "./cytoscape";
import { useGraphData } from "./useGraphData";
import type { CandidateScore } from "../types";

/** The causal path as a readable left-to-right story (no canvas needed). */
export function TimelineView({ candidates = [] }: { candidates?: CandidateScore[] }) {
  const { nodes, edges, topId } = useGraphData(candidates);
  const failing = new Set(
    nodes.filter((n) => n.type === "test" && n.outcome === "failed").map((n) => n.id),
  );
  const ordered = topId && failing.size > 0 ? orderTrace(edges, topId, failing) : [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (ordered.length === 0) {
    return (
      <p className="text-sm text-(--muted)">
        No causal path available — needs a ranked commit and a failing test.
      </p>
    );
  }
  return (
    <ol aria-label="causal path from commit to failing test">
      {ordered.map((id, i) => {
        const node = byId.get(id);
        return (
          <li key={id} className="flex items-stretch gap-0">
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className="mt-4 h-3 w-3 rounded-full bg-(--accent)" />
              {i < ordered.length - 1 && <span className="w-0.5 flex-1 bg-(--border)" />}
            </div>
            <div className="mb-4 ml-3 flex-1 rounded border border-(--border) bg-(--surface) p-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-(--muted)">
                step {i + 1} · {node?.type ?? "unknown"}
              </p>
              <p className="font-mono text-sm">{node?.label ?? id}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
