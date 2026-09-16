# 🌌 Code Graph Galaxy (代碼星系 3D 視覺化分析儀)

[![Release](https://img.shields.io/github/v/release/codegraph/codegraph-galaxy?color=blue&logo=github)](https://github.com/codegraph/codegraph-galaxy/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen)](https://github.com/codegraph/codegraph-galaxy)

[English](README.md) | [繁體中文](README_zh-TW.md)

**Code Graph Galaxy** 是一款專為 CodeGraph 打造的高效能 3D 代碼星系視覺化與架構探索工具。將龐大複雜的程式碼庫轉化為沉浸式三維星系，提供多層級細節 (LOD) 切換、動態呼叫軌道與精準建庫狀態追蹤。

---

## ✨ 核心特性

- 🪐 **沉浸式三維星系視覺化**：採用 Three.js WebGL 與星空光暈特效，支援架構、標準、精細與自定義多級 LOD 模式。
- ⚡ **無縫 CodeGraph 狀態同步**：一鍵由 CodeGraph 同步索引狀態，嚴格鎖定相機軌道與物理坐標，杜絕視角漂移。
- 🖥️ **全平台原生支援**：支援 **Windows** (`.exe` NSIS 安裝包與免安裝便攜版)、**macOS** (`.dmg` 雙架構晶片版) 與 **Linux** (`.AppImage`, `.deb`)。
- 📁 **專案樹狀結構與索引管理**：即時識別建庫狀態標籤 (Index / Unindexed) 與排除規則維護。
- 🌐 **零外部依賴後端**：內建極速 Python 輕量服務引擎。

---

## 🚀 快速啟動

### 1. 下載預編譯安裝檔
前往 [GitHub Releases](https://github.com/codegraph/codegraph-galaxy/releases) 下載對應作業系統版本：
- **Windows**: `Code Graph Galaxy Setup 1.0.0.exe` / 便攜版 `Code Graph Galaxy 1.0.0.exe`
- **macOS**: `Code Graph Galaxy-1.0.0.dmg`
- **Linux**: `Code Graph Galaxy-1.0.0.AppImage` / `.deb`

### 2. 透過 NPX 快速啟動
```bash
npx codegraph-galaxy
```

---

## 📜 授權協議

本專案採用 MIT 授權協議開源。
