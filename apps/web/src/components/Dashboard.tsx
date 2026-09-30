import { useState } from "react";
import { useIndex } from "../useIndex";
import { useAnalysis } from "../useAnalysis";
import { useCountUp } from "../motion";
import { BENCHMARK_SUMMARY, CORPUS } from "../data/corpus";
import type { ViewId } from "../store";
import { Tour } from "./Tour";
import { ScoreBar } from "./CandidatesTable";

const WEIGHTS: [string, number][] = [
  ["temporal", 0.2],
  ["structural", 0.25],
  ["execution", 0.25],
  ["test", 0.15],
  ["semantic", 0.1],
  ["contradiction", 0.08],
];

const QUICKSTART = "rootline analyze ./repo --test-results results.xml --baseline main";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-(--border) bg-(--surface) p-4">
      <p className="text-sm text-(--muted)">{label}</p>
      <p className="font-mono text-2xl">{value}</p>
      {sub && <p className="truncate text-xs text-(--muted)" title={sub}>{sub}</p>}
    </div>
  );
}

export function Dashboard({ go }: { go: (view: ViewId) => void }) {
  const index = useIndex();
  const { analysis, live } = useAnalysis();
  const top = analysis.candidates[0];
  const analyses = useCountUp(index.length, 0);
  const topScore = useCountUp(top?.score ?? 0);
  const mrr = useCountUp(BENCHMARK_SUMMARY.mrr);
  const [touring, setTouring] = useState(false);
  const [copied, setCopied] = useState(false);
  const supporting = top?.evidence.filter((e) => e.points > 0).length ?? 0;
  const contradicting = top?.evidence.filter((e) => e.points < 0).length ?? 0;
  return (
    <div>
      <section
        aria-label="quickstart"
        className="rounded border border-(--border) bg-(--surface) p-4"
      >
        <p className="text-sm text-(--muted)">
          Give Rootline a repo plus a failing test — it ranks the commits that most
          likely caused it, with evidence for and against.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <pre className="flex-1 overflow-x-auto rounded bg-(--surface-2) p-2 font-mono text-sm">
            {QUICKSTART}
          </pre>
          <button
            onClick={() =>
              navigator.clipboard.writeText(QUICKSTART).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                },
                () => undefined,
              )
            }
            className="rounded bg-(--surface-2) px-3 py-1 text-sm"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <section
          aria-label="top candidate spotlight"
          className="rounded border border-(--border) bg-(--surface) p-4 lg:col-span-7"
        >
          {top ? (
            <>
              <p className="text-sm text-(--muted)">Top candidate</p>
              <p className="mt-1 font-mono text-lg">
                {top.commit_sha.slice(0, 12)}{" "}
                <span className="font-sans text-base">{top.message.split("\n")[0]}</span>
              </p>
              <p className="mt-1 font-mono text-3xl">{topScore}</p>
              <p className="text-xs text-(--muted)">evidence strength, not a probability</p>
              <div className="mt-2">
                <ScoreBar candidate={top} />
              </div>
              <p className="mt-2 text-sm text-(--muted)">
                {supporting} supporting · {contradicting} contradicting
              </p>
              <button
                onClick={() => go("analysis")}
                className="mt-3 rounded bg-(--text) px-3 py-1 text-sm text-(--bg)"
              >
                Open analysis
              </button>
            </>
          ) : (
            <p className="text-(--muted)">No candidates yet.</p>
          )}
        </section>
        <div className="grid grid-cols-2 gap-3 lg:col-span-5">
          <Kpi label="Analyses" value={analyses} sub={live ? "live" : "sample data"} />
          <Kpi
            label="Corpus MRR"
            value={mrr}
            sub={`${BENCHMARK_SUMMARY.cases} cases, top-1 ${BENCHMARK_SUMMARY.top1.toFixed(2)}`}
          />
          <Kpi label="Languages" value="2" sub="Python + TypeScript" />
          <Kpi label="Evidence kinds" value="6" sub="for and against" />
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <section aria-label="recent analyses" className="lg:col-span-7">
          <h2 className="font-semibold">Recent analyses</h2>
          <ul className="mt-2">
            {index.map((entry) => (
              <li
                key={entry.id}
                className="flex items-baseline justify-between gap-2 border-b border-(--border) py-2 font-mono text-sm"
              >
                <button onClick={() => go("analysis")} className="truncate hover:underline">
                  {entry.id}
                </button>
                <span className="shrink-0 text-(--muted)">
                  {entry.candidate_count} candidates · top {entry.top_score?.toFixed(2) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="benchmark snapshot" className="lg:col-span-5">
          <h2 className="font-semibold">Benchmark snapshot</h2>
          <ul className="mt-2 space-y-1">
            {CORPUS.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded bg-(--surface) px-2 py-1 font-mono text-xs"
              >
                <button onClick={() => go("benchmarks")} className="truncate hover:underline">
                  {c.id}
                </button>
                <span className="shrink-0 rounded bg-(--surface-2) px-2 py-0.5">
                  rank #1 · {c.language}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <h2 className="mt-6 font-semibold">Evidence weights</h2>
      <ul className="mt-2 flex flex-wrap gap-2 font-mono text-xs" aria-label="default evidence weights">
        {WEIGHTS.map(([kind, weight]) => (
          <li key={kind} className="rounded bg-(--surface-2) px-2 py-1">
            {kind} {weight >= 0 ? "+" : ""}
            {weight.toFixed(2)}
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Start here</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => setTouring(true)}
          className="rounded bg-(--surface-2) px-3 py-1 text-sm"
        >
          Start guided tour
        </button>
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
      {touring && <Tour onClose={() => setTouring(false)} />}
    </div>
  );
}
