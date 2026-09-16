"""Subprocess service for executing CodeGraph CLI actions (sync, init, uninit, index)."""
import os
import shutil
import subprocess
from typing import Dict, Any, Tuple, List

_TIMEOUTS = {"sync": 60, "init": 120, "uninit": 30, "index": 180}


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
    proc = subprocess.run(
        ["codegraph"] + args,
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
        code, out = _run_codegraph(["init", target], _TIMEOUTS["init"])
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
