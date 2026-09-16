"""Subprocess service for executing CodeGraph CLI actions (sync, init, uninit, index)."""
import os
import shutil
import subprocess
from typing import Dict, Any, Tuple, List

def execute_sync(repo_paths: List[str]) -> Dict[str, Dict[str, Any]]:
    """Execute 'codegraph sync' on a list of repo paths."""
    outputs: Dict[str, Dict[str, Any]] = {}
    for p in repo_paths:
        name = os.path.basename(p)
        try:
            proc = subprocess.run(f'codegraph sync "{p}"', shell=True, capture_output=True, text=True, timeout=60)
            outputs[name] = {"success": proc.returncode == 0, "output": proc.stdout or proc.stderr}
        except Exception as e:
            outputs[name] = {"success": False, "error": str(e)}
    return outputs

def execute_init(target_path: str) -> Tuple[bool, str]:
    """Execute 'codegraph init' on target repository."""
    try:
        cmd = f'codegraph init "{target_path}"'
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        if proc.returncode == 0:
            return True, proc.stdout
        return False, proc.stderr or proc.stdout
    except Exception as e:
        return False, str(e)

def execute_uninit(target_path: str) -> Tuple[bool, str]:
    """Execute 'codegraph uninit -f' on target repository and remove .codegraph."""
    try:
        cmd = f'codegraph uninit -f "{target_path}"'
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        cg_dir = os.path.join(target_path, ".codegraph")
        if os.path.exists(cg_dir):
            shutil.rmtree(cg_dir, ignore_errors=True)

        return True, proc.stdout
    except Exception as e:
        return False, str(e)

def execute_reindex(target_path: str) -> Tuple[bool, str]:
    """Execute 'codegraph index' on target repository."""
    try:
        cmd = f'codegraph index "{target_path}"'
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=180)
        if proc.returncode == 0:
            return True, proc.stdout
        return False, proc.stderr or proc.stdout
    except Exception as e:
        return False, str(e)
