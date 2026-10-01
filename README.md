<div align="center">

# Rootline

**Trace the change. Find the cause.**

Causal evidence analysis for software regressions: given a Git repository plus
a failing test, Rootline ranks candidate causal changes with supporting and
contradictory evidence — fully local, no paid services.

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PyPI](https://img.shields.io/pypi/v/rootline.svg)](https://pypi.org/project/rootline/)
[![CI](https://github.com/Pa004/rootline/actions/workflows/ci.yml/badge.svg)](https://github.com/Pa004/rootline/actions)
[![Live Demo](https://img.shields.io/badge/demo-live-ff69b4.svg)](https://rootline-73m.pages.dev/)

[**Try it live**](https://rootline-73m.pages.dev/) — no installation required

</div>

---

## What is Rootline?

When a regression appears, developers dig through git history, logs, stack
traces and failing tests by hand. Rootline combines repository history, static
analysis, test results and temporal information into a **causal evidence
graph**, then ranks candidate causes with inspectable evidence:

```text
Most probable cause:
    commit 8a92f1

Evidence strength score:
    0.52 (not a probability)

Evidence:
    + [structural] 2 hop(s) from failing test via imports
    + [test] failing test reaches changed file via imports
    + [semantic] message shares tokens: create, user

Contradictory evidence:
    - [contradiction] 1 passing test file(s) also changed
```

Rootline never claims mathematical causality — every score is a transparent,
explainable sum of evidence weights you can inspect and tune.

## Quick Start

### Option 1: Web (recommended)

Go to **[rootline-73m.pages.dev](https://rootline-73m.pages.dev/)** — live demo
with a planted regression, evidence graph explorer, benchmark dashboard,
guided tour and tutorial.

### Option 2: Install from PyPI

```bash
pip install rootline
rootline analyze ./repo \
  --test-results results.xml \
  --baseline main \
  --output analysis.json
```

### Option 3: From source

```bash
git clone https://github.com/Pa004/rootline.git
cd rootline
uv sync
uv run rootline analyze ./repo \
  --test-results results.xml \
  --baseline main \
  --output analysis.json
```

Requires Python 3.13+ and a git binary. No accounts, no paid services.

## CLI

```bash
rootline init                                  # sample rootline.toml weights
rootline analyze                               # one-command investigation (UC-01)
rootline candidates analysis.json              # ranked table
rootline explain analysis.json                 # evidence for and against
rootline report analysis.json -o report.html   # offline shareable report
rootline verify <sha> --test <failing-test>    # revert in a throwaway worktree
rootline blast-radius <sha>                    # what a commit affects
rootline benchmark                             # Top-1/Top-3/MRR over the corpus
rootline serve                                 # local API on 127.0.0.1:8000
```

Exit codes: `0` clean, `1` regression found, `2` usage/analysis error.
`--fail-on low|medium|high` gates CI pipelines.

## API & MCP

Local API (`rootline serve`, OpenAPI at `/docs`), paginated `limit`/`cursor`:

```http
POST /api/v1/analyses
GET  /api/v1/analyses/{id}/candidates
GET  /api/v1/analyses/{id}/graph
GET  /api/v1/analyses/{id}/evidence/{sha}
```

A public read-only demo runs on Cloudflare Workers
(`rootline-api.pablodo004.workers.dev`). Agent tools over stdio:

```bash
rootline-mcp   # rank_causes, explain_candidate, blast_radius_for_commit
```

## Benchmarks

Four planted regressions (Python + TypeScript) with ground truth, evaluated
on every change via `rootline benchmark` and `scripts/calibrate.py`:

| Metric | Score |
|---|---|
| Top-1 accuracy | 1.00 |
| Top-3 accuracy | 1.00 |
| Mean Reciprocal Rank | 1.00 |

Cases cover direct hits, cross-language twins, structural-only culprits two
hops away, and contradictions from passing tests.

## Supported Languages

Python and TypeScript/JavaScript via tree-sitter adapters behind a
`LanguageAdapter` interface (`parse`, `symbols`, `imports`). Relative imports
(`./mod`) and aliases resolve to files by stem matching.

## How It Works

```text
Repository
  → Git ingestion (windowed, read-only)
    → Static parsing (tree-sitter)
      → JUnit mapping (test → file)
        → Evidence graph (commit/file/symbol/test, NetworkX)
          → Weighted ranking (temporal + structural + execution + test
             + semantic − contradiction, all inspectable)
            → Explanation / HTML report / API / MCP
```

## Project Structure

```text
rootline/
├── apps/api/          # FastAPI service (uv workspace member)
├── apps/web/          # React + Vite + Cytoscape.js dashboard
├── workers/api/       # Cloudflare Python Worker demo (KV-backed, read-only)
├── packages/core/     # Evidence graph, ranking, corpus, calibration
├── packages/cli/      # Typer CLI (12 commands)
├── packages/mcp/      # MCP stdio server
├── examples/          # Regression corpus placeholders
├── scripts/           # calibrate.py, seed_demo.py
└── tests/             # Unit + integration tests
```

## Development

```bash
uv sync --group dev
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
uv run mypy packages apps/api/src src
cd apps/web && npm install && npm test -- --run && npm run build
```

Every slice ships on a branch (`feat/...`, `fix/...`, `chore/...`) with a
green suite before merging to `main`. Spec and agent notes (`Rootline.md`,
`AGENTS.md`) are local-only by design and never committed.

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make changes with tests
4. Run the checks above (plus `cd apps/web && npx playwright test` for UI)
5. Open a PR against `main`

## License

[MIT](LICENSE)
