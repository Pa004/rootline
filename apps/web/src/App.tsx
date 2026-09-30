import { Suspense, lazy, useEffect } from "react";
import { useUi, viewFromHash, type ViewId } from "./store";
import { CandidatesTable } from "./components/CandidatesTable";
import { Explanation } from "./components/Explanation";
import { Dashboard } from "./components/Dashboard";
import { Benchmarks } from "./components/Benchmarks";
import { Examples } from "./components/Examples";
import { Tutorial } from "./components/Tutorial";
import { useAnalysis } from "./useAnalysis";
import type { TabId } from "./types";

const GraphExplorer = lazy(() =>
  import("./graph/GraphExplorer").then((m) => ({ default: m.GraphExplorer })),
);

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "home", label: "Dashboard" },
  { id: "analysis", label: "Analysis" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "examples", label: "Examples" },
  { id: "tutorial", label: "Tutorial" },
];

const TABS: { id: TabId; label: string }[] = [
  { id: "candidates", label: "Candidates" },
  { id: "graph", label: "Graph explorer" },
  { id: "report", label: "Report" },
];

export default function App() {
  const { tab, setTab, view, setView, selectedSha, theme, toggleTheme, reduceMotion, toggleMotion } =
    useUi();
  const { analysis, live } = useAnalysis();
  const selected = analysis.candidates.find((c) => c.commit_sha === selectedSha);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const sync = () => {
      const hashed = viewFromHash();
      useUi.setState({ view: hashed });
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <div className="mx-auto max-w-6xl p-4 text-(--text)">
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
            Trace the change. Find the cause{live ? (
              <>
                {" "}·{" "}
                <span className="live-dot inline-block" aria-hidden="true">
                  ●
                </span>{" "}
                live
              </>
            ) : (
              " · sample data"
            )}
            .
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleMotion}
            aria-pressed={reduceMotion}
            aria-label={reduceMotion ? "enable motion" : "reduce motion"}
            className="rounded bg-(--surface-2) px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {reduceMotion ? "Motion on" : "Reduce motion"}
          </button>
          <button
            onClick={toggleTheme}
            aria-pressed={theme === "light"}
            aria-label={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="rounded bg-(--surface-2) px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>
      <nav aria-label="sections" className="mt-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={`rounded px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${
              view === v.id ? "bg-(--text) text-(--bg)" : "bg-(--surface-2)"
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>
      {view === "analysis" && (
        <nav aria-label="views" className="mt-2 flex gap-2">
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
      )}
      <main id="main-content" tabIndex={-1} className="mt-4">
        <div key={`${view}-${tab}`} className={reduceMotion ? undefined : "animate-view"}>
          {view === "home" && <Dashboard go={setView} />}
          {view === "analysis" && tab === "candidates" && (
            <CandidatesTable candidates={analysis.candidates} />
          )}
          {view === "analysis" && tab === "graph" && (
            <Suspense fallback={<p className="text-(--muted)">Loading graph…</p>}>
              <GraphExplorer />
            </Suspense>
          )}
          {view === "analysis" && tab === "report" && (
            <Explanation candidate={selected ?? analysis.candidates[0]} />
          )}
        {view === "benchmarks" && <Benchmarks />}
        {view === "examples" && <Examples />}
        {view === "tutorial" && <Tutorial />}
        </div>
      </main>
      <footer className="mt-10 flex flex-wrap gap-x-4 gap-y-1 border-t border-(--border) pt-3 text-sm text-(--muted)">
        <span>Rootline · local-first causal analysis</span>
        <a className="hover:underline" href="https://github.com/Pa004/rootline">
          GitHub
        </a>
        <a className="hover:underline" href="https://pypi.org/project/rootline/">
          PyPI
        </a>
        <a
          className="hover:underline"
          href="https://rootline-api.pablodo004.workers.dev/api/v1/analyses"
        >
          Demo API
        </a>
      </footer>
    </div>
  );
}
