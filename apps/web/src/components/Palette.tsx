import { useEffect, useMemo, useRef, useState } from "react";
import { useUi, type ViewId } from "../store";

interface Command {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function Palette() {
  const open = useUi((s) => s.paletteOpen);
  const setPalette = useUi((s) => s.setPalette);
  const setView = useUi((s) => s.setView);
  const toggleTheme = useUi((s) => s.toggleTheme);
  const toggleMotion = useUi((s) => s.toggleMotion);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(() => {
    const go = (view: ViewId, label: string): Command => ({
      id: `go-${view}`,
      label: `Go to ${label}`,
      hint: "view",
      run: () => setView(view),
    });
    return [
      go("home", "Dashboard"),
      go("analysis", "Analysis"),
      go("benchmarks", "Benchmarks"),
      go("examples", "Examples"),
      go("tutorial", "Tutorial"),
      { id: "theme", label: "Toggle theme", hint: "ui", run: toggleTheme },
      { id: "motion", label: "Toggle motion", hint: "ui", run: toggleMotion },
      {
        id: "copy",
        label: "Copy quickstart command",
        hint: "clipboard",
        run: () => {
          navigator.clipboard
            .writeText("rootline analyze ./repo --test-results results.xml --baseline main")
            .catch(() => undefined);
        },
      },
    ];
  }, [setView, toggleTheme, toggleMotion]);

  useEffect(() => {
    if (open) {
      setQuery("");
      inputRef.current?.focus();
    }
  }, [open ]);

  if (!open) return null;
  const matches = commands.filter((c) =>
    `${c.label} ${c.hint}`.toLowerCase().includes(query.toLowerCase()),
  );
  const run = (command: Command) => {
    command.run();
    setPalette(false);
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="command palette"
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4"
      onClick={() => setPalette(false)}
    >
      <div
        className="w-full max-w-lg rounded border border-(--border) bg-(--surface) shadow-(--shadow) p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) run(matches[0]);
            if (e.key === "Escape") setPalette(false);
          }}
          placeholder="Type a command… (Esc to close)"
          aria-label="command search"
          className="w-full rounded bg-(--surface-2) px-3 py-2 text-sm focus-visible:outline-2"
        />
        <ul role="listbox" aria-label="commands" className="mt-2 max-h-64 overflow-auto">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => run(c)}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-(--surface-2)"
              >
                {c.label}
                <span className="font-mono text-xs text-(--muted)">{c.hint}</span>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-(--muted)">No matching command.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
