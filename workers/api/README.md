# Rootline demo API (Cloudflare Python Worker, read-only)

FastAPI-lite served from R2 (`BLOB` binding). Bundle budget: `fastapi` +
`pydantic` only — `store_r2.py` is stdlib and `main.py` must never import
`rootline_core`. Paginated `limit`/`cursor` endpoints mirror `apps/api`
to respect the 10ms CPU / 128MB Worker limits. No D1 yet (R2 `index.json`
is the catalog; add D1 when filtering is needed).

## Layout

```text
workers/api/
├── src/main.py        # FastAPI app + workers.asgi entrypoint
├── src/store_r2.py    # R2 read model (unit-tested, no workers SDK)
├── seed/analyses/     # Committed fixtures: index.json + demo blobs
├── wrangler.jsonc     # Worker config (python_workers flag)
└── pyproject.toml     # Worker-only env (managed by pywrangler, not uv)
```

## Deploy (user steps, free tier, no card)

```powershell
!cd C:\Users\Asus\Desktop\Rootline\workers\api
!wrangler login
!wrangler r2 bucket create rootline-demo
!wrangler r2 object put rootline-demo/analyses/index.json --file=seed/analyses/index.json
!wrangler r2 object put rootline-demo/analyses/demo-regression-01.json --file=seed/analyses/demo-regression-01.json
!wrangler r2 object put rootline-demo/analyses/demo-regression-01.graph.json --file=seed/analyses/demo-regression-01.graph.json
!uv run pywrangler deploy
```

Regenerate fixtures after core changes: `uv run scripts/seed_demo.py`
from the repo root, then re-upload the changed blobs.

## Verify

```bash
curl https://rootline-api.<tu-subdominio>.workers.dev/api/v1/analyses
curl "https://rootline-api.<tu-subdominio>.workers.dev/api/v1/analyses/demo-regression-01/candidates?limit=1"
```
