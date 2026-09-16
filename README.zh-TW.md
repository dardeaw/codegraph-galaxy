# CodeGraph 3D 拓撲視覺化工具

> 專為 [CodeGraph](https://github.com/) 打造的互動式 3D WebGL 程式碼架構拓撲儀與專案庫存管理工具。

[![PyPI Version](https://img.shields.io/badge/pypi-v0.1.0-blue.svg)](https://pypi.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

[English](README.md) | [繁體中文](README.zh-TW.md)

---

## 專案簡介

在面對包含多模組、微服務與跨檔案呼叫的大型專案時，單靠文字編輯器與 grep 往往難以建立整體的拓撲認知。

**CodeGraph 3D** 旨在提供清晰、直觀的三維立體程式碼關聯視圖。本專案以 `CodeGraph` 生成的 SQLite 符號索引為基礎，結合 Three.js WebGL 3D 物理力導向圖演算法，協助開發者快速掌握架構脈絡、追蹤跨模組調用鏈、即時切片原始碼，並在單一介面內完成多專案的索引維護與生命週期管理。

---

## 核心功能

- **多專案同屏拓撲**：支援同時勾選多個專案，清晰呈現跨專案呼叫邊界與依賴關係。
- **層級精細度 (LOD) 與呼叫鏈聚合 (Edge Lifting)**：
  - `架構視角 (Architecture)`：僅呈現檔案與類別節點，底層函式呼叫自動聚合至上層容器，保持宏觀視圖清爽。
  - `標準核心 (Standard)`：展示核心類別、函式與路由端點。
  - `完整細節 (Detailed)`：完整展示所有符號節點與關係鏈，零截斷。
- **本機 IDE 深度跳轉**：點擊 3D 節點即可喚醒本機編輯器（Antigravity IDE、VS Code、Cursor、PyCharm）並精確定位至對應行號。
- **原始碼切片與關聯分析**：抽屜面板即時呈現行號範圍內的原始碼切片，並列出入度 (Inbound) 與出度 (Outbound) 呼叫清單。
- **專案生命週期管理中心**：
  - 自由掃描硬碟中任何目錄。
  - 支援在線建立索引 (`codegraph init`)、增量同步 (`codegraph sync`)、全量重建 (`codegraph index`) 與安全退庫 (`codegraph uninit -f`)。
- **開箱即用與跨平台**：支援 Windows、macOS 與 Linux，提供乾淨的 CLI 指令。

---

## 安裝方式

### 透過 pip 安裝

```bash
pip install codegraph-viz
```

### 從原始碼安裝

```bash
git clone https://github.com/your-username/codegraph-viz.git
cd codegraph-viz
pip install -e .
```

---

## 快速使用

### 1. 於當前目錄啟動

```bash
# 啟動服務並自動於瀏覽器中開啟
codegraph-viz --open
```

### 2. 指定掃描目錄與通訊埠

```bash
codegraph-viz /path/to/project1 /path/to/project2 -p 5001 --open
```

### 3. 命令列參數說明

```text
用法: codegraph-viz [-h] [-p PORT] [-H HOST] [-o] [paths ...]

選項說明:
  paths                 可選的專案目錄路徑（支援傳入多個路徑）
  -h, --help            顯示幫助訊息並退出
  -p PORT, --port PORT  指定服務運行的 Port（預設：5001）
  -H HOST, --host HOST  指定綁定的主機位址（預設：127.0.0.1）
  -o, --open            服務啟動後自動以預設瀏覽器開啟
```

---

## 系統架構

```
+-------------------------------------------------------------+
|                      前端介面 (Browser)                      |
|  - 3D 力導向圖繪製 (Three.js WebGL Engine)                  |
|  - 多層級精細度 (LOD) 與關係鏈聚合 (Edge Lifting)           |
|  - 原始碼精確切片檢視器與調用鏈追蹤                          |
|  - 中英雙語系切換 (i18n)                                    |
+------------------------------+------------------------------+
                               | REST API
+------------------------------v------------------------------+
|                     後端服務 (Flask CLI)                     |
|  - 動態路徑掃描 (~/.codegraph_viz_config.json)              |
|  - CodeGraph CLI 子程序調度 (init / sync / index / uninit)  |
|  - 唯讀 SQLite 資料庫連接器 (.codegraph/codegraph.db)       |
+-------------------------------------------------------------+
```

---

## 參與貢獻

歡迎提交 Issue 或 Pull Request。

1. Fork 本專案倉庫
2. 建立功能分支 (`git checkout -b feature/your-feature`)
3. 提交變更 (`git commit -m 'Add some feature'`)
4. 推送至分支 (`git push origin feature/your-feature`)
5. 建立 Pull Request

---

## 授權條款

本專案採用 [MIT License](LICENSE) 授權。
