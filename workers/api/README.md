# Rootline Cloudflare demo API (Phase 4)

Python Worker (FastAPI-lite via `workers.asgi`), read-only demo.
Heavy analysis stays local/CLI; the Worker serves precomputed
analyses from D1 (index) + R2 (blobs). See spec §26.
