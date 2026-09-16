"""Database queries, AST graph topology extraction, and source snippet retrieval."""
import os
import sys
import sqlite3
from typing import Dict, List, Optional, Tuple, Any

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

        if parent_id:
            cur.execute("""
                SELECT * FROM nodes 
                WHERE id = ? OR parent_id = ? OR file_path = ?
            """, (parent_id, parent_id, parent_id))
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

        conn.close()
    except Exception as ex:
        print(f"Error querying db for {proj_name}: {ex}", file=sys.stderr)

    return nodes, links

def extract_code_snippet(
    repo_path: str,
    file_path: str,
    start_line: int,
    end_line: int
) -> Tuple[Dict[str, Any], int]:
    """Safely read lines from a source file."""
    abs_file = os.path.join(repo_path, file_path)
    if not os.path.exists(abs_file):
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
