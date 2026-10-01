"""codegraph.json exclude-rule management (official CLI-supported).

The CLI reads <repo>/codegraph.json and honors its `exclude` patterns
(gitignore-style, project-root-relative) at sync time: matched files are
neither indexed nor re-added. This module is the ONLY writer/reader of
those rules on galaxy's side — no side lists, the rule lives in the repo,
visible and versionable.
"""
import json
import os
from typing import Any, Dict, List, Tuple

CONFIG_NAME = "codegraph.json"
MAX_PATTERNS = 2000


def _cfg_path(str_repo: str) -> str:
    return os.path.join(os.path.abspath(str_repo), CONFIG_NAME)


def _norm_pattern(p: Any) -> str:
    if not isinstance(p, str):
        raise ValueError("Exclude pattern must be a string")
    n = p.replace("\\", "/").strip().strip("/")
    if not n or n == ".." or n.startswith("../") or n.startswith("/"):
        raise ValueError("Invalid exclude pattern: %r" % (p,))
    if "/../" in n:
        raise ValueError("Invalid exclude pattern: %r" % (p,))
    return n


def _FnReadList(str_repo: str, str_key: str) -> List[str]:
    """Patterns from the repo's codegraph.json under key (missing -> [])."""
    cfg = _cfg_path(str_repo)
    if not os.path.isfile(cfg):
        return []
    with open(cfg, "r", encoding="utf-8") as f:
        data = json.load(f)  # raises on corrupt file — caller decides
    if not isinstance(data, dict):
        raise ValueError("codegraph.json is not an object")
    raw = data.get(str_key) or []
    if not isinstance(raw, list):
        raise ValueError("codegraph.json %s is not a list" % str_key)
    return [_norm_pattern(p) for p in raw]


def _FnWriteList(str_repo: str, str_key: str, v_add: List[str],
                 v_remove: List[str]) -> Tuple[List[str], bool]:
    """Merge add/remove into codegraph.json[key], preserving other keys.

    Creates the file when absent. NEVER clobbers a corrupt file (raises
    instead). Returns (patterns, changed).
    """
    v_add_n = [_norm_pattern(p) for p in (v_add or [])]
    v_rem_n = {_norm_pattern(p) for p in (v_remove or [])}
    cfg = _cfg_path(str_repo)
    data: Dict[str, Any] = {}
    if os.path.isfile(cfg):
        with open(cfg, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise ValueError("codegraph.json is not an object")
        if str_key in data and not isinstance(data[str_key], list):
            raise ValueError("codegraph.json %s is not a list" % str_key)
    v_cur: List[str] = [_norm_pattern(p) for p in (data.get(str_key) or [])]
    v_set = [p for p in v_cur if p not in v_rem_n]
    for p in v_add_n:
        if p not in v_set:
            v_set.append(p)
    if len(v_set) > MAX_PATTERNS:
        raise ValueError("Too many %s patterns (max %d)" % (str_key,
                                                             MAX_PATTERNS))
    changed = (v_set != v_cur)
    if changed:
        if v_set:
            data[str_key] = v_set
        else:
            data.pop(str_key, None)
        tmp = cfg + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp, cfg)
    return v_set, changed


def FnReadExcludes(str_repo: str) -> List[str]:
    """Patterns from the repo's codegraph.json (missing file -> [])."""
    return _FnReadList(str_repo, "exclude")


def FnWriteExcludes(str_repo: str, v_add: List[str],
                    v_remove: List[str]) -> Tuple[List[str], bool]:
    """Merge add/remove into codegraph.json exclude (see _FnWriteList)."""
    return _FnWriteList(str_repo, "exclude", v_add, v_remove)


def FnReadIncludes(str_repo: str) -> List[str]:
    """Force-index patterns: overrides .gitignore (official include gate)."""
    return _FnReadList(str_repo, "include")


def FnWriteIncludes(str_repo: str, v_add: List[str],
                    v_remove: List[str]) -> Tuple[List[str], bool]:
    """Merge add/remove into codegraph.json include (see _FnWriteList)."""
    return _FnWriteList(str_repo, "include", v_add, v_remove)


def FnIsExcluded(str_rel: str, v_patterns: List[str]) -> bool:
    """Display-side classification: exact file or dir-prefix match.

    Approximation of CLI gitignore matching, good for the patterns WE
    write (exact file paths, dir/ prefixes). The CLI remains source of
    truth at sync time.
    """
    n = (str_rel or "").replace("\\", "/").strip("/")
    if not n:
        return False
    for p in v_patterns or []:
        pp = (p or "").replace("\\", "/").strip("/")
        if not pp:
            continue
        if n == pp:
            return True
        base = pp[:-3] if pp.endswith("/**") else pp
        base = base.rstrip("/")
        if base and (n.startswith(base + "/") or n == base):
            return True
    return False
