"""`python -m rootline` entry point (delegates to the Typer CLI)."""

from rootline_cli.cli import app

if __name__ == "__main__":
    app()
