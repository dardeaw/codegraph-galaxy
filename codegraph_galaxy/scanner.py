"""Repository discovery, file system scanning, and database metrics."""
import os
import sqlite3
import subprocess
from typing import Dict, List, Optional, Set, Tuple
from .constants import IGNORE_DIRS, SRC_EXTS, DOC_EXTS
from .exclusions import FnReadExcludes, FnIsExcluded


def _FnGitIgnored(repo_path: str, rel_paths: List[str]) -> Set[str]:
    """Subset git refuses (respects .gitignore). Empty when not a git repo.

    The CLI honors .gitignore natively, so these files can NEVER be indexed
    no matter how often you sync — showing "index me" for them is a lie.
    Non-matching output (CJK/codec edge) safely stays pending, never hidden.
    """
    try:
        if not rel_paths:
            return set()
        if not os.path.isdir(os.path.join(repo_path, ".git")):
            return set()
        # Bytes in/out: text mode would translate \n to \r\n on Windows and
        # git would C-quote the echoed paths (no match). quotepath off keeps
        # CJK names matchable; undecodable output safely stays pending.
        p = subprocess.run(
            ["git", "-c", "core.quotepath=off", "-C", repo_path,
             "check-ignore", "--stdin"],
            input="\n".join(rel_paths).encode("utf-8"),
            capture_output=True, timeout=30)
        if p.returncode not in (0, 1):
            return set()
        return {ln.strip().replace("\\", "/")
                for ln in (p.stdout or b"").decode("utf-8",
                                                   errors="replace").splitlines()
                if ln.strip()}
    except Exception:
        return set()

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

def get_repo_metrics_and_delta(repo_path: str) -> Tuple[int, int, List[str], List[str], List[str], List[str]]:
    """Node/edge counts, unindexed, indexed, rule-ignored, git-ignored."""
    db_path = get_db_path(repo_path)
    if not db_path:
        return 0, 0, [], [], [], []
    
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
    # Doc citizens (.md/.json/.html) live beside the graph, never as pending:
    # the CLI has no grammar for them, so nagging "index me" is a lie.
    # Rule-ignored files (codegraph.json exclude) are classified separately:
    # intentionally out, shown as ignored — never nagged, never resurrected.
    try:
        v_rules = FnReadExcludes(repo_path)
    except Exception:
        v_rules = []
    v_delta = disk_files - indexed_files
    v_git = _FnGitIgnored(repo_path, sorted(v_delta))
    pending = sorted(
        f for f in v_delta
        if not f.lower().endswith(DOC_EXTS) and f not in v_git
        and not FnIsExcluded(f, v_rules))
    ignored = sorted(
        f for f in v_delta if f not in v_git and FnIsExcluded(f, v_rules))
    vcs_ignored = sorted(v_delta & v_git)
    return (node_count, edge_count, pending, sorted(indexed_files),
            ignored, vcs_ignored)

def scan_repositories(search_roots: List[str]) -> Dict[str, str]:
    """Scan search roots and return a dict of {project_name: abs_path}."""
    repos: Dict[str, str] = {}
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
            name = os.path.basename(root) or root
            repos[name] = abs_root
            
    return repos
