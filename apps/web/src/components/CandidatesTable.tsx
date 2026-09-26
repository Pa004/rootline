import type { CandidateScore } from "../types";
import { useUi } from "../store";

const BAR_COLORS: Record<string, string> = {
  temporal: "bg-sky-500",
  structural: "bg-violet-500",
  execution: "bg-emerald-500",
  test: "bg-amber-500",
  semantic: "bg-pink-500",
  contradiction: "bg-red-500",
};

export function ScoreBar({ candidate }: { candidate: CandidateScore }) {
  const total = candidate.evidence
    .filter((e) => e.points > 0)
    .reduce((sum, e) => sum + e.points, 0);
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded bg-zinc-800"
      role="img"
      aria-label={`evidence breakdown, total ${candidate.score.toFixed(2)}`}
    >
      {candidate.evidence
        .filter((e) => e.points > 0)
        .map((e) => (
          <div
            key={e.kind}
            className={BAR_COLORS[e.kind] ?? "bg-zinc-500"}
            style={{ width: `${total > 0 ? (e.points / total) * 100 : 0}%` }}
            title={`${e.kind} ${e.points >= 0 ? "+" : ""}${e.points.toFixed(2)} — ${e.detail}`}
          />
        ))}
    </div>
  );
}

export function CandidatesTable({ candidates }: { candidates: CandidateScore[] }) {
  const { selectedSha, select } = useUi();
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-left text-zinc-400">
          <th className="border-b border-zinc-800 p-2">Commit</th>
          <th className="border-b border-zinc-800 p-2">Message</th>
          <th className="border-b border-zinc-800 p-2">Score</th>
          <th className="border-b border-zinc-800 p-2">Breakdown</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((c) => (
          <tr
            key={c.commit_sha}
            onClick={() => select(c.commit_sha === selectedSha ? null : c.commit_sha)}
            aria-selected={c.commit_sha === selectedSha}
            className={`cursor-pointer hover:bg-zinc-900 ${
              c.commit_sha === selectedSha ? "bg-zinc-900" : ""
            }`}
          >
            <td className="border-b border-zinc-900 p-2 font-mono">{c.commit_sha.slice(0, 12)}</td>
            <td className="border-b border-zinc-900 p-2">{c.message.split("\n")[0]}</td>
            <td className="border-b border-zinc-900 p-2 font-mono">{c.score.toFixed(2)}</td>
            <td className="border-b border-zinc-900 p-2">
              <ScoreBar candidate={c} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
