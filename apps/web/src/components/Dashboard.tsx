import { useState } from "react";
import {
  Database,
  FolderGit2,
  Languages,
  Network,
  Scale,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useIndex } from "../useIndex";
import { useAnalysis } from "../useAnalysis";
import { useCountUp } from "../motion";
import { BENCHMARK_SUMMARY, CORPUS } from "../data/corpus";
import type { ViewId } from "../store";
import { Tour } from "./Tour";
import { ScoreBar } from "./CandidatesTable";
import { ScoreGauge } from "./ScoreGauge";

const WEIGHTS: [string, number][] = [
  ["temporal", 0.2],
  ["structural", 0.25],
  ["execution", 0.25],
  ["test", 0.15],
  ["semantic", 0.1],
  ["contradiction", 0.08],
];

const QUICKSTART = "rootline analyze ./repo --test-results results.xml --baseline main";

const HOW_IT_WORKS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "1. Ingest",
    text: "Repo history plus a JUnit report go in — commits, files and test results.",
    icon: FolderGit2,
  },
  {
    title: "2. Evidence graph",
    text: "Commits, files, symbols and tests linked by changes, imports and coverage.",
    icon: Network,
  },
  {
    title: "3. Ranked verdict",
    text: "Candidates scored with evidence for and against. Nothing is a probability.",
    icon: Trophy,
  },
];

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  index,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  index: number;
}) {
  return (
    <div
      className="rise-in rounded border border-(--border) bg-(--surface) p-4 shadow-(--shadow)"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <p className="flex items-center gap-1 text-sm text-(--muted)">
        <Icon size={14} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
      {sub && <p className="truncate text-xs text-(--muted)" title={sub}>{sub}</p>}
    </div>
  );
}

export function Dashboard({ go }: { go: (view: ViewId) => void }) {
  const index = useIndex();
  const { analysis, live } = useAnalysis();
  const top = analysis.candidates[0];
  const rest = analysis.candidates.slice(1, 4);
  const analyses = useCountUp(index.length, 0);
  const mrr = useCountUp(BENCHMARK_SUMMARY.mrr);
  const [touring, setTouring] = useState(false);
  const [copied, setCopied] = useState(false);
  const supporting = top?.evidence.filter((e) => e.points > 0).length ?? 0;
  const contradicting = top?.evidence.filter((e) => e.points < 0).length ?? 0;
  return (
    <div>
      {top && (
        <section
          aria-label="verdict"
          className="@container rounded border border-(--border) bg-(--surface) shadow-(--shadow) p-5"
        >
          <div className="flex flex-col gap-4 @min-[560px]:flex-row @min-[560px]:items-center">
          <ScoreGauge score={top.score} label="evidence strength" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--muted)">
              Most probable cause
            </p>
            <p className="mt-1 font-display text-xl font-bold">
              {top.message.split("\n")[0]}{" "}
              <code className="font-mono text-sm font-normal text-(--muted)">
                {top.commit_sha.slice(0, 12)}
              </code>
            </p>
            <div className="mt-2 max-w-xl">
              <ScoreBar candidate={top} />
            </div>
            <p className="mt-2 text-sm text-(--muted)">
              {supporting} supporting · {contradicting} contradicting · not a probability
            </p>
            <button
              onClick={() => go("analysis")}
              className="mt-3 rounded bg-(--text) px-3 py-1 text-sm text-(--bg)"
            >
              Open analysis
            </button>
          </div>
          </div>
        </section>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          <section
            aria-label="quickstart"
            className="rounded border border-(--border) bg-(--surface) p-4 shadow-(--shadow)"
          >
            <p className="text-sm text-(--muted)">
              Give Rootline a repo plus a failing test — it ranks the commits that most
              likely caused it, with evidence for and against.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <pre
                tabIndex={0}
                aria-label={`command: ${QUICKSTART}`}
                className="flex-1 overflow-x-auto rounded bg-(--surface-2) p-2 font-mono text-sm"
              >
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

          {rest.length > 0 && (
            <section
              aria-label="more candidates"
              className="rounded border border-(--border) bg-(--surface) p-4 shadow-(--shadow)"
            >
              <h2 className="font-display text-base font-bold">Also suspected</h2>
              <ul className="mt-2 space-y-2">
                {rest.map((c) => (
                  <li
                    key={c.commit_sha}
                    className="flex items-baseline justify-between gap-3 font-mono text-sm"
                  >
                    <button onClick={() => go("analysis")} className="truncate hover:underline">
                      {c.commit_sha.slice(0, 12)} · {c.message.split("\n")[0]}
                    </button>
                    <span className="shrink-0 text-(--muted)">{c.score.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="recent analyses">
            <h2 className="font-display text-base font-bold">Recent analyses</h2>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {index.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded border border-(--border) bg-(--surface) shadow-(--shadow) p-3"
                >
                  <button
                    onClick={() => go("analysis")}
                    className="font-mono text-sm hover:underline"
                  >
                    {entry.id}
                  </button>
                  <p className="mt-1 font-mono text-xs text-(--muted)">
                    {entry.candidate_count} candidates · top {entry.top_score?.toFixed(2) ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="how it works">
            <h2 className="font-display text-base font-bold">How it works</h2>
            <ol className="mt-2 grid gap-2 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="rise-in rounded border border-(--border) bg-(--surface) p-3 shadow-(--shadow)"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <p className="flex items-center gap-2 font-medium">
                      <Icon size={16} aria-hidden="true" className="text-(--accent-ink)" />
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm text-(--muted)">{step.text}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="space-y-3 lg:col-span-4">
          <div className="grid grid-cols-2 gap-3">
          <Kpi label="Analyses" value={analyses} sub={live ? "live" : "sample data"} icon={Database} index={0} />
          <Kpi
            label="Corpus MRR"
            value={mrr}
            sub={`${BENCHMARK_SUMMARY.cases} cases · top-1 ${BENCHMARK_SUMMARY.top1.toFixed(2)}`}
            icon={Trophy}
            index={1}
          />
          <Kpi label="Languages" value="2" sub="Python + TypeScript" icon={Languages} index={2} />
          <Kpi label="Evidence kinds" value="6" sub="for and against" icon={Scale} index={3} />
          </div>

          <section
            aria-label="benchmark snapshot"
            className="rounded border border-(--border) bg-(--surface) p-4 shadow-(--shadow)"
          >
            <h2 className="font-display text-base font-bold">Benchmarks</h2>
            <ul className="mt-2 space-y-1">
              {CORPUS.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 font-mono text-xs"
                >
                  <button onClick={() => go("benchmarks")} className="truncate hover:underline">
                    {c.id}
                  </button>
                  <span className="shrink-0 rounded bg-(--surface-2) px-2 py-0.5">
                    #1 · {c.language}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-2">
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
      </div>

      <section
        aria-label="default evidence weights"
        className="mt-3 rounded border border-(--border) bg-(--surface) p-4 shadow-(--shadow)"
      >
        <h2 className="font-display text-base font-bold">Evidence weights</h2>
        <p className="mt-1 text-sm text-(--muted)">
          How each signal contributes to the score. Tune them in{" "}
          <code className="font-mono">rootline.toml</code>.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
          {WEIGHTS.map(([kind, weight]) => (
            <li key={kind} className="rounded bg-(--surface-2) px-2 py-1">
              {kind} +{weight.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
