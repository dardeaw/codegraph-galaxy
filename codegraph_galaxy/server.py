"""Flask web server application factory and API routing."""
import json
import os
from typing import Optional, List
from flask import Flask, jsonify, request, Response
from .config import load_config, save_config, get_search_roots
from .scanner import scan_repositories, get_db_path, get_repo_metrics_and_delta
from .graph import fetch_project_graph, extract_code_snippet
from .service import execute_sync, execute_init, execute_uninit, execute_reindex, get_codegraph_status
from .chat_provider import GalaxyChatProvider, FnListProviders, FnSetChatDefault, FnAddProvider, FnDeleteProvider, FnTestProvider

def resolve_template_path(pkg_dir: str) -> Optional[str]:
    """Find index.html template file across common candidate locations."""
    candidates = [
        os.path.join(pkg_dir, "templates", "index.html"),
        # Legacy source-checkout layouts (pre-1.0.4 kept assets at repo root).
        os.path.join(os.path.dirname(pkg_dir), "templates", "index.html"),
        os.path.join(os.path.dirname(pkg_dir), "index.html"),
        os.path.join(os.getcwd(), "templates", "index.html"),
        os.path.join(os.getcwd(), "index.html"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None

def _known_repo_paths(repos: dict) -> set:
    """Absolute paths of discovered repositories (allowlist for CLI actions)."""
    return {os.path.abspath(p) for p in repos.values()}

def _sse_frame(str_event: str, o_data) -> str:
    """Minimal SSE frame (same contract as RDLib ChatDialogController)."""
    if not isinstance(o_data, str):
        o_data = json.dumps(o_data, ensure_ascii=False)
    v_lines = [f"event: {str_event}"]
    for str_line in o_data.splitlines() or [""]:
        v_lines.append(f"data: {str_line}")
    return "\n".join(v_lines) + "\n\n"

def create_app(initial_paths: Optional[List[str]] = None, search_roots: Optional[List[str]] = None) -> Flask:
    """Create and configure the Code Graph Galaxy Flask application."""
    if initial_paths and not search_roots:
        search_roots = initial_paths

    # UI assets ship inside the package so pip installs keep working.
    pkg_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(pkg_dir, "templates")
    static_dir = os.path.join(pkg_dir, "static")

    app = Flask(
        "codegraph_galaxy",
        template_folder=template_dir,
        static_folder=static_dir
    )
    app.config['TEMPLATES_AUTO_RELOAD'] = True

    @app.after_request
    def add_header(response):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    @app.route("/")
    def index():
        path = resolve_template_path(pkg_dir)
        if path and os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return Response(f.read(), mimetype="text/html; charset=utf-8")
        return "<h1>Code Graph Galaxy</h1><p>index.html not found</p>", 404

    @app.route("/api/projects")
    def list_projects():
        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        projects = []

        for name, p in sorted(repos.items()):
            db = get_db_path(p)
            nodes, edges, unindexed = get_repo_metrics_and_delta(p) if db else (0, 0, [])
            projects.append({
                "name": name,
                "path": p,
                "status": "ready" if db else "unindexed",
                "nodes": nodes,
                "links": edges,
                "edges": edges,
                "unindexed_files": unindexed,
                "pending_sync_count": len(unindexed)
            })

        return jsonify(projects)

    @app.route("/api/graph")
    def get_graph():
        proj_param = request.args.get("projects", "")
        lod = request.args.get("lod", "standard")
        parent_id = request.args.get("parent_id", None)

        if not proj_param:
            return jsonify({"nodes": [], "links": [], "edges": [], "unindexed_by_project": {}})

        target_projs = [p.strip() for p in proj_param.split(",") if p.strip()]
        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)

        all_nodes = []
        all_links = []
        unindexed_by_project = {}

        for proj_name in target_projs:
            repo_path = repos.get(proj_name)
            if not repo_path:
                continue

            db = get_db_path(repo_path)
            if not db:
                continue

            _, _, unindexed = get_repo_metrics_and_delta(repo_path)
            if unindexed:
                unindexed_by_project[proj_name] = unindexed

            nodes, links = fetch_project_graph(db, proj_name, repo_path, lod=lod, parent_id=parent_id)
            all_nodes.extend(nodes)
            all_links.extend(links)

        return jsonify({
            "nodes": all_nodes,
            "links": all_links,
            "edges": all_links,
            "unindexed_by_project": unindexed_by_project
        })

    @app.route("/api/code")
    def get_code():
        proj = request.args.get("project", "")
        file_path = request.args.get("file_path", "")
        try:
            start_line = int(request.args.get("start_line", 1))
            end_line = int(request.args.get("end_line", start_line + 50))
        except (TypeError, ValueError):
            return jsonify({"code": "// Invalid line range", "total_lines": 0}), 400
        if start_line < 1:
            start_line = 1
        if end_line < start_line:
            end_line = start_line + 50
        # Cap the window so one request can't dump a giant file.
        end_line = min(end_line, start_line + 500)

        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        repo_path = repos.get(proj)

        if not repo_path:
            return jsonify({"code": "// Project directory not found", "total_lines": 0})

        data, status = extract_code_snippet(repo_path, file_path, start_line, end_line)
        return jsonify(data), status

    @app.route("/api/codegraph")
    def codegraph_status():
        """CLI availability for the repo-manager connection indicator."""
        return jsonify(get_codegraph_status())

    def _make_chat_provider() -> GalaxyChatProvider:
        def fn_resolve_db(name: str):
            roots = get_search_roots(search_roots)
            repos = scan_repositories(roots)
            p = repos.get(name or "")
            if not p:
                return None
            db = get_db_path(p)
            return (db, p) if db else None

        def fn_list_projects():
            roots = get_search_roots(search_roots)
            return sorted(scan_repositories(roots).keys())

        return GalaxyChatProvider(fn_resolve_db=fn_resolve_db, fn_list_projects=fn_list_projects)

    @app.route("/api/chat/models", methods=["GET"])
    def chat_models():
        """opencode-like provider/model listing for the chat panel switcher."""
        return jsonify(FnListProviders())

    @app.route("/api/chat/model", methods=["POST"])
    def chat_set_model():
        data = request.get_json(silent=True) or {}
        return jsonify(FnSetChatDefault(data.get("provider"), data.get("model")))

    @app.route("/api/chat/providers", methods=["GET"])
    def chat_providers():
        return jsonify(FnListProviders())

    @app.route("/api/chat/providers", methods=["POST"])
    def chat_add_provider():
        data = request.get_json(silent=True) or {}
        try:
            entry = FnAddProvider(data.get("label", ""), data.get("base", ""),
                                  data.get("key", ""), data.get("models") or [])
            return jsonify({"bSuccess": True, "provider": entry})
        except ValueError as e:
            return jsonify({"bSuccess": False, "strError": str(e)}), 400

    @app.route("/api/chat/providers/<pid>", methods=["DELETE"])
    def chat_delete_provider(pid):
        if FnDeleteProvider(pid):
            return jsonify({"bSuccess": True})
        return jsonify({"bSuccess": False, "strError": "僅可刪除自建 provider"}), 400

    @app.route("/api/chat/providers/<pid>/test", methods=["POST"])
    def chat_test_provider(pid):
        return jsonify(FnTestProvider(pid))

    @app.route("/api/chat", methods=["POST"])
    def chat():
        data = request.get_json(silent=True) or {}
        msg = str(data.get("strMessage") or data.get("message") or "").strip()
        if not msg:
            return jsonify({"bSuccess": False, "strError": "Empty message"}), 400
        ctx = data.get("dicContext") or data.get("context") or {}
        res = _make_chat_provider().FnChat(msg, ctx if isinstance(ctx, dict) else {},
                                           data.get("model"), data.get("provider"))
        return jsonify({"bSuccess": True, **res})

    @app.route("/api/chat/stream", methods=["POST"])
    def chat_stream():
        data = request.get_json(silent=True) or {}
        msg = str(data.get("strMessage") or data.get("message") or "").strip()
        ctx = data.get("dicContext") or data.get("context") or {}
        if not isinstance(ctx, dict):
            ctx = {}
        provider = _make_chat_provider()

        def gen():
            if not msg:
                yield _sse_frame("error", {"strError": "Empty message"})
                return
            try:
                for kind, payload in provider.FnChatStream(msg, ctx, data.get("model"), data.get("provider")):
                    if kind == "delta":
                        yield _sse_frame("chat_delta", {"strDelta": payload})
                    elif kind == "trace":
                        yield _sse_frame("chat_trace", payload if isinstance(payload, dict) else {"strSummary": str(payload)})
                    elif kind == "done":
                        yield _sse_frame("chat_done", payload if isinstance(payload, dict) else {"strReply": str(payload)})
            except Exception as e:
                yield _sse_frame("error", {"strError": str(e)})

        return Response(gen(), mimetype="text/event-stream", headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        })

    @app.route("/api/sync", methods=["POST"])
    def sync_all():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path")
        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        
        target_repos: list = []
        if target_path:
            abs_target = os.path.abspath(target_path)
            if abs_target not in _known_repo_paths(repos):
                return jsonify({os.path.basename(abs_target): {"success": False, "error": "Unknown repository path"}}), 400
            target_repos = [abs_target]
        else:
            target_repos = [p for p in repos.values() if get_db_path(p)]
        outputs = execute_sync(target_repos)
        return jsonify(outputs)

    @app.route("/api/project/exclude", methods=["POST"])
    def exclude_project():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path", "").strip()
        paths = data.get("paths") or []
        if target_path and target_path not in paths:
            paths.append(target_path)

        if not paths:
            return jsonify({"success": False, "error": "Path or paths required"}), 400

        cfg = load_config()
        excluded = cfg.setdefault("excluded_paths", [])
        added = []
        for p in paths:
            if isinstance(p, str) and p.strip():
                np = os.path.abspath(p.strip())
                if np not in excluded:
                    excluded.append(np)
                    added.append(np)
        if added:
            save_config(cfg)
        return jsonify({"success": True, "excluded": added or [os.path.abspath(p) for p in paths]})

    @app.route("/api/project/init", methods=["POST"])
    def init_project():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path", "").strip()
        if not target_path or not os.path.isdir(target_path):
            return jsonify({"success": False, "error": "Invalid project path"}), 400

        ok, out = execute_init(target_path)
        if ok:
            return jsonify({"success": True, "output": out})
        return jsonify({"success": False, "error": out}), 500

    @app.route("/api/project/uninit", methods=["POST"])
    def uninit_project():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path", "").strip()
        if not target_path or not os.path.isdir(target_path):
            return jsonify({"success": False, "error": "Invalid project path"}), 400

        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        if os.path.abspath(target_path) not in _known_repo_paths(repos):
            return jsonify({"success": False, "error": "Unknown repository path"}), 400

        ok, out = execute_uninit(target_path)
        if ok:
            return jsonify({"success": True, "output": out})
        return jsonify({"success": False, "error": out}), 500

    @app.route("/api/project/reindex", methods=["POST"])
    def reindex_project():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path", "").strip()
        if not target_path or not os.path.isdir(target_path):
            return jsonify({"success": False, "error": "Invalid project path"}), 400

        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        if os.path.abspath(target_path) not in _known_repo_paths(repos):
            return jsonify({"success": False, "error": "Unknown repository path"}), 400

        ok, out = execute_reindex(target_path)
        if ok:
            return jsonify({"success": True, "output": out})
        return jsonify({"success": False, "error": out}), 500

    @app.route("/api/paths/add", methods=["POST"])
    def add_custom_path():
        data = request.get_json(silent=True) or {}
        new_path = data.get("path", "").strip()
        if not new_path or not os.path.exists(new_path):
            return jsonify({"success": False, "error": "Invalid directory path"}), 400

        abs_path = os.path.abspath(new_path)
        cfg = load_config()
        roots = cfg.get("custom_roots", [])
        if abs_path not in roots:
            roots.append(abs_path)
            cfg["custom_roots"] = roots
            save_config(cfg)

        return jsonify({"success": True, "path": abs_path})

    return app
