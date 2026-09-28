import { useIndex } from "../useIndex";
import { useAnalysis } from "../useAnalysis";
import { BENCHMARK_SUMMARY } from "../data/corpus";
import type { ViewId } from "../store";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-(--border) bg-(--surface) p-4">
      <p className="text-sm text-(--muted)">{label}</p>
      <p className="font-mono text-2xl">{value}</p>
      {sub && <p className="text-xs text-(--muted)">{sub}</p>}
    </div>
  );
}

export function Dashboard({ go }: { go: (view: ViewId) => void }) {
  const index = useIndex();
  const { analysis, live } = useAnalysis();
  const top = analysis.candidates[0];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Analyses" value={String(index.length)} sub={live ? "live" : "sample data"} />
        <Kpi label="Top score" value={top ? top.score.toFixed(2) : "—"} sub={top?.message} />
        <Kpi
          label="Corpus MRR"
          value={BENCHMARK_SUMMARY.mrr.toFixed(2)}
          sub={`${BENCHMARK_SUMMARY.cases} cases, top-1 ${BENCHMARK_SUMMARY.top1.toFixed(2)}`}
        />
        <Kpi label="Languages" value="2" sub="Python + TypeScript" />
      </div>
      <h2 className="mt-6 font-semibold">Recent analyses</h2>
      <ul className="mt-2">
        {index.map((entry) => (
          <li key={entry.id} className="border-b border-(--border) py-2 font-mono text-sm">
            <button onClick={() => go("analysis")} className="hover:underline">
              {entry.id}
            </button>
            <span className="text-(--muted)">
              {" "}
              · {entry.candidate_count} candidates · top{" "}
              {entry.top_score?.toFixed(2) ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Start here</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => go("tutorial")}
          className="rounded bg-(--text) px-3 py-1 text-sm text-(--bg)"
        >
          Analyze your first repo
        </button>
        <button
          onClick={() => go("examples")}
          className="rounded bg-(--surface-2) px-3 py-1 text-sm"
        >
          Browse examples
        </button>
      </div>
    </div>
  );
}
