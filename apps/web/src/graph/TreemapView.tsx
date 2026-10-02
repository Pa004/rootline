import { useGraphData } from "./useGraphData";
import type { CandidateScore } from "../types";

/** Nested proportional bars: ranked commits → their changed files. */
export function TreemapView({ candidates = [] }: { candidates?: CandidateScore[] }) {
  const { edges, ranks } = useGraphData(candidates);
  const ranked = [...ranks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(...ranked.map(([, s]) => s), 0.0001);
  const filesOf = (commitId: string) =>
    edges.filter((e) => e.source === commitId && e.kind === "changes").map((e) => e.target);
  if (ranked.length === 0) {
    return (
      <p className="text-sm text-(--muted)">
        No ranked commits yet — run an analysis first.
      </p>
    );
  }
  return (
    <div role="list" aria-label="evidence treemap by commit">
      {ranked.map(([id, score]) => (
        <div
          key={id}
          role="listitem"
          aria-label={`${id} score ${score.toFixed(2)}`}
          className="mb-2 rounded border border-(--border) bg-(--surface) p-3"
          style={{ width: `${Math.max((score / max) * 100, 18)}%`, minWidth: "16rem" }}
        >
          <p className="font-mono text-sm">
            {id.replace(/^commit:/, "").slice(0, 12)} · {score.toFixed(2)}
          </p>
          <p className="mt-1 font-mono text-xs text-(--muted)">
            {filesOf(id).join(", ") || "no files"}
          </p>
        </div>
      ))}
    </div>
  );
}
