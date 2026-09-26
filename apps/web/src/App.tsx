import { useUi } from "./store";
import { SAMPLE } from "./data/sample";
import { CandidatesTable } from "./components/CandidatesTable";
import { Explanation } from "./components/Explanation";
import type { TabId } from "./types";

const TABS: { id: TabId; label: string }[] = [
  { id: "candidates", label: "Candidates" },
  { id: "graph", label: "Graph explorer" },
  { id: "report", label: "Report" },
];

export default function App() {
  const { tab, setTab, selectedSha } = useUi();
  const selected = SAMPLE.candidates.find((c) => c.commit_sha === selectedSha);
  return (
    <div className="mx-auto max-w-5xl p-4 text-zinc-100">
      <header>
        <h1 className="text-xl font-bold">Rootline</h1>
        <p className="text-sm text-zinc-400">Trace the change. Find the cause.</p>
      </header>
      <nav aria-label="views" className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded px-3 py-1 text-sm ${
              tab === t.id ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="mt-4">
        {tab === "candidates" && <CandidatesTable candidates={SAMPLE.candidates} />}
        {tab === "graph" && (
          <p className="text-zinc-400">
            Cytoscape graph explorer lands in P13b — see reference/design-proposal.html.
          </p>
        )}
        {tab === "report" && <Explanation candidate={selected ?? SAMPLE.candidates[0]} />}
      </main>
    </div>
  );
}
