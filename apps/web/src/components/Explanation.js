import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function Explanation({ candidate }) {
    if (!candidate) {
        return _jsx("p", { className: "text-zinc-400", children: "Select a candidate to inspect its evidence." });
    }
    const supporting = candidate.evidence.filter((e) => e.points > 0);
    const contradicting = candidate.evidence.filter((e) => e.points < 0);
    return (_jsxs("section", { "aria-label": "explanation", children: [_jsxs("h2", { className: "font-mono text-lg", children: [candidate.commit_sha.slice(0, 12), " \u2014 ", candidate.score.toFixed(2)] }), _jsx("p", { className: "text-zinc-400", children: "Evidence strength, not a probability." }), _jsx("h3", { className: "mt-4 font-semibold", children: "Evidence" }), _jsx("ul", { children: supporting.map((e) => (_jsxs("li", { className: "text-emerald-300", children: ["+ [", e.kind, "] ", e.detail, " (", e.points >= 0 ? "+" : "", e.points.toFixed(2), ")"] }, e.kind))) }), contradicting.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "mt-4 font-semibold", children: "Contradictory evidence" }), _jsx("ul", { children: contradicting.map((e) => (_jsxs("li", { className: "text-red-300", children: ["- [", e.kind, "] ", e.detail, " (", e.points.toFixed(2), ")"] }, e.kind))) })] }))] }));
}
