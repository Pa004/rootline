import { CORPUS } from "../data/corpus";

export function Examples() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Examples</h2>
      <p className="text-sm text-(--muted)">
        Planted regressions with known ground truth — run them with{" "}
        <code className="font-mono">rootline benchmark</code>.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {CORPUS.map((c) => (
          <article key={c.id} className="rounded border border-(--border) bg-(--surface) p-4">
            <p className="font-mono text-xs text-(--muted)">
              {c.id} · {c.language}
            </p>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm">{c.story}</p>
            <p className="mt-2 font-mono text-xs">
              culprit: {c.culprit} · signals: {c.signals.join(", ")}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
