# 🌌 Code Graph Galaxy

[![Release](https://img.shields.io/github/v/release/codegraph/codegraph-galaxy?color=blue&logo=github)](https://github.com/codegraph/codegraph-galaxy/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen)](https://github.com/codegraph/codegraph-galaxy)
[![Electron](https://img.shields.io/badge/Electron-31.x-47848F?logo=electron)](https://www.electronjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-black?logo=three.js)](https://threejs.org/)

[English](README.md) | [繁體中文](README_zh-TW.md)

**Code Graph Galaxy** is a next-generation, high-performance 3D code intelligence and galaxy visualizer. It renders entire codebases as an interactive celestial network with real-time dependency orbits, LOD level-of-detail switches, and deep bi-directional synchronization with CodeGraph SQLite repositories.

---

## ✨ Features

- 🪐 **Interactive Galaxy 3D Rendering**: Ultra-smooth Three.js WebGL force-directed layout with dynamic camera orbits, LOD switching, and celestial bloom.
- ⚡ **Seamless CodeGraph Sync**: One-click index state reflection without resetting your 3D exploration vantage point.
- 🖥️ **Cross-Platform Desktop Suite**: Native support for **Windows** (`.exe` NSIS & Portable), **macOS** (`.dmg` & `.zip` for Intel & Apple Silicon), and **Linux** (`.AppImage`, `.deb`, `.tar.gz`).
- 📁 **Repository & File Tree Explorer**: Real-time project navigation, indexing status badges, and excluded file management.
- 🌐 **Zero External Dependencies Backend**: Fast Python-powered embedded HTTP API engine.

---

## 🚀 Quick Start

### 1. Pre-built Binaries
Download the latest installer or portable executable for your OS from [GitHub Releases](https://github.com/codegraph/codegraph-galaxy/releases):
- **Windows**: `Code Graph Galaxy Setup 1.0.0.exe` / `Code Graph Galaxy 1.0.0.exe` (Portable)
- **macOS**: `Code Graph Galaxy-1.0.0.dmg` (Universal / Apple Silicon / Intel)
- **Linux**: `Code Graph Galaxy-1.0.0.AppImage` / `.deb`

### 2. Run via NPX / NPM
```bash
npx codegraph-galaxy
```

### 3. Run via Python PIP
```bash
pip install codegraph-galaxy
codegraph-galaxy
```

---

## 🛠️ Development & Building

```bash
# Clone the repository
git clone https://github.com/codegraph/codegraph-galaxy.git
cd codegraph-galaxy

# Install dependencies
npm install

# Run in development mode
npm start

# Build standalone executables for your current platform
npm run dist:win    # Windows (NSIS installer + Portable)
npm run dist:mac    # macOS (.dmg + .zip)
npm run dist:linux  # Linux (.AppImage + .deb)
```

---

## 📜 License

MIT License. Crafted with excellence for open-source code intelligence.
