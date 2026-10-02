import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { EvidenceNodeData } from "./flowRf";
import type { GraphNode } from "./model";

/** Accent per node kind — mirrors the old canvas palette as DOM. */
const ACCENT: Record<GraphNode["type"], string> = {
  commit: "#38bdf8",
  file: "#a78bfa",
  symbol: "#34d399",
  test: "#fbbf24",
};

/**
 * Card node for evidence graph entities. Plain DOM (not canvas) so
 * labels stay crisp, text is selectable and screen readers see it.
 */
export function EvidenceNode({ data, selected }: NodeProps) {
  const d = data as unknown as EvidenceNodeData;
  const accent = ACCENT[d.nodeType];
  const failed = d.nodeType === "test" && d.outcome === "failed";
  return (
    <div
      className={`w-44 rounded-lg border bg-white shadow-sm dark:bg-zinc-900 ${
        selected ? "ring-2 ring-offset-1 ring-sky-400" : "border-zinc-200 dark:border-zinc-700"
      } ${failed ? "border-red-400" : ""}`}
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-400" />
      <div className="px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
          >
            {d.nodeType}
          </span>
          {typeof d.score === "number" && (
            <span
              className="ml-auto rounded bg-red-100 px-1 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
              title={`suspicion score ${d.score.toFixed(2)}`}
            >
              {d.score.toFixed(2)}
            </span>
          )}
          {failed && (
            <span className="ml-auto rounded bg-red-600 px-1 text-[10px] font-bold text-white">
              FAIL
            </span>
          )}
        </div>
        <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100" title={d.label}>
          {d.label}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-zinc-400" />
    </div>
  );
}
