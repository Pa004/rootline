import {
  BookOpen,
  Command,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { ViewId } from "../store";

const ITEMS: { id: ViewId; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "home", label: "Dashboard", hint: "Overview", icon: LayoutDashboard },
  { id: "analysis", label: "Analysis", hint: "Candidates", icon: Search },
  { id: "benchmarks", label: "Benchmarks", hint: "Accuracy", icon: Gauge },
  { id: "examples", label: "Examples", hint: "Stories", icon: BookOpen },
  { id: "tutorial", label: "Tutorial", hint: "Guide", icon: GraduationCap },
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
  onPalette: () => void;
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
  onPalette,
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
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                onClose();
              }}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`flex items-center gap-3 rounded px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${
                active ? "bg-(--text) text-(--bg)" : "hover:bg-(--surface-2)"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-8 w-1 shrink-0 rounded ${active ? "bg-(--accent)" : "bg-transparent"}`}
              />
              <Icon size={18} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block font-mono text-[11px] uppercase tracking-widest opacity-70">
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-(--border) pt-3">
        <button
          onClick={onPalette}
          aria-label="open command palette"
          className="flex items-center gap-2 rounded bg-(--surface-2) px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Command size={15} aria-hidden="true" />
          Commands
          <kbd className="ml-auto font-mono text-xs opacity-70">Ctrl K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          aria-label={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex items-center gap-2 rounded bg-(--surface-2) px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {theme === "dark" ? (
            <Sun size={15} aria-hidden="true" />
          ) : (
            <Moon size={15} aria-hidden="true" />
          )}
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
