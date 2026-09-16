"""Repository discovery, file system scanning, and database metrics."""
import os
import sqlite3
from typing import Dict, List, Optional, Set, Tuple
from .constants import IGNORE_DIRS, SRC_EXTS
from .config import load_config

def get_db_path(repo_path: str) -> Optional[str]:
    """Return SQLite database path for a CodeGraph repository if present."""
    p = os.path.join(repo_path, ".codegraph", "codegraph.db")
    return p if os.path.exists(p) else None

def scan_disk_files(repo_path: str) -> Set[str]:
    """Scan all source code files inside the repository on disk."""
    disk_files: Set[str] = set()
    for r, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for f in files:
            if f.endswith(SRC_EXTS):
                rel = os.path.relpath(os.path.join(r, f), repo_path).replace("\\", "/").strip("/")
                disk_files.add(rel)
    return disk_files

def get_repo_metrics_and_delta(repo_path: str) -> Tuple[int, int, List[str]]:
    """Compute node count, edge count, and unindexed files for a repo."""
    db_path = get_db_path(repo_path)
    if not db_path:
        return 0, 0, []
    
    indexed_files: Set[str] = set()
    node_count = 0
    edge_count = 0
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM nodes")
        node_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM edges")
        edge_count = cur.fetchone()[0]
        cur.execute("SELECT DISTINCT file_path FROM nodes WHERE kind='file'")
        indexed_files = set(r[0].replace("\\", "/").strip("/") for r in cur.fetchall() if r[0])
        conn.close()
    except Exception:
        pass

    disk_files = scan_disk_files(repo_path)
    unindexed = sorted(list(disk_files - indexed_files))
    return node_count, edge_count, unindexed

def scan_repositories(search_roots: List[str]) -> Dict[str, str]:
    """Scan search roots and return a dict of {project_name: abs_path}."""
    repos: Dict[str, str] = {}
    cfg = load_config()
    excluded_paths = set(os.path.abspath(p) for p in cfg.get("excluded_paths", []))
    
    for root in search_roots:
        if not os.path.exists(root):
            continue
        
        has_sub_repos = False
        try:
            items = os.listdir(root)
            for item in items:
                if item in IGNORE_DIRS or item.startswith("."):
                    continue
                full_path = os.path.join(root, item)
                if not os.path.isdir(full_path):
                    continue
                
                abs_full = os.path.abspath(full_path)
                if abs_full in excluded_paths:
                    continue

                has_cg = os.path.isdir(os.path.join(full_path, ".codegraph"))
                has_git = os.path.isdir(os.path.join(full_path, ".git"))
                try:
                    sub_files = os.listdir(full_path)
                    has_src = any(f.endswith(SRC_EXTS) for f in sub_files[:30])
                except Exception:
                    has_src = False
                
                if has_cg or has_git or has_src:
                    repos[item] = abs_full
                    if has_cg:
                        has_sub_repos = True
        except (PermissionError, FileNotFoundError):
            continue

        if not has_sub_repos and os.path.isdir(os.path.join(root, ".codegraph")):
            abs_root = os.path.abspath(root)
            if abs_root not in excluded_paths:
                name = os.path.basename(root) or root
                repos[name] = abs_root
            
    return repos
