export interface CorpusCase {
  id: string;
  language: string;
  title: string;
  story: string;
  culprit: string;
  signals: string[];
  verdict: string;
}

export const CORPUS: CorpusCase[] = [
  {
    id: "regression-01",
    language: "Python",
    title: "The direct hit",
    story: "A failing user-creation test resolves straight to the changed file.",
    culprit: "tweak create user lookup",
    signals: ["execution", "test", "temporal"],
    verdict: "Ranked #1 — revert app/db.py and rerun test_create_user.",
  },
  {
    id: "regression-02",
    language: "TypeScript",
    title: "The TS twin",
    story: "Same shape as regression-01 across the language boundary.",
    culprit: "break user lookup return",
    signals: ["execution", "test", "temporal"],
    verdict: "Ranked #1 — revert src/db.ts and rerun test_create_user.",
  },
  {
    id: "regression-03",
    language: "Python",
    title: "The two-hop culprit",
    story: "No message overlap; only the import chain links test to cause.",
    culprit: "normalize channel payload",
    signals: ["structural", "test"],
    verdict: "Ranked #1 on structural evidence alone — 2 hops via imports.",
  },
  {
    id: "regression-04",
    language: "Python",
    title: "With contradiction",
    story: "Passing tests touch the same files — ranked first anyway, honestly.",
    culprit: "adjust create user lookup",
    signals: ["structural", "test", "semantic", "contradiction"],
    verdict: "Ranked #1 with a recorded contradiction penalty of -0.04.",
  },
];

export const BENCHMARK_ROWS = CORPUS.map((c) => ({
  case: c.id,
  language: c.language,
  rank: 1,
  top1: true,
}));

export const BENCHMARK_SUMMARY = {
  cases: CORPUS.length,
  top1: 1.0,
  top3: 1.0,
  mrr: 1.0,
};
