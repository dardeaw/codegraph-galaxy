"""Docs layer for galaxy chat: read .md files next to the code (stdlib only).

codegraph CLI never indexes markdown, so docs live beside the graph, not in
it. The code<->docs link happens at query time: search/read/related tools
plus file-node highlights that land on the 3D graph.
"""
import os
import re
from typing import Any, Dict, List, Optional, Tuple

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
_SKIP_DIRS = {".git", ".codegraph", ".docgraph", "node_modules", "__pycache__",
              ".venv", "venv", "dist", "build"}
_MD_EXTS = (".md", ".markdown")
MAX_FILE_BYTES = 512 * 1024
MAX_FILES = 300


def _FnSafeJoin(str_repo: str, str_rel: str) -> str:
    """Join repo + relative path, rejecting escapes outside the repo."""
    abs_repo = os.path.abspath(str_repo)
    p = os.path.normpath(os.path.join(abs_repo, str_rel or ""))
    if os.path.commonpath([abs_repo, p]) != abs_repo:
        raise ValueError(f"Path escapes repository: {str_rel}")
    return p


def FnListDocs(str_repo: str, n_max: int = MAX_FILES) -> List[Dict[str, Any]]:
    """All markdown files under a repo (relative paths, size bytes)."""
    abs_repo = os.path.abspath(str_repo)
    v_out: List[Dict[str, Any]] = []
    for dp, dn, fn in os.walk(abs_repo):
        dn[:] = sorted(d for d in dn if d not in _SKIP_DIRS and not d.startswith("."))
        for f in sorted(fn):
            if not f.lower().endswith(_MD_EXTS):
                continue
            full = os.path.join(dp, f)
            try:
                if os.path.getsize(full) > MAX_FILE_BYTES:
                    continue
            except OSError:
                continue
            v_out.append({"path": os.path.relpath(full, abs_repo).replace(os.sep, "/"),
                          "size": os.path.getsize(full)})
            if len(v_out) >= n_max:
                return v_out
    return v_out


def FnDocToc(str_repo: str, str_rel: str) -> List[Dict[str, Any]]:
    """TOC of one markdown file: [{level, title, line}]."""
    full = _FnSafeJoin(str_repo, str_rel)
    with open(full, "r", encoding="utf-8", errors="replace") as f:
        v_lines = f.read().split("\n")
    v_toc: List[Dict[str, Any]] = []
    for n, line in enumerate(v_lines, 1):
        m = _HEADING_RE.match(line.strip())
        if m:
            v_toc.append({"level": len(m.group(1)), "title": m.group(2).strip(), "line": n})
    return v_toc


def FnDocSection(str_repo: str, str_rel: str, str_heading: str = "",
                 n_start: int = 0, n_end: int = 0) -> Dict[str, Any]:
    """Section text by heading (first exact, else contains match) or line range."""
    full = _FnSafeJoin(str_repo, str_rel)
    with open(full, "r", encoding="utf-8", errors="replace") as f:
        v_lines = f.read().split("\n")
    n_total = len(v_lines)
    if n_start > 0 or n_end > 0:
        s = max(1, n_start or 1) - 1
        e = min(n_total, n_end or s + 120)
        return {"path": str_rel, "start_line": s + 1, "end_line": e,
                "total_lines": n_total,
                "text": "\n".join(v_lines[s:e])[:8000]}
    if str_heading:
        want = str_heading.strip().lower()
        hit = None
        for n, line in enumerate(v_lines):
            m = _HEADING_RE.match(line.strip())
            if m and m.group(2).strip().lower() == want:
                hit = (n, len(m.group(1)))
                break
        if hit is None:
            for n, line in enumerate(v_lines):
                m = _HEADING_RE.match(line.strip())
                if m and want in m.group(2).strip().lower():
                    hit = (n, len(m.group(1)))
                    break
        if hit is None:
            return {"path": str_rel, "start_line": 0, "end_line": 0,
                    "total_lines": n_total, "text": "", "error": "heading not found"}
        s, lv = hit
        e = n_total
        for n in range(s + 1, n_total):
            m = _HEADING_RE.match(v_lines[n].strip())
            if m and len(m.group(1)) <= lv:
                e = n
                break
        return {"path": str_rel, "start_line": s + 1, "end_line": e,
                "total_lines": n_total, "text": "\n".join(v_lines[s:e])[:8000]}
    return {"path": str_rel, "start_line": 1, "end_line": min(n_total, 120),
            "total_lines": n_total, "text": "\n".join(v_lines[:120])[:8000]}


def FnSearchDocs(str_repo: str, str_keyword: str, n_limit: int = 15) -> List[Dict[str, Any]]:
    """Keyword search across a repo's markdown (hits with project-agnostic shape)."""
    kw = (str_keyword or "").strip().lower()
    if not kw:
        return []
    v_hits: List[Dict[str, Any]] = []
    for d in FnListDocs(str_repo):
        try:
            with open(_FnSafeJoin(str_repo, d["path"]), "r", encoding="utf-8",
                      errors="replace") as f:
                v_lines = f.read().split("\n")
        except (OSError, ValueError):
            continue
        n_file_hits = 0
        for n, line in enumerate(v_lines, 1):
            if kw in line.lower():
                lo, hi = max(0, n - 3), min(len(v_lines), n + 2)
                v_hits.append({"path": d["path"], "line": n,
                               "snippet": "\n".join(v_lines[lo:hi])[:600]})
                n_file_hits += 1
                if n_file_hits >= 4 or len(v_hits) >= n_limit:
                    break
        if len(v_hits) >= n_limit:
            break
    return v_hits


def FnRelatedDocs(str_repo: str, str_file: str, n_limit: int = 8) -> List[Dict[str, Any]]:
    """Heuristic code<->docs link for one source file.

    Same-dir README upward (3 levels) + docs/ trees mentioning the module stem.
    No DB coupling — pure filesystem convention.
    """
    try:
        anchor = os.path.dirname(_FnSafeJoin(str_repo, str_file))
    except ValueError:
        return []
    abs_repo = os.path.abspath(str_repo)
    v_out: List[Dict[str, Any]] = []
    seen = set()

    def _push(rel: str, why: str) -> None:
        if rel not in seen:
            seen.add(rel)
            v_out.append({"path": rel, "why": why})

    d = anchor
    for _ in range(4):
        if os.path.commonpath([abs_repo, d]) != abs_repo:
            break
        try:
            for f in sorted(os.listdir(d)):
                if f.lower() in ("readme.md", "readme_zh-tw.md", "readme.markdown"):
                    _push(os.path.relpath(os.path.join(d, f), abs_repo).replace(os.sep, "/"),
                          "same-dir README")
        except OSError:
            pass
        if d == abs_repo:
            break
        d = os.path.dirname(d)
    stem = os.path.splitext(os.path.basename(str_file))[0].lower()
    tokens = {t for t in re.split(r"[^a-z0-9]+", stem) if len(t) > 2}
    for docdir in ("docs", "doc", "wiki", "documentation"):
        dd = os.path.join(abs_repo, docdir)
        if not os.path.isdir(dd):
            continue
        for dp, dn, fn in os.walk(dd):
            dn[:] = [x for x in dn if x not in _SKIP_DIRS]
            for f in sorted(fn):
                if not f.lower().endswith(_MD_EXTS):
                    continue
                full = os.path.join(dp, f)
                try:
                    if os.path.getsize(full) > MAX_FILE_BYTES:
                        continue
                    with open(full, "r", encoding="utf-8", errors="replace") as fh:
                        head = fh.read(4000).lower()
                except OSError:
                    continue
                if stem in head or tokens & set(re.split(r"[^a-z0-9]+", head[:2000])):
                    _push(os.path.relpath(full, abs_repo).replace(os.sep, "/"),
                          "mentions module")
                if len(v_out) >= n_limit:
                    return v_out
    return v_out


def FnFileNodeId(str_db: str, str_rel: str) -> Optional[str]:
    """File node id for a relative path (lets doc hits light the 3D graph)."""
    import sqlite3
    norm = (str_rel or "").replace("\\", "/").lstrip("./")
    try:
        conn = sqlite3.connect(str_db)
        conn.row_factory = sqlite3.Row
        try:
            r = conn.execute(
                "SELECT id FROM nodes WHERE kind = 'file' AND "
                "(file_path = ? OR file_path LIKE ? OR file_path LIKE ?) LIMIT 1",
                (norm, "%/" + norm, norm + "%")).fetchone()
            return r["id"] if r else None
        finally:
            conn.close()
    except Exception:
        return None
