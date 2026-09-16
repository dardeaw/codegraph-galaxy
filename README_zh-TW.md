# 🌌 Code Graph Galaxy (代碼星系 3D 視覺化分析儀)

> **專為多專案與複雜架構打造的高效能 3D 代碼星系視覺化與架構探索套件。**  
> 將龐雜的軟體相依拓撲、檔案階層與語法符號，化為直覺、流暢且具立體空間感的沉浸式三維星系。

---

[English](README.md) | [繁體中文](README_zh-TW.md)

---
<img width="1408" height="866" alt="image" src="https://github.com/user-attachments/assets/48f97268-3f3b-4b94-81bc-6d6f8097eeac" />
##  為什麼需要 Code Graph Galaxy？

隨著軟體專案規模日益龐大，跨模組呼叫鏈、跨專案依賴關係以及未被建庫的異動檔案，若僅依靠純文字搜尋或靜態平面架構圖，往往難以綜觀全局。

**Code Graph Galaxy** 結合了 **Three.js WebGL** 硬體加速渲染與輕量級 Python AST 分析引擎，將程式碼庫中的專案、模組、檔案、類別、函式與呼叫關係映射為三維立體星系。

無論是用於**新人快速掌握龐大專案架構**、**架構重構與模組邊界評估**、**代碼審查 (Code Review)** 或是**追蹤即時異動差異**，Code Graph Galaxy 都能提供兼具宏觀全局視野與微觀行級代碼追蹤的最佳體驗。

---

##  核心特色與實用功能

###  1. 沉浸式三維星系力導向引擎 (3D Galaxy Engine)
- **硬體加速流暢渲染**：支援數萬節點之即時力導向佈局運算，具備動態物理碰撞、星際輝光 (Bloom) 特效與環境光暈。
- **直覺視角操控**：全視角軌道旋轉、雙指/滾輪縮放、平移，並支援 **一鍵相機重置** (`Ctrl+0`)。
- **自動星系巡航**：支援一鍵開啟自動平滑旋轉 (`Ctrl+Space` / Auto Rotate 按鈕)，專為架構展示、團隊會議與專案 Demo 設計。

###  2. 多層級細節 (LOD) 動態架構過濾
根據當前關注層次隨時切換視野，避免過量細節干擾：
- ** 架構模式 (Architecture - 預設推薦)**：聚焦核心骨幹（檔案、類別、介面、命名空間），一眼看清系統模組邊界與跨層調用。
- ** 標準模式 (Standard)**：展開核心實作（函式、方法、API 端點路由）。
- ** 精細模式 (Detailed)**：全量呈現底層變數、型態宣告與內部 AST 關聯。
- ** 自訂模式 (Customized)**：提供細緻的節點類型勾選清單，依需求自由篩選展示。

###  3. 視角鎖定之無縫建庫同步 (Zero Camera Drift)
- ** Sync from CodeGraph**：當專案程式碼有所修改時，一鍵即時觸發同步更新。
- **完全鎖定探索視角**：杜絕傳統視覺化工具在重新整理時視角被重置漂移的痛點；Code Graph Galaxy 會嚴格鎖定當前相機坐標、軌道焦點與節點物理狀態，維持流暢不中斷的探索思路。

###  4. 專案樹狀結構與即時檔案總管 (Explorer)
- **階層化樹狀目錄**：支援資料夾摺疊/展開、目錄層級未建庫檔案數統計（Unindexed Count）。
- **點擊即刻聚焦節點**：在左側樹狀清單點擊任一檔案，3D 鏡頭會自動鎖定並旋轉聚焦至該檔案之立體節點。
- **狀態標籤識別**：清晰區分已建庫（Indexed）與未建庫磁碟檔案（Unindexed）。

###  5. 代碼檢視器與 IDE 快速跳轉 (Inspector)
- **語境抽屜面板**：點擊節點即可在側邊欄完整檢視限定名（Qualified Name）、型態特徵、行號範圍與相依關聯。
- **內建即時代碼預覽**：免切換視窗，直接在右側預覽高亮顯示的原始碼片段。
- **一鍵跳轉本地 IDE**：支援一鍵直接以 **VS Code** 或 **Antigravity IDE** 開啟目標檔案並定位至指定行。

### 🛠️6. 專案庫存與排除規則維護 (Repositories Management)
- **全自動路徑探測**：自動掃描常用開發目錄（`Projects`、`Workspace`、`PythonCode`、`Repos` 等）。
- **自訂專案目錄**：支援原生作業系統選擇資料夾對話框，隨選即掃描。
- **視覺化排除規則**：可直接在介面中勾選排除編譯產物、測試目錄或特定專案，設定自動持久化保存。
- **生命週期管理**：支援個別專案的一鍵建庫 (`codegraph init`)、解除建庫 (`codegraph uninit`) 與全量重建 (`codegraph index`)。

---

##  跨平台支援

Code Graph Galaxy 提供原生跨平台桌面應用與命令列運行方案：

- **Windows**：標準 NSIS 一鍵安裝檔 (`.exe`) 與免安裝單檔便攜版 (`.exe`)。
- **macOS**：支援 Apple Silicon (M1/M2/M3/M4) 與 Intel 晶片之通用 DMG 安裝檔 (`.dmg`)。
- **Linux**：AppImage 綠色版 (`.AppImage`) 與 Debian 安裝包 (`.deb`)。

---

##  快速啟動指南

### 方式一：下載預編譯桌面程式（推薦）
請前往 [GitHub Releases](https://github.com/dardeaw/codegraph-galaxy/releases) 下載對應作業系統之安裝檔：
1. **Windows**：執行 `Code Graph Galaxy Setup 1.0.0.exe` 安裝，或直接雙擊執行 `Code Graph Galaxy 1.0.0.exe`（便攜版）。
2. **macOS**：打開 `Code Graph Galaxy-1.0.0.dmg` 並拖曳至應用程式目錄。
3. **Linux**：賦予權限後直接執行：`chmod +x Code_Graph_Galaxy-1.0.0.AppImage && ./Code_Graph_Galaxy-1.0.0.AppImage`。

---

### 方式二：透過 Python 命令列直接啟動
```bash
# 取得源碼
git clone https://github.com/dardeaw/codegraph-galaxy.git
cd codegraph-galaxy

# 安裝依賴
pip install -r requirements.txt

# 啟動服務 (預設開啟 http://localhost:5001)
python app.py
```

---

### 方式三：透過 Node.js 啟動
```bash
# 在專案目錄下執行
npm install
npm start
```

---

## ⌨️ 常用快捷鍵與操作

| 快捷鍵 / 操作 | 功能說明 |
| :--- | :--- |
| **滑鼠左鍵 + 拖曳** | 旋轉 3D 星系視角（Orbit） |
| **滑鼠右鍵 + 拖曳** | 平移視角中心（Pan） |
| **滾輪滾動 / 雙指滑動** | 放大 / 縮小星系視野（Zoom） |
| **點擊節點** | 選取節點、高亮所有關聯呼叫鏈並開啟代碼抽屜 |
| **`Ctrl + 0`** | 重置相機至預設最佳視角 |
| **`Ctrl + Space`** | 開啟 / 關閉星系自動旋轉巡航 |
| **`Ctrl + O`** | 開啟專案庫存管理視窗 |
| **`Ctrl + S`** | 觸發 CodeGraph 同步更新 |
| **`F11`** | 全螢幕切換 |

---

##  模組化目錄架構

```
codegraph-galaxy/
├── app.py                     # 高階服務啟動委派入口
├── codegraph_galaxy/          # Python 模組化後端
│   ├── constants.py           # 常數規範與忽略路徑過濾器
│   ├── config.py              # 使用者設定檔與搜尋根目錄維護
│   ├── scanner.py             # 專案探測與未建庫差異比對引擎
│   ├── graph.py               # SQLite AST 拓撲查詢、LOD 過濾與代碼提取
│   ├── service.py             # CodeGraph CLI 子進程封裝
│   ├── server.py              # Flask 應用工廠與 RESTful API 端點
│   └── cli.py                 # 命令列參數啟動器
├── templates/
│   └── index.html             # 乾淨語義化之主介面結構
├── static/
│   ├── galaxy.css             # 高效能深色科技主題樣式表
│   ├── galaxy.js              # 3D 星系視覺化、檔案樹與互動邏輯
│   └── 3d-force-graph.min.js  # Three.js 3D 力導向星系引擎
├── electron/
│   ├── main.js                # 原生桌面視窗與 Python 生命週期守護
│   └── preload.js             # 安全原生 OS IPC 溝通通道
└── assets/                    # 應用程式高解析度圖示與資產
```

---

##  參與貢獻

歡迎提交 Issue 與 Pull Request！
- 詳細參與指引請參閱 [CONTRIBUTING.md](CONTRIBUTING.md) 與 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
- 發現問題或有新功能建議，歡迎隨時至 [GitHub Issues](https://github.com/dardeaw/codegraph-galaxy/issues) 提出。

---

##  開源授權

本專案採用 **MIT 授權協議** 開源 — 詳情請參閱 [LICENSE](LICENSE) 檔案。
