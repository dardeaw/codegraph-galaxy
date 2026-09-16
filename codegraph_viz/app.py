
import os
import sys
import json
import sqlite3
import subprocess
import shutil
from pathlib import Path
from flask import Flask, jsonify, request, render_template

CONFIG_FILE = os.path.expanduser("~/.codegraph_viz_config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                roots = data.get("custom_roots") or data.get("custom_paths") or []
                excluded = data.get("excluded_paths") or []
                return {"custom_roots": roots, "excluded_paths": excluded}
        except Exception:
            pass
    return {"custom_roots": [], "excluded_paths": []}

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Failed to save config: {e}", file=sys.stderr)

def get_search_roots(extra_paths=None):
    roots = []
    if extra_paths:
        for p in extra_paths:
            abs_p = os.path.abspath(p)
            if abs_p not in roots and os.path.exists(abs_p):
                roots.append(abs_p)

    cfg = load_config()
    for p in cfg.get("custom_roots", []):
        abs_p = os.path.abspath(p)
        if abs_p not in roots and os.path.exists(abs_p):
            roots.append(abs_p)

    cwd = os.getcwd()
    if cwd not in roots:
        roots.append(cwd)

    parent_dir = os.path.dirname(cwd)
    if parent_dir not in roots and os.path.exists(parent_dir):
        roots.append(parent_dir)

    home_dir = os.path.expanduser("~")
    for common in ["Projects", "Workspace", "Source", "Repos", "Code", "PythonCode", "PyCode"]:
        cand = os.path.join(home_dir, common)
        if os.path.isdir(cand) and cand not in roots:
            roots.append(cand)

    return roots

IGNORE_DIRS = {
    ".git", ".codegraph", "node_modules", "dist", "build", ".venv", "venv", "env",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".idea", ".vscode", "target", "vendor"
}

SRC_EXTS = (
    ".py", ".ts", ".js", ".jsx", ".tsx", ".go", ".rs", ".java", ".c", ".cpp", ".h",
    ".hpp", ".cs", ".vue", ".html", ".css", ".sql", ".sh", ".json", ".yaml", ".yml"
)

def scan_repositories(search_roots):
    repos = {}
    cfg = load_config()
    excluded_paths = set(os.path.abspath(p) for p in cfg.get("excluded_paths", []))
    
    for root in search_roots:
        if not os.path.exists(root):
            continue
        
        has_sub_repos = False
        try:
            items = os.listdir(root)
            for item in items:
                if item in IGNORE_DIRS or item.startswith("."):
                    continue
                full_path = os.path.join(root, item)
                if not os.path.isdir(full_path):
                    continue
                
                abs_full = os.path.abspath(full_path)
                if abs_full in excluded_paths:
                    continue

                has_cg = os.path.isdir(os.path.join(full_path, ".codegraph"))
                has_git = os.path.isdir(os.path.join(full_path, ".git"))
                try:
                    sub_files = os.listdir(full_path)
                    has_src = any(f.endswith(SRC_EXTS) for f in sub_files[:30])
                except Exception:
                    has_src = False
                
                if has_cg or has_git or has_src:
                    repos[item] = abs_full
                    if has_cg:
                        has_sub_repos = True
        except (PermissionError, FileNotFoundError):
            continue

        if not has_sub_repos and os.path.isdir(os.path.join(root, ".codegraph")):
            abs_root = os.path.abspath(root)
            if abs_root not in excluded_paths:
                name = os.path.basename(root) or root
                repos[name] = abs_root
            
    return repos

def get_db_path(repo_path):
    p = os.path.join(repo_path, ".codegraph", "codegraph.db")
    return p if os.path.exists(p) else None

def scan_disk_files(repo_path):
    disk_files = set()
    for r, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for f in files:
            if f.endswith(SRC_EXTS):
                rel = os.path.relpath(os.path.join(r, f), repo_path).replace("\\", "/").strip("/")
                disk_files.add(rel)
    return disk_files

def get_repo_metrics_and_delta(repo_path):
    db_path = get_db_path(repo_path)
    if not db_path:
        return 0, 0, []
    
    indexed_files = set()
    node_count = 0
    edge_count = 0
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM nodes")
        node_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM edges")
        edge_count = cur.fetchone()[0]
        cur.execute("SELECT DISTINCT file_path FROM nodes WHERE kind='file'")
        indexed_files = set(r[0].replace("\\", "/").strip("/") for r in cur.fetchall() if r[0])
        conn.close()
    except Exception:
        pass

    disk_files = scan_disk_files(repo_path)
    unindexed = sorted(list(disk_files - indexed_files))
    return node_count, edge_count, unindexed

def create_app(initial_paths=None, search_roots=None):
    if initial_paths and not search_roots:
        search_roots = initial_paths
    app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), "templates"), static_folder=os.path.join(os.path.dirname(__file__), "static"))
    app.config['TEMPLATES_AUTO_RELOAD'] = True

    @app.after_request
    def add_header(response):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    @app.route("/")
    def index():
        return render_template("index.html")

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

            try:
                conn = sqlite3.connect(db)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()

                if parent_id:
                    cur.execute("""
                        SELECT * FROM nodes 
                        WHERE id = ? OR parent_id = ? OR file_path = ?
                    """, (parent_id, parent_id, parent_id))
                    nodes_rows = cur.fetchall()
                elif lod == "arch":
                    cur.execute("SELECT * FROM nodes WHERE kind IN ('file', 'class', 'interface', 'namespace')")
                    nodes_rows = cur.fetchall()
                elif lod == "standard":
                    cur.execute("SELECT * FROM nodes WHERE kind IN ('file', 'class', 'interface', 'function', 'method', 'route')")
                    nodes_rows = cur.fetchall()
                else:
                    cur.execute("SELECT * FROM nodes")
                    nodes_rows = cur.fetchall()

                loaded_node_ids = set()
                for r in nodes_rows:
                    loaded_node_ids.add(r["id"])
                    all_nodes.append({
                        "id": r["id"],
                        "name": r["name"] or r["id"],
                        "kind": r["kind"],
                        "project": proj_name,
                        "project_path": repo_path,
                        "file_path": r["file_path"],
                        "start_line": r["start_line"],
                        "end_line": r["end_line"],
                        "qualified_name": r["qualified_name"],
                        "signature": r["signature"]
                    })

                cur.execute("SELECT source, target, kind FROM edges")
                for e in cur.fetchall():
                    s, t, k = e["source"], e["target"], e["kind"]
                    if s in loaded_node_ids and t in loaded_node_ids:
                        all_links.append({
                            "source": s,
                            "target": t,
                            "kind": k,
                            "cross_project": False
                        })

                conn.close()
            except Exception as ex:
                print(f"Error querying db for {proj_name}: {ex}", file=sys.stderr)

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
        start_line = int(request.args.get("start_line", 1))
        end_line = int(request.args.get("end_line", start_line + 50))

        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        repo_path = repos.get(proj)

        if not repo_path:
            return jsonify({"code": "// Project directory not found", "total_lines": 0})

        abs_file = os.path.join(repo_path, file_path)
        if not os.path.exists(abs_file):
            return jsonify({"code": "// File not found on disk", "total_lines": 0})

        try:
            with open(abs_file, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            
            total_lines = len(lines)
            s_idx = max(0, start_line - 1)
            e_idx = min(total_lines, max(end_line, s_idx + 10))
            
            code_snippet = "".join(lines[s_idx:e_idx])
            return jsonify({
                "code": code_snippet,
                "start_line": s_idx + 1,
                "end_line": e_idx,
                "total_lines": total_lines
            })
        except Exception as e:
            return jsonify({"code": f"// Error reading file: {e}", "total_lines": 0})

    @app.route("/api/sync", methods=["POST"])
    def sync_all():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path")
        roots = get_search_roots(search_roots)
        repos = scan_repositories(roots)
        
        target_repos = [target_path] if target_path else [p for p in repos.values() if get_db_path(p)]
        outputs = {}

        for p in target_repos:
            name = os.path.basename(p)
            try:
                proc = subprocess.run(f'codegraph sync "{p}"', shell=True, capture_output=True, text=True, timeout=60)
                outputs[name] = {"success": proc.returncode == 0, "output": proc.stdout or proc.stderr}
            except Exception as e:
                outputs[name] = {"success": False, "error": str(e)}

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
        if not target_path or not os.path.exists(target_path):
            return jsonify({"success": False, "error": "Invalid project path"}), 400

        try:
            cmd = f'codegraph init "{target_path}"'
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
            if proc.returncode == 0:
                return jsonify({"success": True, "output": proc.stdout})
            else:
                return jsonify({"success": False, "error": proc.stderr or proc.stdout}), 500
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/api/project/uninit", methods=["POST"])
    def uninit_project():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path", "").strip()
        if not target_path or not os.path.exists(target_path):
            return jsonify({"success": False, "error": "Invalid project path"}), 400

        try:
            cmd = f'codegraph uninit -f "{target_path}"'
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            cg_dir = os.path.join(target_path, ".codegraph")
            if os.path.exists(cg_dir):
                shutil.rmtree(cg_dir, ignore_errors=True)

            return jsonify({"success": True, "output": proc.stdout})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/api/project/reindex", methods=["POST"])
    def reindex_project():
        data = request.get_json(silent=True) or {}
        target_path = data.get("path", "").strip()
        if not target_path or not os.path.exists(target_path):
            return jsonify({"success": False, "error": "Invalid project path"}), 400

        try:
            cmd = f'codegraph index "{target_path}"'
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=180)
            if proc.returncode == 0:
                return jsonify({"success": True, "output": proc.stdout})
            else:
                return jsonify({"success": False, "error": proc.stderr or proc.stdout}), 500
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

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
