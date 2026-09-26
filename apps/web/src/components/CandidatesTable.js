import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUi } from "../store";
const BAR_COLORS = {
    temporal: "bg-sky-500",
    structural: "bg-violet-500",
    execution: "bg-emerald-500",
    test: "bg-amber-500",
    semantic: "bg-pink-500",
    contradiction: "bg-red-500",
};
export function ScoreBar({ candidate }) {
    const total = candidate.evidence
        .filter((e) => e.points > 0)
        .reduce((sum, e) => sum + e.points, 0);
    return (_jsx("div", { className: "flex h-2 w-full overflow-hidden rounded bg-zinc-800", role: "img", "aria-label": `evidence breakdown, total ${candidate.score.toFixed(2)}`, children: candidate.evidence
            .filter((e) => e.points > 0)
            .map((e) => (_jsx("div", { className: BAR_COLORS[e.kind] ?? "bg-zinc-500", style: { width: `${total > 0 ? (e.points / total) * 100 : 0}%` }, title: `${e.kind} ${e.points >= 0 ? "+" : ""}${e.points.toFixed(2)} — ${e.detail}` }, e.kind))) }));
}
export function CandidatesTable({ candidates }) {
    const { selectedSha, select } = useUi();
    return (_jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-zinc-400", children: [_jsx("th", { className: "border-b border-zinc-800 p-2", children: "Commit" }), _jsx("th", { className: "border-b border-zinc-800 p-2", children: "Message" }), _jsx("th", { className: "border-b border-zinc-800 p-2", children: "Score" }), _jsx("th", { className: "border-b border-zinc-800 p-2", children: "Breakdown" })] }) }), _jsx("tbody", { children: candidates.map((c) => (_jsxs("tr", { onClick: () => select(c.commit_sha === selectedSha ? null : c.commit_sha), "aria-selected": c.commit_sha === selectedSha, className: `cursor-pointer hover:bg-zinc-900 ${c.commit_sha === selectedSha ? "bg-zinc-900" : ""}`, children: [_jsx("td", { className: "border-b border-zinc-900 p-2 font-mono", children: c.commit_sha.slice(0, 12) }), _jsx("td", { className: "border-b border-zinc-900 p-2", children: c.message.split("\n")[0] }), _jsx("td", { className: "border-b border-zinc-900 p-2 font-mono", children: c.score.toFixed(2) }), _jsx("td", { className: "border-b border-zinc-900 p-2", children: _jsx(ScoreBar, { candidate: c }) })] }, c.commit_sha))) })] }));
}
