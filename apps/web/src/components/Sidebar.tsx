import type { ViewId } from "../store";

const ITEMS: { id: ViewId; label: string; hint: string }[] = [
  { id: "home", label: "Dashboard", hint: "Overview" },
  { id: "analysis", label: "Analysis", hint: "Candidates" },
  { id: "benchmarks", label: "Benchmarks", hint: "Accuracy" },
  { id: "examples", label: "Examples", hint: "Stories" },
  { id: "tutorial", label: "Tutorial", hint: "Guide" },
];

interface SidebarProps {
  view: ViewId;
  setView: (view: ViewId) => void;
  live: boolean;
  theme: string;
  toggleTheme: () => void;
  reduceMotion: boolean;
  toggleMotion: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  view,
  setView,
  live,
  theme,
  toggleTheme,
  reduceMotion,
  toggleMotion,
  open,
  onClose,
}: SidebarProps) {
  return (
    <aside
      aria-label="primary"
      className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-(--border) bg-(--surface) p-4 transition-transform md:static md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div>
        <p className="font-display text-xl font-bold">Rootline</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-(--muted)">
          <span className="live-dot inline-block" aria-hidden="true">
            ●
          </span>
          {live ? "live" : "sample data"}
        </p>
      </div>
      <nav aria-label="sections" className="mt-6 flex flex-col gap-1">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id);
              onClose();
            }}
            aria-current={view === item.id ? "page" : undefined}
            aria-label={item.label}
            className={`rounded px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${
              view === item.id ? "bg-(--text) text-(--bg)" : "hover:bg-(--surface-2)"
            }`}
          >
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="block font-mono text-[11px] uppercase tracking-widest opacity-70">
              {item.hint}
            </span>
          </button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-(--border) pt-3">
        <button
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          aria-label={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="rounded bg-(--surface-2) px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={toggleMotion}
          aria-pressed={reduceMotion}
          aria-label={reduceMotion ? "enable motion" : "reduce motion"}
          className="rounded bg-(--surface-2) px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {reduceMotion ? "Motion on" : "Reduce motion"}
        </button>
      </div>
    </aside>
  );
}
