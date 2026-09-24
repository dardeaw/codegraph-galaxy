# Code Graph Galaxy

> **A high-performance 3D code intelligence visualizer and architecture exploration suite for multi-project codebases — now with an AI chat agent that looks up your code before it answers.**  
> Effortlessly transform complex software structures and dependency networks into an interactive, intuitive celestial universe.

---

[English](README.md) | [繁體中文](README_zh-TW.md)

---
<img width="1132" height="751" alt="image" src="https://github.com/user-attachments/assets/f50e3a64-dc4a-4086-b97f-196dc74555e1" />



##  What is Code Graph Galaxy?

Modern codebases grow rapidly. Understanding cross-project dependencies, module hierarchies, and unindexed source changes can quickly become overwhelming in plain text files or static 2D diagrams.

**Code Graph Galaxy** bridges the gap between deep abstract code architecture and human spatial intuition. Powered by **Three.js WebGL** hardware acceleration and an embedded Python AST intelligence engine, it maps your repositories, classes, functions, files, and dependencies into an interactive 3D universe.

Whether you are onboarding onto a massive project, conducting architecture refactoring, performing code reviews, or tracking delta changes, Code Graph Galaxy gives you an instant, holistic bird’s-eye perspective with surgical line-by-line inspection. Its built-in **AI Code Chat** goes one step further: ask about your codebase in plain language, watch the agent look up symbols, call chains, and source lines, then jump straight to the answer on the graph.

---

##  Key Features & Capabilities

###  1. Interactive 3D Galaxy Engine
- **Hardware-Accelerated 3D Force-Directed Layout**: Smoothly navigate complex graphs with tens of thousands of nodes with dynamic physics simulation, glow bloom effects, and customizable ambient light.
- **Intuitive Camera Navigation**: Full orbit rotation, multi-touch/mouse wheel zooming, smooth panning, and **one-click camera reset** (`Ctrl+0`).
- **Autonomous Galaxy Rotation**: One-click auto-spin (`Ctrl+Space` / Auto Rotate button) for architecture presentations, demos, and live team walkthroughs.

###  2. Multi-Tier LOD (Level of Detail) Dynamic Filter
Adapt visual density on the fly without overwhelming the screen:
- ** Architecture Mode (Default)**: Highlights high-level structures (Files, Classes, Interfaces, Namespaces) to reveal core module boundaries and subsystem relationships.
- ** Standard Mode**: Unfolds essential implementation symbols (Functions, Methods, API Routes).
- ** Detailed Mode**: Complete graph representation including variables, types, and internal AST hops.
- ** Customized Mode**: Granular filter toggles allowing you to selectively isolate specific symbol kinds.

###  3. Seamless Synchronized Indexing (Zero Camera Drift)
- ** Sync from CodeGraph**: Instantly refresh the dependency graph when your codebase changes.
- **Vantage Point Preservation**: Unlike conventional visualization tools that reset positions upon reloading, Code Graph Galaxy locks your camera coordinates, orbit angles, and physics vectors, ensuring seamless exploration continuity.

###  4. Multi-Project Repository Explorer & Tree Navigation
- **Hierarchical Project Tree**: Explore folder structures with live folder collapse/expand, directory-level unindexed counters, and direct file focus.
- **Full Symbol List, Independent of 3D LOD**: The tree always lists every symbol (functions, methods, imports, variables) even when Architecture mode hides them in 3D.
- **Nested Symbols**: Methods fold under their parent class via qualified names, with per-kind colors matching the 3D legend.
- **Smart Locate**: Clicking a symbol hidden in the current 3D view centers on its nearest visible ancestor instead of flying to empty coordinates — Inspector and tree selection stay on your original node.
- **Instant AST Jump**: Click any file in the explorer tree to immediately locate and orbit-focus its corresponding 3D node.
- **Visual Status Badges**: Clear visual tags distinguishing between indexed nodes and unindexed disk files.

###  5. Deep Code Inspector & IDE Quick Jump
- **Contextual Side Drawer**: Click any node to instantly view its qualified name, type signature, documentation, and line numbers.
- **Built-in Code Preview**: Read live syntax-highlighted source code snippets without leaving the visualizer.
- **1-Click IDE Launch**: Open the selected file directly at the exact line in **VS Code** or **Antigravity IDE**.

### 6. Repository & Exclude Management
- **Multi-Root Auto Discovery**: Automatically scans common workspace directories (`Projects`, `Workspace`, `PythonCode`, `Repos`, etc.).
- **Custom Directory Ingestion**: Add arbitrary local directories via native OS folder dialogs or manual input.
- **Visual Exclusion Rules**: Exclude build artifacts, test datasets, or legacy folders directly from the UI with persistent JSON storage.
- **Project Lifecycle Control**: Initialize (`codegraph init`), uninitialize (`codegraph uninit`), or trigger full re-indexing (`codegraph index`) per project with live status feedback.

### 7. AI Code Chat (Local LLM Agent)
- **Ask the Codebase**: Toolbar **AI Chat** button opens a Copilot-style panel; the local LLM looks up the graph with tools (search / neighbors / code / blast-radius) instead of guessing.
- **Lookup Trace**: Every answer shows its step-by-step trace with clickable, kind-colored node chips; **Show on graph** lights the nodes in 3D.
- **Ancestor Walk-Up**: Hidden nodes resolve to their nearest visible ancestor — layers and LOD are never auto-changed.
- **Explorer Scope**: Search range follows your Explorer checks; no manual project picking, fuzzy-matched and remembered across turns.
- **Model & Provider Management**: Switch local Ollama models from the dropdown, or add OpenAI-compatible endpoints (OpenAI / DeepSeek / Gemini / Groq / xAI / llama.cpp / custom) via the provider settings dialog with presets and auto-fill. Keys stay on your machine (`~/.codegraph-galaxy/llm.json`).
- **Chat Comfort**: Markdown answers with tables and code blocks, copy buttons, per-language system prompts (en-US / zh-TW), `Enter` to send / `Shift+Enter` for newline, draggable + resizable panel with memory.
- **API**: `POST /api/chat`, `POST /api/chat/stream` (SSE), `GET /api/chat/node`, provider CRUD under `/api/chat/providers`. Backend env: `GALAXY_LLM_URL` / `GALAXY_LLM_MODEL`, or `GALAXY_LLM_BASE` / `GALAXY_LLM_KEY` / `GALAXY_LLM_CUSTOM_MODEL` for a remote endpoint.
- **Docs-aware**: the agent also searches and reads repo markdown (TOC / sections) and links source files to their READMEs — code and docs answered together, file hits light up on the graph.

### 8. MCP-Native: Any Agent Can Query Your Code
- The bundled CodeGraph indexer (1.6.0) ships a built-in MCP server — no extra package, it arrives with `npm install`.
- One command wires it into 9 agents (Claude Code, Cursor, Codex CLI, opencode, Hermes Agent, Gemini CLI, Antigravity IDE, Kiro, GitHub Copilot): `codegraph install --yes --init` (agent wiring + index build in one shot).
- One index, three consumers: the 3D galaxy, the AI Chat panel, and any MCP client — symbols, call paths, impact analysis, all served from the same `.codegraph/` database.

---

##  Cross-Platform Support

Code Graph Galaxy is available as a native desktop application and a portable CLI tool across all major platforms:

- **Windows**: Standard NSIS installer (`.exe`) and Portable standalone single-binary (`.exe`).
- **macOS**: Universal DMG installer (`.dmg`) supporting both Apple Silicon (M1/M2/M3/M4) and Intel x64.
- **Linux**: AppImage portable binary (`.AppImage`) and portable archive (`.tar.gz`).

---

##  Quick Start

### Option A: Pre-built Desktop App (Recommended)
Download the latest version for your OS from [GitHub Releases](https://github.com/dardeaw/codegraph-galaxy/releases):
1. **Windows**: Run `Code-Graph-Galaxy-Setup-2.1.0.exe` or download the single-file `Code-Graph-Galaxy-2.1.0.exe` (Portable).
2. **macOS**: Open `Code-Graph-Galaxy-2.1.0.dmg` (`-arm64.dmg` on Apple Silicon) and drag to Applications.
3. **Linux**: Run `chmod +x Code-Graph-Galaxy-2.1.0.AppImage && ./Code-Graph-Galaxy-2.1.0.AppImage`.

---

### Option B: Run via Python CLI
```bash
# Clone repository
git clone https://github.com/dardeaw/codegraph-galaxy.git
cd codegraph-galaxy

# Install Python dependencies
pip install -r requirements.txt
# ...or install as a package (UI assets included since 1.0.4)
pip install .

# Launch visualizer (default port 5001)
python app.py
```
Open your browser at `http://localhost:5001`.

---

### Option C: Run via Node.js / NPX
```bash
# In the cloned directory
npm install
npm start
```
`npm install` pulls the pinned CodeGraph indexer (no separate CLI install) and `npm start` launches the desktop app. AI Chat needs a local model (Ollama) or a configured provider — see section 7.

---

## Shortcut Keys & Controls

| Shortcut / Action | Function |
| :--- | :--- |
| **Left Click + Drag** | Orbit and rotate 3D camera |
| **Right Click + Drag** | Pan and shift graph position |
| **Mouse Wheel / Scroll** | Zoom in / Zoom out |
| **Node Click** | Select node, highlight connections & open Code Inspector |
| **Double-Click Empty Space** | Fit entire graph back into view |
| **WASD / Arrow Keys** | Fly around (`Shift` = boost) |
| **`Q` / `E`** | Descend / ascend vertically |
| **`Enter` / `Shift+Enter`** (in AI Chat) | Send message / newline |
| **`Ctrl + 0`** | Reset camera to default perspective |
| **`Ctrl + Space`** | Toggle auto galaxy rotation |
| **`Ctrl + O`** | Open Repository Management Modal |
| **`Ctrl + S`** | Trigger CodeGraph Sync |
| **`F11`** | Toggle Fullscreen mode |

---

##  Architecture & Extensibility

```
codegraph-galaxy/
├── app.py                     # Lightweight server delegator
├── codegraph_galaxy/          # Modular Python backend
│   ├── constants.py           # Universal constants and ignore filters
│   ├── config.py              # User configuration & search root management
│   ├── scanner.py             # Repository discovery & unindexed delta engine
│   ├── graph.py               # SQLite AST queries, LOD filtering & code extraction
│   ├── service.py             # CodeGraph CLI subprocess manager
│   ├── server.py              # Flask app factory & RESTful API endpoints
│   ├── cli.py                 # Command line runner
│   ├── templates/
│   │   └── index.html         # Clean, semantic UI layout
│   └── static/
│       ├── galaxy.css         # High-performance stylesheet (dark cyberpunk theme)
│       ├── galaxy.js          # 3D visualization, inspector & tree logic
│       └── 3d-force-graph.min.js  # Three.js 3D force graph engine
├── electron/
│   ├── main.js                # Desktop window & Python lifecycle manager
│   └── preload.js             # Secure native OS IPC bridge
└── assets/                    # Application icons & branding assets
```

---

##  Contributing

We welcome community contributions, bug reports, and feature requests!
- Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).
- Submit bugs and proposals via [GitHub Issues](https://github.com/dardeaw/codegraph-galaxy/issues).

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
