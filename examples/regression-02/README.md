# regression-02 (corpus placeholder, Phase 1)

TypeScript twin of regression-01, materialized by
`rootline_core.corpus.materialize_regression_02`:

- `src/` — `db.ts`, `users.ts` (culprit: `db.ts` return change)
- `tests/test_users.ts` — failing test import chain
- `results.xml` — failing JUnit result
- ground truth: `{ "culprit_message": "break user lookup return" }`

Evaluation: Top-1 / Top-3 / MRR over this corpus (spec §19–§20).
