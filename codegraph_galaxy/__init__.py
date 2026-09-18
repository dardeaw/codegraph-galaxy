"""Code Graph Galaxy: Next-generation 3D architecture topology visualizer."""

__version__ = "2.0.0"

from .server import create_app
from .cli import main

__all__ = ["create_app", "main", "__version__"]
