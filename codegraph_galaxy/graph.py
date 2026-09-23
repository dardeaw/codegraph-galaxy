"""Database queries, AST graph topology extraction, and source snippet retrieval."""
import os
import re
import sys
import sqlite3
from typing import Dict, List, Optional, Tuple, Any

from . import docs as docs_lib

def fetch_project_graph(
    db_path: str,
    proj_name: str,
    repo_path: str,
    lod: str = "standard",
    parent_id: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Fetch nodes and links for a given repository database according to LOD settings."""
    nodes: List[Dict[str, Any]] = []
    links: List[Dict[str, Any]] = []

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # codegraph >= 1.6 dropped the parent_id column; older DBs still have it.
        node_cols = {r[1] for r in cur.execute("PRAGMA table_info(nodes)")}
        has_parent = "parent_id" in node_cols

        if parent_id:
            if has_parent:
                cur.execute("""
                    SELECT * FROM nodes
                    WHERE id = ? OR parent_id = ? OR file_path = ?
                """, (parent_id, parent_id, parent_id))
            else:
                # No hierarchy column: drill into the file's siblings instead.
                cur.execute("""
                    SELECT * FROM nodes
                    WHERE id = ? OR file_path = ?
                """, (parent_id, parent_id))
            nodes_rows = cur.fetchall()
        elif lod == "arch":
            cur.execute("SELECT * FROM nodes WHERE kind IN ('file', 'class', 'interface', 'namespace')")
            nodes_rows = cur.fetchall()
        elif lod == "standard":
            cur.execute("SELECT * FROM nodes WHERE kind IN ('file', 'class', 'interface', 'function', 'method', 'route')")
            nodes_rows = cur.fetchall()
        else:
            cur.execute("SELECT * FROM nodes")
            nodes_rows = cur.fetchall()

        loaded_node_ids = set()
        for r in nodes_rows:
            loaded_node_ids.add(r["id"])
            nodes.append({
                "id": r["id"],
                "name": r["name"] or r["id"],
                "kind": r["kind"],
                "project": proj_name,
                "project_path": repo_path,
                "file_path": r["file_path"],
                "start_line": r["start_line"],
                "end_line": r["end_line"],
                "qualified_name": r["qualified_name"],
                "signature": r["signature"]
            })

        cur.execute("SELECT source, target, kind FROM edges")
        for e in cur.fetchall():
            s, t, k = e["source"], e["target"], e["kind"]
            if s in loaded_node_ids and t in loaded_node_ids:
                links.append({
                    "source": s,
                    "target": t,
                    "kind": k,
                    "cross_project": False
                })

        if not parent_id:
            _FnMergeDocNodes(proj_name, repo_path, cur, nodes, links, loaded_node_ids)

        conn.close()
    except Exception as ex:
        print(f"Error querying db for {proj_name}: {ex}", file=sys.stderr)

    return nodes, links


def _FnDocStem(str_name: str) -> str:
    """Normalized stem for same-name matching (test_x.py <-> x.md)."""
    stem = os.path.splitext(os.path.basename(str_name or ""))[0].lower()
    for prefix in ("test_", "spec_", "tests_"):
        if stem.startswith(prefix):
            stem = stem[len(prefix):]
            break
    if stem.endswith("_test") or stem.endswith("_spec"):
        stem = stem.rsplit("_", 1)[0]
    return stem


def _FnMergeDocNodes(proj_name: str, repo_path: str, cur: Any,
                     nodes: List[Dict[str, Any]], links: List[Dict[str, Any]],
                     loaded_node_ids: set) -> None:
    """Merge markdown docs as first-class graph citizens (overview loads only).

    codegraph CLI never indexes .md, so docs are synthesized here: one `doc`
    node per markdown file. Edges are earned, not blanket-connected:
    same-stem match (Chart.md <-> Chart.ts) or the doc body mentioning the
    module stem. Unrelated co-location creates no edge.
    """
    try:
        v_docs = docs_lib.FnListDocs(repo_path)
    except Exception:
        return
    if not v_docs:
        return
    v_by_dir: Dict[str, List[str]] = {}
    for d in v_docs:
        v_by_dir.setdefault(os.path.dirname(d["path"]), []).append(d["path"])
    for str_dir, v_paths in v_by_dir.items():
        str_like = (str_dir + "/%") if str_dir else "%"
        try:
            v_files = [(r2[0], r2[1]) for r2 in cur.execute(
                "SELECT id, file_path FROM nodes WHERE kind = 'file' AND file_path LIKE ? LIMIT 60",
                (str_like,)).fetchall()]
        except Exception:
            v_files = []
        v_files = [(fid, fp) for fid, fp in v_files if fid in loaded_node_ids]
        for str_rel in v_paths:
            str_did = f"doc:{proj_name}:{str_rel}"
            if str_did in loaded_node_ids:
                continue
            nodes.append({
                "id": str_did,
                "name": os.path.basename(str_rel),
                "kind": "doc",
                "project": proj_name,
                "project_path": repo_path,
                "file_path": str_rel,
                "start_line": 1,
                "end_line": None,
                "qualified_name": str_rel,
                "signature": ""
            })
            loaded_node_ids.add(str_did)
            if not v_files:
                continue
            str_stem = _FnDocStem(str_rel)
            v_matched = [fid for fid, fp in v_files if _FnDocStem(fp) == str_stem]
            if not v_matched:
                try:
                    with open(os.path.join(repo_path, str_rel), "r",
                              encoding="utf-8", errors="replace") as f:
                        str_body = f.read(60000).lower()
                    v_matched = [fid for fid, fp in v_files
                                 if len(_FnDocStem(fp)) > 2 and re.search(
                                     r"(?<![a-z0-9_])" + re.escape(_FnDocStem(fp)) + r"(?![a-z0-9_])",
                                     str_body)][:8]
                except OSError:
                    v_matched = []
            for str_fid in v_matched[:8]:
                links.append({
                    "source": str_fid,
                    "target": str_did,
                    "kind": "doc",
                    "cross_project": False
                })

def extract_code_snippet(
    repo_path: str,
    file_path: str,
    start_line: int,
    end_line: int
) -> Tuple[Dict[str, Any], int]:
    """Safely read lines from a source file, with strict path traversal protection."""
    if not file_path or not isinstance(file_path, str):
        return {"code": "// Invalid file path", "total_lines": 0}, 400

    raw_path = file_path.replace("\\", "/")
    # Reject relative traversal or absolute roots
    if ".." in raw_path.split("/") or raw_path.startswith("/") or os.path.isabs(file_path):
        return {"code": "// Access denied: Path traversal detected", "total_lines": 0}, 403

    abs_repo = os.path.abspath(repo_path)
    clean_file = os.path.normpath(file_path).lstrip("/\\")
    abs_file = os.path.abspath(os.path.join(abs_repo, clean_file))

    try:
        common = os.path.commonpath([abs_repo, abs_file])
        if common != abs_repo:
            return {"code": "// Access denied: Path traversal detected", "total_lines": 0}, 403
    except (ValueError, Exception):
        return {"code": "// Access denied: Invalid path", "total_lines": 0}, 403

    if not os.path.isfile(abs_file):
        return {"code": "// File not found on disk", "total_lines": 0}, 200

    try:
        with open(abs_file, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        
        total_lines = len(lines)
        s_idx = max(0, start_line - 1)
        e_idx = min(total_lines, max(end_line, s_idx + 10))
        
        code_snippet = "".join(lines[s_idx:e_idx])
        return {
            "code": code_snippet,
            "start_line": s_idx + 1,
            "end_line": e_idx,
            "total_lines": total_lines
        }, 200
    except Exception as e:
        return {"code": f"// Error reading file: {e}", "total_lines": 0}, 200
