"""R2-backed read model for the demo Worker (self-contained: stdlib only).

Mirrors the response shapes of rootline_api (apps/api) without importing
rootline_core, keeping the Worker bundle to fastapi + pydantic.
R2 keys: analyses/index.json, analyses/{id}.json, analyses/{id}.graph.json.
"""

from __future__ import annotations

import json
from typing import Any, Protocol


class R2Object(Protocol):
    async def text(self) -> str: ...


class R2Bucket(Protocol):
    async def get(self, key: str) -> R2Object | None: ...


async def read_json(bucket: R2Bucket, key: str) -> Any | None:
    obj = await bucket.get(key)
    if obj is None:
        return None
    return json.loads(await obj.text())


async def read_index(bucket: R2Bucket) -> list[dict[str, Any]]:
    data = await read_json(bucket, "analyses/index.json")
    return list(data) if isinstance(data, list) else []


def paginate(items: list, limit: int, cursor: str) -> tuple[list, str | None]:
    try:
        offset = max(int(cursor), 0)
    except ValueError:
        offset = 0
    size = max(limit, 1)
    rest = offset + size
    return items[offset:rest], (str(rest) if rest < len(items) else None)
