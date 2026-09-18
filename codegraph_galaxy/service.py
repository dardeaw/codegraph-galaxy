"""Subprocess service for executing CodeGraph CLI actions (sync, init, uninit, index)."""
import os
import platform
import shutil
import subprocess
from typing import Dict, Any, Tuple, List, Optional

# Pinned CodeGraph CLI version (keep in sync with package.json dependencies).
CODEGRAPH_VERSION = "1.6.0"

_TIMEOUTS = {"sync": 60, "init": 120, "uninit": 30, "index": 180}

_CLI_MISSING = (
    "CodeGraph CLI not found. Run `npm install` in the project directory "
    "(bundled, pinned) or put `codegraph` on PATH."
)


class CodegraphNotFound(ValueError):
    """Raised when no CodeGraph CLI binary can be located."""


def _project_root() -> str:
    """Repository root (source checkout) or Electron resources dir (packaged)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _candidate_roots() -> List[str]:
    """Directories that may hold node_modules with the bundled CLI.

    Source checkout / `npm start`: the repo root. Packaged desktop app:
    backend runs from resources/ while asarUnpack puts node_modules under
    resources/app.asar.unpacked/.
    """
    root = _project_root()
    v_roots = [root]
    str_unpacked = os.path.join(root, "app.asar.unpacked")
    if str_unpacked not in v_roots:
        v_roots.append(str_unpacked)
    return v_roots


def _platform_tag() -> Optional[str]:
    """npm platform-arch tag, e.g. 'win32-x64' (None when unrecognized)."""
    system_map = {"windows": "win32", "darwin": "darwin", "linux": "linux"}
    arch_map = {"x86_64": "x64", "amd64": "x64", "aarch64": "arm64", "arm64": "arm64"}
    system = system_map.get(platform.system().lower())
    arch = arch_map.get(platform.machine().lower())
    if not system or not arch:
        return None
    return f"{system}-{arch}"


def resolve_codegraph() -> Tuple[List[str], str, Optional[str]]:
    """Locate the CodeGraph CLI.

    Returns (argv_prefix, source, hint_path). ``source`` is one of
    ``bundled`` (npm dependency shipped with the app), ``system`` (PATH)
    or ``none``. The prefix is prepended to every CLI invocation so no
    caller needs to know where the binary lives.
    """
    tag = _platform_tag()
    if tag:
        for root in _candidate_roots():
            pkg = os.path.join(root, "node_modules", "@colbymchenry", f"codegraph-{tag}")
            # Verified layout of the platform package (win32-x64 1.6.0):
            # self-contained node.exe + lib/dist/bin/codegraph.js — no shell,
            # no system node required.
            node_exe = os.path.join(pkg, "node.exe")
            entry_js = os.path.join(pkg, "lib", "dist", "bin", "codegraph.js")
            if os.path.isfile(node_exe) and os.path.isfile(entry_js):
                return [node_exe, entry_js], "bundled", pkg
            # POSIX npm bin (shebang; needs node on PATH at exec time).
            shim = os.path.join(root, "node_modules", ".bin", "codegraph")
            if os.path.isfile(shim):
                return [shim], "bundled", shim

    found = shutil.which("codegraph")
    if found:
        if os.name == "nt" and found.lower().endswith((".cmd", ".bat", ".ps1")):
            # Batch shims are not directly executable via CreateProcess;
            # route through cmd.exe without a shell.
            comspec = os.environ.get("COMSPEC", "cmd.exe")
            return [comspec, "/d", "/c", found], "system", found
        return [found], "system", found
    return [], "none", None


def get_codegraph_status() -> Dict[str, Any]:
    """Probe CLI availability for the repo-manager connection indicator."""
    argv, source, hint = resolve_codegraph()
    if source == "none":
        return {
            "available": False,
            "source": "none",
            "version": None,
            "path": None,
            "pinned": CODEGRAPH_VERSION,
            "matches_pinned": False,
            "error": _CLI_MISSING,
        }
    try:
        proc = subprocess.run(
            argv + ["--version"],
            shell=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        version = (proc.stdout or proc.stderr or "").strip().split()
        ok = proc.returncode == 0 and bool(version)
        ver = version[0] if ok else None
        return {
            "available": ok,
            "source": source,
            "version": ver,
            "path": hint,
            "pinned": CODEGRAPH_VERSION,
            "matches_pinned": ok and ver == CODEGRAPH_VERSION,
            "error": None if ok else (proc.stderr or proc.stdout or "version probe failed"),
        }
    except Exception as e:
        return {
            "available": False,
            "source": source,
            "version": None,
            "path": hint,
            "pinned": CODEGRAPH_VERSION,
            "matches_pinned": False,
            "error": str(e),
        }


def _validate_target(path: str) -> str:
    """Normalize *path* and ensure it exists. Raises ValueError otherwise.

    Centralizes input validation so no caller can pass an unchecked string
    to the ``codegraph`` CLI.
    """
    if not path or not isinstance(path, str):
        raise ValueError("Invalid target path")
    abs_path = os.path.abspath(path.strip())
    if not abs_path or not os.path.exists(abs_path):
        raise ValueError(f"Target path does not exist: {abs_path}")
    return abs_path


def _run_codegraph(args: List[str], timeout: int) -> Tuple[int, str]:
    """Run the ``codegraph`` CLI without a shell.

    Args are passed as a list (``shell=False``) so a crafted path can never
    be interpreted as shell metacharacters.
    """
    argv, source, _ = resolve_codegraph()
    if source == "none":
        raise CodegraphNotFound(_CLI_MISSING)
    proc = subprocess.run(
        argv + args,
        shell=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return proc.returncode, proc.stdout or proc.stderr


def execute_sync(repo_paths: List[str]) -> Dict[str, Dict[str, Any]]:
    """Execute 'codegraph sync' on a list of repo paths."""
    outputs: Dict[str, Dict[str, Any]] = {}
    for p in repo_paths:
        name = os.path.basename(os.path.abspath(p)) if isinstance(p, str) else str(p)
        try:
            target = _validate_target(p)
            code, out = _run_codegraph(["sync", target], _TIMEOUTS["sync"])
            outputs[name] = {"success": code == 0, "output": out}
        except ValueError as e:
            outputs[name] = {"success": False, "error": str(e)}
        except Exception as e:
            outputs[name] = {"success": False, "error": str(e)}
    return outputs

def execute_init(target_path: str) -> Tuple[bool, str]:
    """Execute 'codegraph init' on target repository."""
    try:
        target = _validate_target(target_path)
        if not os.path.isdir(target):
            return False, f"Not a directory: {target}"
        code, out = _run_codegraph(["init", "--yes", target], _TIMEOUTS["init"])
        return (True, out) if code == 0 else (False, out)
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def execute_uninit(target_path: str) -> Tuple[bool, str]:
    """Execute 'codegraph uninit -f' on target repository and remove .codegraph."""
    try:
        target = _validate_target(target_path)
        code, out = _run_codegraph(["uninit", "-f", target], _TIMEOUTS["uninit"])

        cg_dir = os.path.join(target, ".codegraph")
        if os.path.isdir(cg_dir):
            shutil.rmtree(cg_dir, ignore_errors=True)

        return (True, out) if code == 0 else (False, out)
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def execute_reindex(target_path: str) -> Tuple[bool, str]:
    """Execute 'codegraph index' on target repository."""
    try:
        target = _validate_target(target_path)
        code, out = _run_codegraph(["index", target], _TIMEOUTS["index"])
        return (True, out) if code == 0 else (False, out)
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)
