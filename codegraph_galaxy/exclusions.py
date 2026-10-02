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
GITIGNORE_NAME = ".gitignore"
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


def _FnGitCheckIgnore(str_repo: str, v_paths: List[str],
                      v_verbose: bool = False) -> List[str]:
    """Raw git check-ignore output (bytes-safe, quotepath off)."""
    import subprocess
    p = subprocess.run(
        ["git", "-c", "core.quotepath=off", "-C",
         os.path.abspath(str_repo), "check-ignore"] +
        (["-v"] if v_verbose else []) + ["--stdin"],
        input="\n".join(v_paths).encode("utf-8"),
        capture_output=True, timeout=30)
    if p.returncode not in (0, 1):
        raise RuntimeError("git check-ignore failed: %s" % (
            (p.stderr or b"").decode("utf-8", errors="replace")[:200]))
    return (p.stdout or b"").decode("utf-8", errors="replace").splitlines()


def FnUnignoreGitignore(str_repo: str, v_paths: List[str]
                        ) -> Tuple[List[str], List[Dict[str, str]]]:
    """Append !negations to .gitignore so hand-picked files become committable.

    This is the MANUAL door (version-control consequence): the file becomes
    trackable, unlike the include gate which git never sees. Every path is
    verified afterwards; lines that don't take effect (parent dir excluded,
    rule from another source) are ROLLED BACK so the file never collects
    dead negations. Returns (unignored, still_blocked[{path, source}]).
    """
    v_norm: List[str] = []
    for p in v_paths or []:
        n = _norm_pattern(p)
        if n not in v_norm:
            v_norm.append(n)
    if not v_norm:
        return [], []
    if len(v_norm) > 200:
        raise ValueError("Too many paths (max 200)")
    abs_repo = os.path.abspath(str_repo)
    if not os.path.isdir(os.path.join(abs_repo, ".git")):
        raise ValueError("Not a git repository")
    gi = os.path.join(abs_repo, GITIGNORE_NAME)
    orig_text = None
    if os.path.isfile(gi):
        with open(gi, "r", encoding="utf-8", errors="replace") as f:
            orig_text = f.read()
    v_orig = orig_text.splitlines() if orig_text is not None else []
    v_existing = {ln.strip() for ln in v_orig}
    v_wrote = ["!" + p for p in v_norm if ("!" + p) not in v_existing]
    if v_wrote:
        text = orig_text or ""
        if text and not text.endswith("\n"):
            text += "\n"
        tmp = gi + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text + "\n".join(v_wrote) + "\n")
        os.replace(tmp, gi)
    # Verify in two steps: plain run decides ignored-or-not (-v quirk prints
    # negation lines too, so it must only be fed known-ignored paths).
    v_still = set(_FnGitCheckIgnore(str_repo, v_norm, False))
    v_ok = [p for p in v_norm if p not in v_still]
    v_bad = [p for p in v_norm if p in v_still]
    v_blocked: Dict[str, str] = {}
    if v_bad:
        for ln in _FnGitCheckIgnore(str_repo, v_bad, True):
            if "\t" not in ln:
                continue
            src, path = ln.split("\t", 1)
            if src.rsplit(":", 1)[-1].startswith("!"):
                continue  # the -v quirk, not a real block
            v_blocked[path.strip().replace("\\", "/")] = src.strip()
        # Belt and braces: anything -v can't source is still blocked.
        for p in v_bad:
            v_blocked.setdefault(p, "unknown rule")
    if v_bad:
        v_drop = {"!" + p for p in v_bad}
        # Only our own lines roll back — pre-existing user lines untouched.
        v_final = v_orig + [ln for ln in v_wrote
                            if ln.strip() not in v_drop]
        if orig_text is None and not v_final:
            try:
                os.remove(gi)
            except OSError:
                pass
        else:
            with open(gi, "w", encoding="utf-8") as f:
                f.write("\n".join(v_final) + ("\n" if v_final else ""))
    return v_ok, [{"path": p, "source": v_blocked[p]} for p in v_bad]
