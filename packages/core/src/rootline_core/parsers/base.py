"""LanguageAdapter interface (FR-003)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Symbol:
    name: str
    kind: str  # "function" | "class"


@dataclass(frozen=True)
class Import:
    module: str
    names: tuple[str, ...]


class LanguageAdapter(ABC):
    language: str

    @abstractmethod
    def symbols(self, source: bytes) -> list[Symbol]:
        """Top-level and nested function/class definitions in source order."""

    @abstractmethod
    def imports(self, source: bytes) -> list[Import]:
        """Static module imports in source order."""
