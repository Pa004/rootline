"""Regression corpus with ground truth (spec §19-§20).

Each case materializes a synthetic git repository plus a JUnit result
in a target directory. Ground truth identifies the culprit by commit
message (SHAs vary per materialization).
"""

from __future__ import annotations

from pathlib import Path

from git import Repo

USERS = "from app.db import get_db\n\n\ndef create_user(name):\n    return get_db(name)\n"
DB_V1 = "def get_db(name):\n    return name\n"
DB_V2 = "def get_db(name):\n    return None\n"
TESTS = "from app.users import create_user\n"
RESULTS_XML = """<?xml version="1.0" encoding="utf-8"?>
<testsuite name="api" tests="2">
  <testcase classname="tests.test_users" name="test_create_user" time="0.1">
    <failure message="bad">trace</failure>
  </testcase>
  <testcase classname="tests.test_users" name="test_list_users" time="0.1" />
</testsuite>
"""
CULPRIT_MESSAGE = "tweak create user lookup"
FAILING_TEST = "test_create_user"

TS_USERS = 'import { getDb } from "./db";\n\nexport function createUser(name: string): string {\n  return getDb(name);\n}\n'  # noqa: E501
TS_DB_V1 = "export function getDb(name: string): string {\n  return name;\n}\n"
TS_DB_V2 = "export function getDb(name: string): string {\n  return '';\n}\n"
TS_TESTS = 'import { createUser } from "../src/users";\n'
TS_RESULTS_XML = """<?xml version="1.0" encoding="utf-8"?>
<testsuite name="api" tests="2">
  <testcase classname="tests.test_users" name="test_create_user" time="0.1">
    <failure message="bad">trace</failure>
  </testcase>
  <testcase classname="tests.test_users" name="test_list_users" time="0.1" />
</testsuite>
"""
TS_CULPRIT_MESSAGE = "break user lookup return"


def materialize_regression_01(dest: Path) -> dict[str, str]:
    """Build the regression-01 repo; return its ground truth."""
    repo = Repo.init(dest, initial_branch="main")
    with repo.config_writer() as config:
        config.set_value("user", "name", "Rootline Corpus")
        config.set_value("user", "email", "corpus@rootline.dev")
    (dest / "app").mkdir()
    (dest / "tests").mkdir()
    (dest / "app" / "db.py").write_text(DB_V1, encoding="utf-8")
    (dest / "app" / "users.py").write_text(USERS, encoding="utf-8")
    (dest / "tests" / "test_users.py").write_text(TESTS, encoding="utf-8")
    repo.index.add(["app/db.py", "app/users.py", "tests/test_users.py"])
    repo.index.commit("add users module and tests")
    (dest / "app" / "db.py").write_text(DB_V2, encoding="utf-8")
    repo.index.add(["app/db.py"])
    repo.index.commit(CULPRIT_MESSAGE)
    (dest / "results.xml").write_text(RESULTS_XML, encoding="utf-8")
    repo.close()
    return {
        "culprit_message": CULPRIT_MESSAGE,
        "culprit_file": "app/db.py",
        "failing_test": FAILING_TEST,
        "results_xml": "results.xml",
    }


def materialize_regression_02(dest: Path) -> dict[str, str]:
    """TypeScript twin of regression-01; return its ground truth."""
    repo = Repo.init(dest, initial_branch="main")
    with repo.config_writer() as config:
        config.set_value("user", "name", "Rootline Corpus")
        config.set_value("user", "email", "corpus@rootline.dev")
    (dest / "src").mkdir()
    (dest / "tests").mkdir()
    (dest / "src" / "db.ts").write_text(TS_DB_V1, encoding="utf-8")
    (dest / "src" / "users.ts").write_text(TS_USERS, encoding="utf-8")
    (dest / "tests" / "test_users.ts").write_text(TS_TESTS, encoding="utf-8")
    repo.index.add(["src/db.ts", "src/users.ts", "tests/test_users.ts"])
    repo.index.commit("add users module and tests")
    (dest / "src" / "db.ts").write_text(TS_DB_V2, encoding="utf-8")
    repo.index.add(["src/db.ts"])
    repo.index.commit(TS_CULPRIT_MESSAGE)
    (dest / "results.xml").write_text(TS_RESULTS_XML, encoding="utf-8")
    repo.close()
    return {
        "culprit_message": TS_CULPRIT_MESSAGE,
        "culprit_file": "src/db.ts",
        "failing_test": FAILING_TEST,
        "results_xml": "results.xml",
    }


CASES = {
    "regression-01": materialize_regression_01,
    "regression-02": materialize_regression_02,
}
