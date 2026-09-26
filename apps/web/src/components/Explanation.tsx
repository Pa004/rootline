import type { CandidateScore } from "../types";

export function Explanation({ candidate }: { candidate: CandidateScore | undefined }) {
  if (!candidate) {
    return <p className="text-zinc-400">Select a candidate to inspect its evidence.</p>;
  }
  const supporting = candidate.evidence.filter((e) => e.points > 0);
  const contradicting = candidate.evidence.filter((e) => e.points < 0);
  return (
    <section aria-label="explanation">
      <h2 className="font-mono text-lg">
        {candidate.commit_sha.slice(0, 12)} — {candidate.score.toFixed(2)}
      </h2>
      <p className="text-zinc-400">Evidence strength, not a probability.</p>
      <h3 className="mt-4 font-semibold">Evidence</h3>
      <ul>
        {supporting.map((e) => (
          <li key={e.kind} className="text-emerald-300">
            + [{e.kind}] {e.detail} ({e.points >= 0 ? "+" : ""}
            {e.points.toFixed(2)})
          </li>
        ))}
      </ul>
      {contradicting.length > 0 && (
        <>
          <h3 className="mt-4 font-semibold">Contradictory evidence</h3>
          <ul>
            {contradicting.map((e) => (
              <li key={e.kind} className="text-red-300">
                - [{e.kind}] {e.detail} ({e.points.toFixed(2)})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
