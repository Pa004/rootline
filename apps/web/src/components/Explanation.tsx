import type { CandidateScore } from "../types";

export function Explanation({ candidate }: { candidate: CandidateScore | undefined }) {
  if (!candidate) {
    return <p className="text-(--muted)">Select a candidate to inspect its evidence.</p>;
  }
  const supporting = candidate.evidence.filter((e) => e.points > 0);
  const contradicting = candidate.evidence.filter((e) => e.points < 0);
  return (
    <section aria-label="explanation">
      <h2 className="font-mono text-lg">
        {candidate.commit_sha.slice(0, 12)} — {candidate.score.toFixed(2)}
      </h2>
      <p className="text-(--muted)">Evidence strength, not a probability.</p>
      <h3 className="mt-4 font-display font-bold">Evidence</h3>
      <ul>
        {supporting.map((e) => (
          <li key={e.kind} className="text-emerald-700 dark:text-emerald-300">
            + [{e.kind}] {e.detail} ({e.points >= 0 ? "+" : ""}
            {e.points.toFixed(2)})
          </li>
        ))}
      </ul>
      {contradicting.length > 0 && (
        <>
          <h3 className="mt-4 font-display font-bold">Contradictory evidence</h3>
          <ul>
            {contradicting.map((e) => (
              <li key={e.kind} className="text-red-700 dark:text-red-300">
                - [{e.kind}] {e.detail} ({e.points.toFixed(2)})
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="mt-4 font-display font-bold">Suggested verification</h3>
      <p className="text-sm">
        Revert commit <code className="font-mono">{candidate.commit_sha.slice(0, 12)}</code>{" "}
        in a throwaway copy and rerun the failing test:
      </p>
      <pre
        tabIndex={0}
        aria-label="suggested verify command"
        className="mt-2 max-w-3xl overflow-x-auto rounded bg-(--surface-2) p-2 font-mono text-sm"
      >
        rootline verify {candidate.commit_sha.slice(0, 12)} --test &lt;failing-test&gt;
      </pre>
    </section>
  );
}
