"""P3 tests: JUnit parsing, outcomes, and file mapping."""

from pathlib import Path

from rootline_core.junit import parse_junit, resolve_files

XML = """<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="api" tests="4">
    <testcase classname="tests.api.test_users" name="test_create_user" time="0.12">
      <failure message="assert 201 == 500">traceback here</failure>
    </testcase>
    <testcase classname="tests.api.test_users" name="test_get_user" time="0.03" />
    <testcase classname="billing" name="test_charge" time="0.01">
      <error message="boom" />
    </testcase>
    <testcase classname="tests.api.test_users" name="test_skip_me">
      <skipped message="todo" />
    </testcase>
  </testsuite>
</testsuites>
"""


def _results(tmp_path: Path):
    xml_path = tmp_path / "results.xml"
    xml_path.write_text(XML, encoding="utf-8")
    return parse_junit(xml_path)


def test_parse_junit_outcomes_and_messages(tmp_path: Path) -> None:
    found = {r.name: r for r in _results(tmp_path)}

    assert found["test_create_user"].outcome == "failed"
    assert "assert 201 == 500" in found["test_create_user"].message
    assert "traceback here" in found["test_create_user"].message
    assert found["test_get_user"].outcome == "passed"
    assert found["test_get_user"].duration == 0.03
    assert found["test_charge"].outcome == "error"
    assert found["test_skip_me"].outcome == "skipped"


def test_resolve_files_prefers_dotted_path(tmp_path: Path) -> None:
    target = tmp_path / "tests" / "api" / "test_users.py"
    target.parent.mkdir(parents=True)
    target.write_text("x = 1\n", encoding="utf-8")

    resolved = {r.name: r for r in resolve_files(_results(tmp_path), tmp_path)}

    assert resolved["test_create_user"].file == "tests/api/test_users.py"


def test_resolve_files_falls_back_to_stem_search_and_none(tmp_path: Path) -> None:
    target = tmp_path / "src" / "billing.py"
    target.parent.mkdir(parents=True)
    target.write_text("x = 1\n", encoding="utf-8")

    resolved = {r.name: r for r in resolve_files(_results(tmp_path), tmp_path)}

    assert resolved["test_charge"].file == "src/billing.py"
    assert resolved["test_skip_me"].file is None
