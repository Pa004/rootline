import { Suspense, lazy, useEffect } from "react";
import { useUi } from "./store";
import { CandidatesTable } from "./components/CandidatesTable";
import { Explanation } from "./components/Explanation";
import { useAnalysis } from "./useAnalysis";
import type { TabId } from "./types";

const GraphExplorer = lazy(() =>
  import("./graph/GraphExplorer").then((m) => ({ default: m.GraphExplorer })),
);

const TABS: { id: TabId; label: string }[] = [
  { id: "candidates", label: "Candidates" },
  { id: "graph", label: "Graph explorer" },
  { id: "report", label: "Report" },
];

export default function App() {
  const { tab, setTab, selectedSha, theme, toggleTheme } = useUi();
  const { analysis, live } = useAnalysis();
  const selected = analysis.candidates.find((c) => c.commit_sha === selectedSha);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <div className="mx-auto max-w-5xl p-4 text-(--text)">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:rounded focus:bg-(--text) focus:px-3 focus:py-1 focus:text-(--bg)"
      >
        Skip to results
      </a>
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Rootline</h1>
          <p className="text-sm text-(--muted)">
            Trace the change. Find the cause{live ? " · live" : " · sample data"}.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          aria-label={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="rounded bg-(--surface-2) px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </header>
      <nav aria-label="views" className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${
              tab === t.id ? "bg-(--text) text-(--bg)" : "bg-(--surface-2)"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main id="main-content" className="mt-4" tabIndex={-1}>
        {tab === "candidates" && <CandidatesTable candidates={analysis.candidates} />}
        {tab === "graph" && (
          <Suspense fallback={<p className="text-(--muted)">Loading graph…</p>}>
            <GraphExplorer />
          </Suspense>
        )}
        {tab === "report" && <Explanation candidate={selected ?? analysis.candidates[0]} />}
      </main>
    </div>
  );
}
