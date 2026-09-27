# Rootline demo API (Cloudflare Python Worker, read-only)

FastAPI-lite served from KV (`BLOB` binding). Bundle budget: `fastapi` +
`pydantic` only — `store_kv.py` is stdlib and `main.py` must never import
`rootline_core`. Paginated `limit`/`cursor` endpoints mirror `apps/api`
to respect the 10ms CPU / 128MB Worker limits. No D1 yet (KV `index.json`
is the catalog; add D1 when filtering is needed). KV replaces R2 here:
R2 requires a paid subscription on file, KV is in the Workers Free plan.

## Layout

```text
workers/api/
├── src/main.py        # FastAPI app + workers.asgi entrypoint
├── src/store_kv.py    # KV read model (unit-tested, no workers SDK)
├── seed/analyses/     # Committed fixtures: index.json + demo blobs
├── wrangler.jsonc     # Worker config (python_workers flag)
└── pyproject.toml     # Worker-only env (managed by pywrangler, not uv)
```

## Deploy (user steps, free tier, no card)

```powershell
!cd C:\Users\Asus\Desktop\Rootline\workers\api
!wrangler login
!wrangler kv namespace create BLOB  # once; paste the id into wrangler.jsonc
!wrangler kv key put analyses/index.json --path=seed/analyses/index.json --binding=BLOB
!wrangler kv key put analyses/demo-regression-01.json --path=seed/analyses/demo-regression-01.json --binding=BLOB
!wrangler kv key put analyses/demo-regression-01.graph.json --path=seed/analyses/demo-regression-01.graph.json --binding=BLOB
!uv run pywrangler deploy
```

Regenerate fixtures after core changes: `uv run scripts/seed_demo.py`
from the repo root, then re-upload the changed blobs.

## Verify

```bash
curl https://rootline-api.<tu-subdominio>.workers.dev/api/v1/analyses
curl "https://rootline-api.<tu-subdominio>.workers.dev/api/v1/analyses/demo-regression-01/candidates?limit=1"
```
