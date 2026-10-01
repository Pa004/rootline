import { BENCHMARK_ROWS, BENCHMARK_SUMMARY } from "../data/corpus";

export function Benchmarks() {
  return (
    <div className="max-w-4xl">
      <p className="text-sm text-(--muted)">
        Top-1 {BENCHMARK_SUMMARY.top1.toFixed(2)} · Top-3 {BENCHMARK_SUMMARY.top3.toFixed(2)} ·
        MRR {BENCHMARK_SUMMARY.mrr.toFixed(2)} over {BENCHMARK_SUMMARY.cases} corpus cases.
        Weights: temporal 0.20, structural 0.25, execution 0.25, test 0.15, semantic
        0.10, contradiction 0.08 (grid-search confirmed).
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <caption className="sr-only">Benchmark results per corpus case</caption>
        <thead>
          <tr className="text-left text-(--muted)">
            <th className="border-b border-(--border) p-2">Case</th>
            <th className="border-b border-(--border) p-2">Language</th>
            <th className="border-b border-(--border) p-2">Rank</th>
            <th className="border-b border-(--border) p-2">Top-1</th>
          </tr>
        </thead>
        <tbody>
          {BENCHMARK_ROWS.map((row) => (
            <tr key={row.case}>
              <td className="border-b border-(--border) p-2 font-mono">{row.case}</td>
              <td className="border-b border-(--border) p-2">{row.language}</td>
              <td className="border-b border-(--border) p-2 font-mono">{row.rank}</td>
              <td className="border-b border-(--border) p-2">{row.top1 ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
