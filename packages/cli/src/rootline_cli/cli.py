"""Rootline CLI (FR-009, FR-011–FR-013). Exit codes: 0 clean, 1 found, 2 error."""

from __future__ import annotations

import shlex
import tempfile
from pathlib import Path
from typing import Annotated

import typer
from pydantic import ValidationError
from rich.console import Console
from rich.table import Table
from rootline_core.blast import blast_radius
from rootline_core.explain import explain as render_explanation
from rootline_core.export import to_csv, to_json
from rootline_core.git import HistoryWindow, list_commits, open_repo
from rootline_core.graph import build_evidence_graph
from rootline_core.junit import parse_junit, resolve_files
from rootline_core.pipeline import run_analysis
from rootline_core.ranking import Analysis
from rootline_core.report import to_html
from rootline_core.runner import run_command

from rootline_cli.benchmark import run_benchmark

app = typer.Typer(no_args_is_help=True)
console = Console()
FAIL_ON = {"low": 0.0, "medium": 0.3, "high": 0.6}
INIT_TOML = "[weights]\ntemporal = 0.20\nstructural = 0.25\nexecution = 0.25\ntest = 0.15\nsemantic = 0.10\ncontradiction = 0.08\n"  # noqa: E501


def _load_analysis(path: Path) -> Analysis:
    try:
        return Analysis.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValidationError) as exc:
        console.print(f"[red]Cannot read analysis: {exc}[/red]")
        raise typer.Exit(code=2) from exc


def _analyze_repo(
    repo: Path,
    test_results: Path | None,
    baseline: str,
    max_commits: int,
    max_files: int,
    config: Path | None,
) -> Analysis:
    run = run_analysis(repo, test_results, baseline, max_commits, max_files, config)
    if run.shallow:
        console.print("[yellow]Warning: shallow clone, analyzing fetched range only.[/yellow]")
    return run.analysis


@app.command()
def init() -> None:
    """Write a sample rootline.toml in the current directory."""
    target = Path("rootline.toml")
    if target.exists():
        console.print("[red]rootline.toml already exists.[/red]")
        raise typer.Exit(code=1)
    target.write_text(INIT_TOML, encoding="utf-8")
    console.print("[green]Wrote rootline.toml[/green]")


@app.command()
def analyze(
    repo: Annotated[Path, typer.Argument(help="Git repository to analyze.")],
    test_results: Annotated[Path | None, typer.Option(help="JUnit XML results.")] = None,
    baseline: Annotated[str, typer.Option(help="Baseline commit-ish.")] = "HEAD~50",
    max_commits: Annotated[int, typer.Option(help="Max commits in window.")] = 50,
    max_files: Annotated[int, typer.Option(help="Max files per commit.")] = 500,
    config: Annotated[Path | None, typer.Option(help="rootline.toml weights.")] = None,
    output: Annotated[Path, typer.Option(help="JSON output path.")] = Path("analysis.json"),
    fail_on: Annotated[str, typer.Option(help="Gate: low|medium|high.")] = "low",
) -> None:
    """Run one-command regression analysis (UC-01)."""
    if fail_on not in FAIL_ON:
        console.print("[red]--fail-on must be low, medium or high.[/red]")
        raise typer.Exit(code=2)
    try:
        analysis = _analyze_repo(repo, test_results, baseline, max_commits, max_files, config)
    except Exception as exc:  # noqa: BLE001 - surface any analysis failure as exit 2
        console.print(f"[red]Analysis failed: {exc}[/red]")
        raise typer.Exit(code=2) from exc
    output.write_text(to_json(analysis), encoding="utf-8")
    if not analysis.candidates:
        console.print("No commits in window.")
        return
    top = analysis.candidates[0]
    failing = sum(1 for c in analysis.candidates if c.score > 0)
    console.print(f"Top candidate: {top.commit_sha[:12]} (score {top.score:.2f})")
    console.print(f"Wrote {output} with {len(analysis.candidates)} candidate(s).")
    if failing and top.score >= FAIL_ON[fail_on]:
        raise typer.Exit(code=1)


@app.command()
def commits(
    repo: Annotated[Path, typer.Argument(help="Git repository.")],
    baseline: Annotated[str, typer.Option()] = "HEAD~50",
    max_commits: Annotated[int, typer.Option()] = 50,
) -> None:
    """List commits in the analysis window."""
    found = list_commits(open_repo(repo), HistoryWindow(baseline, max_commits))
    table = Table("sha", "author", "message")
    for commit in found:
        table.add_row(commit.sha[:12], commit.author, commit.message.splitlines()[0])
    console.print(table)


@app.command()
def graph(
    repo: Annotated[Path, typer.Argument(help="Git repository.")],
    test_results: Annotated[Path | None, typer.Option()] = None,
) -> None:
    """Print evidence-graph stats (nodes/edges by kind)."""
    git_repo = open_repo(repo)
    found = list_commits(git_repo, HistoryWindow())
    results = resolve_files(parse_junit(test_results), repo) if test_results else []
    built = build_evidence_graph(found, results, repo_root=repo)
    kinds: dict[str, int] = {}
    for _, _, data in built.edges(data=True):
        kinds[str(data.get("kind"))] = kinds.get(str(data.get("kind")), 0) + 1
    console.print(f"nodes={built.number_of_nodes()} edges={built.number_of_edges()}")
    for kind in sorted(kinds):
        console.print(f"  {kind}: {kinds[kind]}")


@app.command()
def candidates(
    analysis_path: Annotated[Path, typer.Argument(help="analysis.json path.")],
    limit: Annotated[int, typer.Option()] = 10,
) -> None:
    """Show ranked candidates."""
    analysis = _load_analysis(analysis_path)
    table = Table("sha", "score", "message")
    for candidate in analysis.candidates[:limit]:
        table.add_row(
            candidate.commit_sha[:12], f"{candidate.score:.2f}", candidate.message.splitlines()[0]
        )
    console.print(table)


@app.command()
def explain(
    analysis_path: Annotated[Path, typer.Argument(help="analysis.json path.")],
    sha: Annotated[str | None, typer.Option(help="Full commit SHA. Defaults to top.")] = None,
) -> None:
    """Explain one candidate with evidence for and against."""
    analysis = _load_analysis(analysis_path)
    candidate = next((c for c in analysis.candidates if c.commit_sha == sha), None)
    if sha is not None and candidate is None:
        console.print("[red]SHA not found in analysis.[/red]")
        raise typer.Exit(code=2)
    chosen = candidate or analysis.candidates[0]
    console.print(render_explanation(chosen, []))


@app.command()
def export(
    analysis_path: Annotated[Path, typer.Argument(help="analysis.json path.")],
    output: Annotated[Path, typer.Option(help="Output path.")] = Path("analysis.csv"),
    fmt: Annotated[str, typer.Option("--format", help="json|csv.")] = "csv",
) -> None:
    """Export the analysis (FR-008)."""
    analysis = _load_analysis(analysis_path)
    if fmt == "csv":
        output.write_text(to_csv(analysis), encoding="utf-8")
    elif fmt == "json":
        output.write_text(to_json(analysis), encoding="utf-8")
    else:
        console.print("[red]--format must be json or csv.[/red]")
        raise typer.Exit(code=2)
    console.print(f"[green]Wrote {output}[/green]")


@app.command()
def report(
    analysis_path: Annotated[Path, typer.Argument(help="analysis.json path.")],
    output: Annotated[Path, typer.Option(help="HTML output path.")] = Path("report.html"),
) -> None:
    """Generate the offline HTML report (FR-011)."""
    analysis = _load_analysis(analysis_path)
    output.write_text(to_html(analysis), encoding="utf-8")
    console.print(f"[green]Wrote {output}[/green]")


@app.command(name="blast-radius")
def blast_radius_cmd(
    repo: Annotated[Path, typer.Argument(help="Git repository.")],
    sha: Annotated[str, typer.Argument(help="Commit SHA prefix or full.")],
    test_results: Annotated[Path | None, typer.Option()] = None,
) -> None:
    """Show what a commit affects: files, dependents, tests (FR-012)."""
    git_repo = open_repo(repo)
    found = list_commits(git_repo, HistoryWindow())
    full = next((c.sha for c in found if c.sha.startswith(sha)), None)
    if full is None:
        try:
            full = git_repo.commit(sha).hexsha
        except Exception:  # noqa: BLE001 - unknown rev resolves to exit 2 below
            full = None
    if full is None:
        console.print("[red]Commit not found.[/red]")
        raise typer.Exit(code=2)
    results = resolve_files(parse_junit(test_results), repo) if test_results else []
    blast = blast_radius(build_evidence_graph(found, results, repo_root=repo), full)
    console.print(f"changed: {', '.join(blast.changed_files) or '-'}")
    console.print(f"dependents: {', '.join(blast.dependent_files) or '-'}")
    console.print(f"tests: {', '.join(blast.covering_tests) or '-'}")


@app.command()
def verify(
    repo: Annotated[Path, typer.Argument(help="Git repository.")],
    sha: Annotated[str, typer.Argument(help="Candidate commit SHA.")],
    test: Annotated[str, typer.Option(help="Failing test id.")] = "",
    command: Annotated[str | None, typer.Option(help="Test command to run.")] = None,
    timeout: Annotated[int, typer.Option(help="Seconds before killing the run.")] = 300,
) -> None:
    """Revert a candidate in a throwaway worktree and optionally rerun (FR-013).

    --command executes repository code: opt-in, local only, with a
    sanitized environment (no secrets), pinned cwd and a timeout.
    """
    git_repo = open_repo(repo)
    with tempfile.TemporaryDirectory(prefix="rootline-verify-") as tmpdir:
        worktree = Path(tmpdir) / "wt"
        git_repo.git.worktree("add", "--detach", str(worktree), sha)
        try:
            reverted = run_command(
                ["git", "-C", str(worktree), "revert", "--no-commit", sha],
                cwd=worktree,
                timeout=timeout,
            )
            if reverted.timed_out or reverted.returncode != 0:
                console.print("[red]Revert failed in worktree.[/red]")
                raise typer.Exit(code=2)
            if command is None:
                console.print(f"Plan: revert {sha[:12]} in {worktree} and rerun {test or 'tests'}.")
                console.print("Pass --command to execute it (runs repo code locally).")
                return
            completed = run_command(shlex.split(command), cwd=worktree, timeout=timeout)
            if completed.timed_out:
                console.print(f"[red]Timed out after {timeout}s.[/red]")
                raise typer.Exit(code=2)
            console.print(f"exit={completed.returncode}")
            console.print(completed.stdout[-2000:])
            if completed.returncode != 0:
                raise typer.Exit(code=1)
        finally:
            git_repo.git.worktree("remove", "--force", str(worktree))


@app.command()
def benchmark() -> None:
    """Score ranking accuracy over the regression corpus (spec §20)."""
    report = run_benchmark()
    table = Table("case", "rank", "top-1", "top-3")
    for case in report.cases:
        table.add_row(case.case, str(case.rank or "-"), str(case.top1), str(case.top3))
    console.print(table)
    console.print(
        f"top1={report.top1_accuracy:.2f} top3={report.top3_accuracy:.2f} mrr={report.mrr:.2f}"
    )
    if report.top1_accuracy < 1.0:
        raise typer.Exit(code=1)


@app.command()
def serve(
    port: Annotated[int, typer.Option(help="Port to listen on.")] = 8000,
    host: Annotated[str, typer.Option(help="Interface to bind.")] = "127.0.0.1",
    store_dir: Annotated[Path, typer.Option(help="Directory for analysis files.")] = Path(
        "analyses"
    ),
) -> None:
    """Run the local API server (spec §16). Localhost only by default."""
    import os

    import uvicorn

    os.environ["ROOTLINE_STORE"] = str(store_dir)
    console.print(f"Serving API on http://{host}:{port} (store: {store_dir})")
    uvicorn.run(
        "rootline_api.app:create_app",
        factory=True,
        host=host,
        port=port,
        log_level="info",
    )
