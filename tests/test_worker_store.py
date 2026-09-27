"""P15 tests: worker KV read model with fake namespace (no workers SDK)."""

import asyncio

import pytest
from store_kv import paginate, read_index, read_json


class _Namespace:
    def __init__(self, values: dict[str, str]) -> None:
        self._values = values

    async def get(self, key: str) -> str | None:
        return self._values.get(key)


async def _read(store: _Namespace, key: str):
    return await read_json(store, key)


def test_read_json_hit_and_miss() -> None:
    store = _Namespace({"a.json": '{"x": 1}'})

    assert asyncio.run(_read(store, "a.json")) == {"x": 1}
    assert asyncio.run(_read(store, "missing.json")) is None


def test_read_index_defaults_to_empty() -> None:
    assert asyncio.run(read_index(_Namespace({}))) == []
    assert asyncio.run(read_index(_Namespace({"analyses/index.json": "[1]"}))) == [1]
    assert asyncio.run(read_index(_Namespace({"analyses/index.json": "{}"}))) == []


@pytest.mark.parametrize(
    ("items", "limit", "cursor", "want", "next_cursor"),
    [
        (["a", "b", "c"], 2, "0", ["a", "b"], "2"),
        (["a", "b", "c"], 2, "2", ["c"], None),
        (["a"], 50, "0", ["a"], None),
        ([], 50, "0", [], None),
        (["a", "b"], 1, "bogus", ["a"], "1"),
        (["a", "b"], 0, "0", ["a"], "1"),
    ],
)
def test_paginate(items, limit, cursor, want, next_cursor) -> None:
    assert paginate(items, limit, cursor) == (want, next_cursor)
