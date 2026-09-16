import argparse
import sys
import webbrowser
import threading
import time
from .app import create_app

def main():
    parser = argparse.ArgumentParser(
        prog="codegraph-viz",
        description="Interactive 3D WebGL Code Architecture Visualizer & Repository Manager for CodeGraph."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        help="Optional project directory paths to scan and include on startup."
    )
    parser.add_argument(
        "-p", "--port",
        type=int,
        default=5001,
        help="Port to run the visualizer server on (default: 5001)."
    )
    parser.add_argument(
        "-H", "--host",
        type=str,
        default="127.0.0.1",
        help="Host address to bind to (default: 127.0.0.1)."
    )
    parser.add_argument(
        "-o", "--open",
        action="store_true",
        help="Automatically open the visualizer in default web browser."
    )

    args = parser.parse_args()

    app = create_app(initial_paths=args.paths)
    url = f"http://{args.host}:{args.port}"
    print(f"CodeGraph 3D Visualizer running at: {url}")

    if args.open:
        def open_browser():
            time.sleep(0.8)
            webbrowser.open(url)
        threading.Thread(target=open_browser, daemon=True).start()

    app.run(host=args.host, port=args.port, debug=False)

if __name__ == "__main__":
    main()
