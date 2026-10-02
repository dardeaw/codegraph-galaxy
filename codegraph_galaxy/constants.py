"""Constants and default settings for Code Graph Galaxy."""
import os

IGNORE_DIRS = {
    ".git", ".codegraph", "node_modules", "dist", "build", ".venv", "venv", "env",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".idea", ".vscode", "target", "vendor"
}

SRC_EXTS = (
    ".py", ".ts", ".js", ".jsx", ".tsx", ".go", ".rs", ".java", ".c", ".cpp", ".h",
    ".hpp", ".cs", ".vue", ".html", ".css", ".sql", ".sh", ".json", ".yaml", ".yml"
)

# Parser-blind but human-readable: rendered as Doc citizens (globe + tree),
# never nagged as pending. codegraph CLI has no grammar for these.
DOC_EXTS = (".md", ".markdown", ".json", ".html")

CONFIG_FILE = os.path.expanduser("~/.codegraph_viz_config.json")
DEFAULT_PORT = 5001
DEFAULT_HOST = "127.0.0.1"
