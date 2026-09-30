import { Suspense, lazy, useEffect, useState } from "react";
import { useUi, viewFromHash, type ViewId } from "./store";
import { CandidatesTable } from "./components/CandidatesTable";
import { Explanation } from "./components/Explanation";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Benchmarks } from "./components/Benchmarks";
import { Examples } from "./components/Examples";
import { Tutorial } from "./components/Tutorial";
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

const VIEW_SUBTITLES: Record<ViewId, string> = {
  home: "Live demo · one planted regression, fully worked.",
  analysis: "Commits ranked by evidence strength (0–1, higher means stronger).",
  benchmarks: "How often the true culprit ranks first. MRR averages 1 ÷ rank.",
  examples: "Planted regressions with known answers — select one.",
  tutorial: "Three commands from zero to verdict, about five minutes.",
};

const VIEW_TITLES: Record<ViewId, string> = {
  home: "Dashboard",
  analysis: "Analysis",
  benchmarks: "Benchmarks",
  examples: "Examples",
  tutorial: "Tutorial",
};

export default function App() {
  const { tab, setTab, view, setView, selectedSha, theme, toggleTheme, reduceMotion, toggleMotion } =
    useUi();
  const { analysis, live } = useAnalysis();
  const selected = analysis.candidates.find((c) => c.commit_sha === selectedSha);
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="flex min-h-screen bg-(--bg) font-sans text-(--text)">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-40 focus:rounded focus:bg-(--text) focus:px-3 focus:py-1 focus:text-(--bg)"
      >
        Skip to results
      </a>
      <Sidebar
        view={view}
        setView={setView}
        live={live}
        theme={theme}
        toggleTheme={toggleTheme}
        reduceMotion={reduceMotion}
        toggleMotion={toggleMotion}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <div className="w-full px-4 md:px-8">
          <div className="flex items-center gap-3 py-3 md:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="open navigation"
              className="rounded bg-(--surface-2) px-3 py-1 text-sm"
            >
              Menu
            </button>
            <p className="font-display text-lg font-bold">Rootline</p>
          </div>
          <header className="pt-4">
            <h1 className="font-display text-2xl font-bold">{VIEW_TITLES[view]}</h1>
            <p className="text-sm text-(--muted)">
              {VIEW_SUBTITLES[view]}{" "}
              {view === "analysis" && (
                <>Trace the change. Find the cause{live ? " · live" : " · sample data"}.</>
              )}
            </p>
          </header>
          {view === "analysis" && (
            <nav aria-label="views" className="mt-3 flex gap-2">
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
          <footer className="mt-10 flex flex-wrap gap-x-4 gap-y-1 border-t border-(--border) py-4 font-mono text-xs text-(--muted)">
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
      </div>
    </div>
  );
}
