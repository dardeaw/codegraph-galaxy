"""Command Line Interface for Code Graph Galaxy."""
import argparse
from .constants import DEFAULT_PORT, DEFAULT_HOST
from .server import create_app

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Code Graph Galaxy 3D Visualizer")
    parser.add_argument("-p", "--port", type=int, default=DEFAULT_PORT, help=f"Port to run the server on (default: {DEFAULT_PORT})")
    parser.add_argument("-H", "--host", default=DEFAULT_HOST, help=f"Host address (default: {DEFAULT_HOST})")
    parser.add_argument("-d", "--dir", action="append", dest="dirs", help="Project directories to load")
    parser.add_argument("--search-root", action="append", dest="search_roots", help="Custom search roots")
    parser.add_argument("--debug", action="store_true", help="Run Flask in debug mode")

    args = parser.parse_args()
    app = create_app(initial_paths=args.dirs, search_roots=args.search_roots)
    print(f"🌌 Code Graph Galaxy Visualizer running at: http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()
