# Rootline

> **Trace the change. Find the cause.**

Causal evidence analysis for software regressions: given a Git repository plus a
failing test, Rootline ranks candidate causal changes with supporting and
contradictory evidence — fully local, no paid services.

Status: **MVP core** — CLI + API over a causal evidence graph
(Python + TypeScript). The full specification lives in `Rootline.md`
(local working spec, git-ignored by design).

## Install

```bash
uv sync
```

Requires Python 3.13+ and a git binary. No accounts, no paid services.

## CLI usage

```bash
uv run rootline analyze ./repo \
  --test-results results.xml \
  --baseline main \
  --max-commits 50 \
  --fail-on low \
  --output analysis.json
uv run rootline candidates analysis.json
uv run rootline explain analysis.json
uv run rootline report analysis.json -o report.html
uv run rootline verify <sha> --test test_create_user
uv run rootline blast-radius <sha>
uv run rootline benchmark
```

Exit codes: `0` clean, `1` regression found (or benchmark Top-1 miss),
`2` usage/analysis error. `rootline init` writes a sample `rootline.toml`
with evidence weights.

## API usage

```bash
uv run uvicorn rootline_api.app:create_app --factory --port 8000
```

Endpoints (`GET` paginated with `limit`/`cursor`):

```http
POST /api/v1/analyses
GET  /api/v1/analyses/{id}
GET  /api/v1/analyses/{id}/candidates
GET  /api/v1/analyses/{id}/graph
GET  /api/v1/analyses/{id}/evidence/{sha}
```

OpenAPI docs at `/docs` when the server runs.

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
