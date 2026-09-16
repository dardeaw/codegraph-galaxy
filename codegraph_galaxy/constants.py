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

CONFIG_FILE = os.path.expanduser("~/.codegraph_viz_config.json")
DEFAULT_PORT = 5001
DEFAULT_HOST = "127.0.0.1"
