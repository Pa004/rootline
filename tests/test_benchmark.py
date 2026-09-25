"""P6 tests: corpus materialization and benchmark metrics."""

from rootline_cli.benchmark import run_benchmark
from rootline_cli.cli import app
from typer.testing import CliRunner

RUNNER = CliRunner()


def test_benchmark_hits_top1_with_perfect_mrr() -> None:
    report = run_benchmark()

    assert [c.case for c in report.cases] == ["regression-01"]
    assert report.top1_accuracy == 1.0
    assert report.top3_accuracy == 1.0
    assert report.mrr == 1.0


def test_benchmark_command_exits_zero() -> None:
    result = RUNNER.invoke(app, ["benchmark"])

    assert result.exit_code == 0, result.output
    assert "mrr=1.00" in result.output
