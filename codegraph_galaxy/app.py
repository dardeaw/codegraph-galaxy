"""Backward-compatibility shim.

The Flask application factory lives in :mod:`codegraph_galaxy.server`.
This module is kept so old imports (``from codegraph_galaxy.app import ...``)
don't break, but it contains no logic — do not add code here.
"""

from .server import create_app, resolve_template_path

__all__ = ["create_app", "resolve_template_path"]
