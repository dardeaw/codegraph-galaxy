#!/usr/bin/env python3
"""Code Graph Galaxy: Application entry point."""
import sys
from codegraph_galaxy.cli import main
from codegraph_galaxy.server import create_app

if __name__ == "__main__":
    main()
