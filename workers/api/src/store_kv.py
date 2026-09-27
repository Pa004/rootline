"""KV-backed read model for the demo Worker (self-contained: stdlib only).

Mirrors the response shapes of rootline_api (apps/api) without importing
rootline_core, keeping the Worker bundle to fastapi + pydantic.
KV keys: analyses/index.json, analyses/{id}.json, analyses/{id}.graph.json.
(KV replaces R2 here: R2 requires a paid subscription on file, KV is
included in the Workers Free plan.)
"""

from __future__ import annotations

import json
from typing import Any, Protocol


class KVNamespace(Protocol):
    async def get(self, key: str) -> str | None: ...


async def read_json(store: KVNamespace, key: str) -> Any | None:
    raw = await store.get(key)
    return json.loads(raw) if raw is not None else None


async def read_index(store: KVNamespace) -> list[dict[str, Any]]:
    data = await read_json(store, "analyses/index.json")
    return list(data) if isinstance(data, list) else []


def paginate(items: list, limit: int, cursor: str) -> tuple[list, str | None]:
    try:
        offset = max(int(cursor), 0)
    except ValueError:
        offset = 0
    size = max(limit, 1)
    rest = offset + size
    return items[offset:rest], (str(rest) if rest < len(items) else None)
