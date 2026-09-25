# Rootline

> **Trace the change. Find the cause.**

Causal evidence analysis for software regressions: given a Git repository plus a
failing test, Rootline ranks candidate causal changes with supporting and
contradictory evidence — fully local, no paid services.

Status: **Phase 0 — bootstrap**. The full specification lives in `Rootline.md`
(local working spec, git-ignored by design).

## Quickstart (target, Phase 1)

```bash
uv sync
uv run rootline analyze ./examples/regression-01 \
  --test-results results.xml \
  --baseline main \
  --max-commits 50 \
  --output analysis.json
```

## Layout

```text
rootline/
├── apps/api/          # FastAPI (uv workspace member)
├── apps/web/          # React + Vite + Cytoscape.js (Phase 3)
├── workers/api/       # Cloudflare Python Worker demo, read-only (Phase 4)
├── packages/core/     # Evidence graph + ranking
├── packages/cli/      # Typer CLI
├── examples/          # Regression corpus with ground truth
└── tests/             # Bootstrap + unit tests
```

## Deploy

Local-first (`docker compose up` / `uv run`). Public demo on Cloudflare
Pages + Python Worker + D1/R2, free tier without credit card. See spec §26.

## License

[Apache-2.0](LICENSE)
