"""P15 tests: worker R2 read model with fake bucket (no workers SDK)."""

import asyncio

import pytest
from store_r2 import paginate, read_index, read_json


class _Obj:
    def __init__(self, text: str) -> None:
        self._text = text

    async def text(self) -> str:
        return self._text


class _Bucket:
    def __init__(self, files: dict[str, str]) -> None:
        self._files = files

    async def get(self, key: str) -> _Obj | None:
        return _Obj(self._files[key]) if key in self._files else None


async def _read(bucket: _Bucket, key: str):
    return await read_json(bucket, key)


def test_read_json_hit_and_miss() -> None:
    bucket = _Bucket({"a.json": '{"x": 1}'})

    assert asyncio.run(_read(bucket, "a.json")) == {"x": 1}
    assert asyncio.run(_read(bucket, "missing.json")) is None


def test_read_index_defaults_to_empty() -> None:
    assert asyncio.run(read_index(_Bucket({}))) == []
    assert asyncio.run(read_index(_Bucket({"analyses/index.json": "[1]"}))) == [1]
    assert asyncio.run(read_index(_Bucket({"analyses/index.json": "{}"}))) == []


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
