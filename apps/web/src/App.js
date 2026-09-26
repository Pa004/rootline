import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUi } from "./store";
import { SAMPLE } from "./data/sample";
import { CandidatesTable } from "./components/CandidatesTable";
import { Explanation } from "./components/Explanation";
const TABS = [
    { id: "candidates", label: "Candidates" },
    { id: "graph", label: "Graph explorer" },
    { id: "report", label: "Report" },
];
export default function App() {
    const { tab, setTab, selectedSha } = useUi();
    const selected = SAMPLE.candidates.find((c) => c.commit_sha === selectedSha);
    return (_jsxs("div", { className: "mx-auto max-w-5xl p-4 text-zinc-100", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-xl font-bold", children: "Rootline" }), _jsx("p", { className: "text-sm text-zinc-400", children: "Trace the change. Find the cause." })] }), _jsx("nav", { "aria-label": "views", className: "mt-4 flex gap-2", children: TABS.map((t) => (_jsx("button", { onClick: () => setTab(t.id), "aria-pressed": tab === t.id, className: `rounded px-3 py-1 text-sm ${tab === t.id ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800"}`, children: t.label }, t.id))) }), _jsxs("main", { className: "mt-4", children: [tab === "candidates" && _jsx(CandidatesTable, { candidates: SAMPLE.candidates }), tab === "graph" && (_jsx("p", { className: "text-zinc-400", children: "Cytoscape graph explorer lands in P13b \u2014 see reference/design-proposal.html." })), tab === "report" && _jsx(Explanation, { candidate: selected ?? SAMPLE.candidates[0] })] })] }));
}
