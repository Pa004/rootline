import { useState } from "react";
import { CORPUS } from "../data/corpus";

export function Examples() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = CORPUS.find((c) => c.id === selectedId);
  return (
    <div className="max-w-4xl">
      <p className="text-sm text-(--muted)">
        Planted regressions with known ground truth — run them with{" "}
        <code className="font-mono">rootline benchmark</code>. Select one for its evidence
        trail.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2" role="list">
        {CORPUS.map((c) => (
          <article
            key={c.id}
            role="listitem"
            aria-current={c.id === selectedId ? true : undefined}
            onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedId(c.id === selectedId ? null : c.id);
              }
            }}
            tabIndex={0}
            className={`reveal-on-scroll cursor-pointer rounded border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              c.id === selectedId ? "border-(--text)" : "border-(--border)"
            } bg-(--surface)`}
          >
            <p className="font-mono text-xs text-(--muted)">
              {c.id} · {c.language}
            </p>
            <h3 className="font-display font-bold">{c.title}</h3>
            <p className="mt-1 text-sm">{c.story}</p>
            <p className="mt-2 font-mono text-xs">
              culprit: {c.culprit} · signals: {c.signals.join(", ")}
            </p>
          </article>
        ))}
      </div>
      {selected && (
        <section
          aria-label={`evidence trail for ${selected.id}`}
          aria-live="polite"
          className="mt-4 rounded border border-(--border) bg-(--surface) p-4 shadow-(--shadow)"
        >
          <h3 className="font-display font-bold">
            {selected.id} — {selected.title}
          </h3>
          <p className="mt-1 font-mono text-sm">culprit: {selected.culprit}</p>
          <p className="mt-1 text-sm">{selected.verdict}</p>
          <p className="mt-1 text-sm text-(--muted)">
            signals: {selected.signals.join(" + ")}
          </p>
        </section>
      )}
    </div>
  );
}
