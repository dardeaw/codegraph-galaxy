
// ==========================================
// Universal 5-Color Code Syntax & Symbol Reference Highlighter
// ==========================================
function getSymbolMap() {
  const map = new Map();
  if (!rawData || !rawData.nodes) return map;

  rawData.nodes.forEach(node => {
    if (!node.name || typeof node.name !== 'string' || node.name.length < 2) return;
    const key = node.name.trim();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(node);
  });
  return map;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderHighlightedCode(codeText, currentProject, containerEl) {
  if (!containerEl) return;
  if (!codeText) {
    containerEl.innerHTML = '<span style="color: #6e7681;">// (Empty source snippet)</span>';
    return;
  }

  const symbolMap = getSymbolMap();
  const allSymbols = Array.from(symbolMap.keys())
    .filter(name => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name))
    .sort((a, b) => b.length - a.length);

  // Split into lines for syntax and reference tokenization
  const rawLines = codeText.split(String.fromCharCode(10));
  let htmlResult = '';

  const symbolSet = new Set(allSymbols);
  const symbolRegex = allSymbols.length > 0 
    ? new RegExp('\\b(' + allSymbols.slice(0, 1000).map(s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'g')
    : null;

  // Keyword regex (Mode Color: Import/Route Purple #bc8cff)
  const kwRegex = /\b(import|export|from|as|class|interface|type|extends|implements|function|def|return|if|else|for|while|try|catch|finally|throw|new|async|await|const|let|var|public|private|protected|static|readonly|declare)\b/g;

  rawLines.forEach((line) => {
    let esc = escapeHtml(line);

    // 1. Highlight comments (gray)
    if (esc.trim().startsWith('//') || esc.trim().startsWith('#') || esc.trim().startsWith('*') || esc.trim().startsWith('/*')) {
      htmlResult += `<span class="code-syntax-comment">${esc}</span>\n`;
      return;
    }

    // 2. Highlight known AST symbol references (with 5 Mode colors and click linkage)
    if (symbolRegex) {
      esc = esc.replace(symbolRegex, (matched) => {
        const nodes = symbolMap.get(matched);
        if (!nodes || nodes.length === 0) return matched;
        const node = (currentProject ? nodes.find(n => n.project === currentProject) : null) || nodes[0];
        const color = KIND_COLORS[node.kind] || '#58a6ff';
        const kindTag = (node.kind || 'symbol').toUpperCase();
        const projTag = node.project || '';

        return `<span class="code-ref-token" data-symbol-name="${escapeHtml(node.name)}" data-node-id="${escapeHtml(node.id || '')}" data-project="${escapeHtml(projTag)}" style="color:${color}; border-color:${color}88;" title="🔗 [${kindTag}] ${escapeHtml(node.name)} (${escapeHtml(projTag)})&#10;👉 Click to jump in 3D Galaxy & Explorer">${matched}</span>`;
      });
    }

    // 3. Highlight standard language keywords in Purple
    esc = esc.replace(kwRegex, '<span class="code-syntax-kw">$1</span>');

    // 4. Highlight class/interface names in Green
    esc = esc.replace(/\b(class|interface|type)\s+([a-zA-Z0-9_$]+)/g, '$1 <span class="code-syntax-class">$2</span>');

    // 5. Highlight function/method declarations in Blue
    esc = esc.replace(/\b(function|def)\s+([a-zA-Z0-9_$]+)/g, '$1 <span class="code-syntax-fn">$2</span>');

    htmlResult += esc + '\n';
  });

  containerEl.innerHTML = htmlResult;
}

// Global click event for references
function handleCodeReferenceClick(e) {
  const token = e.target.closest('.code-ref-token');
  if (!token) return;

  const symName = token.getAttribute('data-symbol-name');
  const nodeId = token.getAttribute('data-node-id');
  const proj = token.getAttribute('data-project');

  if (!rawData || !rawData.nodes) return;

  let targetNode = null;
  if (nodeId) {
    targetNode = rawData.nodes.find(n => n.id === nodeId);
  }
  if (!targetNode && symName) {
    targetNode = rawData.nodes.find(n => n.name === symName && n.project === proj) ||
                 rawData.nodes.find(n => n.name === symName);
  }

  if (targetNode) {
    console.log('[CodeGraph Galaxy] Jumping to reference node:', targetNode.name, targetNode.kind, targetNode.project);
    
    // 1. Unhide in LOD if hidden
    if (hiddenKinds && hiddenKinds.has(targetNode.kind)) {
      hiddenKinds.delete(targetNode.kind);
      updateGraphData();
    }

    // 2. 3D Graph Highlight & Camera Focus
    if (typeof highlightScope === 'function') {
      highlightScope('node', targetNode);
    }
    if (typeof focusOnNode === 'function') {
      focusOnNode(targetNode);
    }

    // 3. Sync Explorer Tree
    if (typeof syncExplorerSelection === 'function') {
      syncExplorerSelection(targetNode);
    }

    // 4. Update Inspector Drawer
    if (typeof openDrawer === 'function') {
      openDrawer(targetNode);
    }
  }
}

// ==========================================
function getSymbolMap() {
  const map = new Map();
  if (!rawData || !rawData.nodes) return map;

  rawData.nodes.forEach(node => {
    if (!node.name || typeof node.name !== 'string' || node.name.length < 2) return;
    const key = node.name.trim();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(node);
  });
  return map;
}

const RESERVED_KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'return', 'def', 'class', 'import', 'from', 'as',
  'let', 'const', 'var', 'function', 'export', 'default', 'interface', 'type',
  'try', 'catch', 'finally', 'throw', 'new', 'this', 'self', 'true', 'false',
  'null', 'undefined', 'None', 'True', 'False', 'in', 'is', 'not', 'and', 'or',
  'string', 'number', 'boolean', 'any', 'void', 'object', 'int', 'str', 'dict', 'list',
  'public', 'private', 'protected', 'async', 'await', 'static', 'readonly', 'declare'
]);

function renderHighlightedCode(codeText, currentProject, containerEl) {
  if (!containerEl) return;
  if (!codeText) {
    containerEl.innerHTML = '<span style="color: #6e7681;">// (Empty source snippet)</span>';
    return;
  }

  const symbolMap = getSymbolMap();
  const allSymbols = Array.from(symbolMap.keys())
    .filter(name => !RESERVED_KEYWORDS.has(name) && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name))
    .sort((a, b) => b.length - a.length);

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (allSymbols.length === 0) {
    containerEl.innerHTML = escapeHtml(codeText);
    return;
  }

  // Regex pattern matching word boundaries
  const escapedPattern = allSymbols.slice(0, 800).map(s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const tokenRegex = new RegExp(`\\b(${escapedPattern})\\b`, 'g');

  const escapedText = escapeHtml(codeText);
  const highlighted = escapedText.replace(tokenRegex, (matched) => {
    const nodes = symbolMap.get(matched);
    if (!nodes || nodes.length === 0) return matched;

    // Pick best matching node (prefer same project)
    const node = (currentProject ? nodes.find(n => n.project === currentProject) : null) || nodes[0];
    const color = KIND_COLORS[node.kind] || '#58a6ff';
    const kindTag = (node.kind || 'symbol').toUpperCase();
    const projTag = node.project || '';

    return `<span class="code-ref-token" data-symbol-name="${escapeHtml(node.name)}" data-node-id="${escapeHtml(node.id || '')}" data-project="${escapeHtml(projTag)}" style="color: ${color}; border-bottom: 1px dotted ${color}aa;" title="🔗 [${kindTag}] ${escapeHtml(node.name)} (${escapeHtml(projTag)})&#10;👉 Click to jump in 3D Galaxy & Explorer">${matched}</span>`;
  });

  containerEl.innerHTML = highlighted;
}

// Global click handler for reference jump
function handleCodeReferenceClick(e) {
  const token = e.target.closest('.code-ref-token');
  if (!token) return;

  const symName = token.getAttribute('data-symbol-name');
  const nodeId = token.getAttribute('data-node-id');
  const proj = token.getAttribute('data-project');

  if (!rawData || !rawData.nodes) return;

  let targetNode = null;
  if (nodeId) {
    targetNode = rawData.nodes.find(n => n.id === nodeId);
  }
  if (!targetNode && symName) {
    targetNode = rawData.nodes.find(n => n.name === symName && n.project === proj) ||
                 rawData.nodes.find(n => n.name === symName);
  }

  if (targetNode) {
    // 1. If target node's kind is hidden in current LOD, unhide it
    if (hiddenKinds && hiddenKinds.has(targetNode.kind)) {
      hiddenKinds.delete(targetNode.kind);
      updateGraphData();
    }

    // 2. Highlight in 3D Graph & focus camera
    if (typeof highlightScope === 'function') {
      highlightScope('node', targetNode);
    }
    if (typeof focusOnNode === 'function') {
      focusOnNode(targetNode);
    }

    // 3. Link with Explorer tree
    if (typeof syncExplorerSelection === 'function') {
      syncExplorerSelection(targetNode);
    }

    // 4. Update Inspector
    if (typeof openDrawer === 'function') {
      openDrawer(targetNode);
    }
  }
}

// ==========================================
// i18n Translation Dictionary
// ==========================================
let currentLang = localStorage.getItem('codegraph_lang') || 'en-US';

const I18N = {
  'en-US': {
    lang_btn: 'Language: EN',
    app_title: 'CodeGraph 3D',
    btn_tree: '📁 Explorer',
    lbl_tree: '📁 Explorer',
    btn_repo_mgr: '⚙ Repositories',
    btn_clear_hl: 'Clear',
    all_projects: 'All Projects',
    sel_all: 'Select All',
    sel_none: 'Clear',
    active_summary: '{n} Active',
    lbl_mode_title: 'Mode',
    lod_custom: 'Customized',
    lod_custom_tip: 'Customized filter selection (Saved to local storage)',
    lod_arch: 'Architecture',
    lod_standard: 'Standard',
    lod_all: 'Detailed',
    lod_arch_tip: 'Files and classes only; lifts child dependencies',
    lod_standard_tip: 'Includes major functions and routes (Recommended)',
    lod_all_tip: 'Complete nodes and relationship graph',
    search_ph: 'Search symbols, functions, classes...',
    rotate_btn: 'Auto Rotate',
    rotate_tip: 'Toggle 3D orbit rotation',
    center_btn: 'Reset View',
    center_tip: 'Reset 3D camera position',
    sync_btn: '⚡ Sync from CodeGraph',
    sync_tip: 'Perform incremental sync from CodeGraph database',
    cg_conn_checking: 'Checking CodeGraph connection…',
    cg_conn_ok: 'CodeGraph {version} connected ({source})',
    cg_conn_mismatch: 'CodeGraph {version} connected — expected {pinned}, reindex recommended',
    cg_conn_down: 'CodeGraph CLI not found — run npm install',
    cg_src_bundled: 'bundled',
    cg_src_system: 'system',
    cg_sync_unavailable: 'CodeGraph CLI unavailable — sync disabled',
    chat_ask: 'AI Chat',
    chat_title: '✦ AI Assistant',
    chat_tip: 'Ask AI about this codebase',
    chat_model: 'Model',
    chat_model_loading: 'Loading models…',
    chat_model_unavailable: 'No models available',
    chat_project: 'Scope',
    chat_scope_all: 'All projects (follows Explorer)',
    chat_prov_test: 'Test',
    trace_search: 'Search symbols',
    trace_neighbors: 'Expand calls',
    trace_code: 'Read code',
    trace_blast: 'Impact',
    help_title: 'How to use',
    help_mouse_t: '🖱 Mouse',
    help_mouse_rows: 'Drag: rotate the galaxy\nScroll: zoom in / out\nClick node: focus + inspector\nRight-click file/class: drill down\nDouble-click empty space: fit everything back',
    help_keyboard_t: '⌨ Keyboard',
    help_keyboard_rows: 'WASD / arrows: fly around (Shift = boost)\nQ / E: descend / ascend\nEnter: send chat · Shift+Enter: newline',
    help_chat_t: '✦ AI Chat',
    help_chat_rows: 'Scope follows your Explorer checks\nEvery answer shows its lookup trace\n"Show on graph" lights the nodes\nModel switcher up top, ⚙ adds endpoints',
    chat_copy: 'Copy',
    chat_copied: 'Copied.',
    chat_locating: 'Locating node…',
    chat_lod_escalated: 'Switched to Standard mode to show function nodes.',
    chat_show_parent: 'Hidden in this view — showing parent {name} ({kind}).',
    chat_welcome: '👋 Ask me about this codebase, e.g.:\n• Where is the entry point, and what runs at startup?\n• Which functions does login go through?\n• If I change payment, who breaks?\n• What does the auth module do?\n\nI look the code up for real — watch the lookup trace, then hit "Show on graph".',
    prov_title: 'Model Providers',
    prov_add: 'Add provider',
    prov_f_label: 'Label',
    prov_f_base: 'Base URL (OpenAI-compatible …/v1, or Ollama host)',
    prov_f_key: 'API key (optional, stored on this machine only)',
    prov_f_models: 'Models — pick one to use',
    prov_models_empty: 'Hit Auto-fill to fetch available models',
    prov_fetch: 'Auto-fill',
    prov_cancel: 'Cancel',
    prov_save: 'Save',
    chat_placeholder: 'Ask anything about the code…',
    chat_thinking: 'Thinking…',
    chat_trace_title: '🔍 Lookup trace ({n} steps)',
    chat_show_graph: 'Show {n} on graph',
    chat_conn_fail: 'Connection failed. Is the backend running?',
    chat_no_nodes: 'Those nodes are not in the current graph view.',
    chat_highlight_partial: 'Showing {shown}/{total} — the rest are outside the current view (load more projects or switch LOD).',
    chat_highlighted: 'Highlighted {n} node(s).',
    chat_tpl_entry: 'Find entry',
    chat_tpl_entry_p: 'Where is the entry point of this project? List the key startup files and functions.',
    chat_tpl_flow: 'Trace a flow',
    chat_tpl_flow_p: 'Pick the most central request-handling flow and trace it caller to callee.',
    chat_tpl_explain: 'Explain module',
    chat_tpl_explain_p: 'What are the main modules in this project and what does each do?',
    chat_tpl_impact: 'Impact check',
    chat_tpl_impact_p: 'Which function has the most callers (highest impact if changed)?',
    
    nodes_unit: 'nodes',
    edges_unit: 'links',
    bc_overview: 'Overview',
    tab_nodes: 'Node Types',
    tab_edges: 'Relationships',
    legend_all: 'Reset',
    kind_file: 'File',
    kind_class: 'Class / Interface',
    kind_function: 'Function / Method',
    kind_import: 'Import',
    kind_variable: 'Variable / Constant',
    edge_calls: 'Calls',
    edge_contains: 'Contains',
    edge_extends: 'Extends / Implements',
    edge_instantiates: 'Instantiates',
    edge_imports: 'Imports',
    edge_references: 'References',
    drawer_panel_title: '🔍 Inspector',
    drawer_antigravity: 'Open in Antigravity',
    drawer_antigravity_tip: 'Open file directly in Antigravity IDE at target line',
    drawer_copy_path: 'Copy Path',
    drawer_copy_prompt: 'Copy Context Prompt',
    drawer_source: 'Source Code',
    drawer_loading_code: 'Loading snippet...',
    drawer_inbound: 'Inbound Callers',
    drawer_outbound: 'Outbound Dependencies',
    modal_title: 'Repository Management',
    modal_sub: 'Scan local project directories, build index (init), incremental sync (sync), full rebuild (index), or uninitialize (uninit).',
    modal_add_dir: 'Scan Project Directory:',
    modal_input_ph: 'Enter absolute directory path (e.g. D:\Projects)',
    modal_btn_add: 'Add Path',
    modal_btn_browse: '📁 Browse...',
    modal_repo_list: 'Discovered Repositories:',
    th_proj: 'Project',
    th_path: 'Directory Path',
    th_metrics: 'Metrics',
    th_status: 'Status',
    th_ops: 'Actions',
    status_ready: 'Indexed',
    status_unindexed: 'Unindexed',
    act_init: 'Create Index',
    act_uninit: 'Uninit',
    act_sync: 'Incremental Index',
    act_reindex: 'Full Rebuild',
    act_exclude: 'Exclude',
    confirm_exclude: 'Exclude [{name}] from discovery list?',
    toast_exclude_done: 'Project excluded from list.',
    btn_close: 'Close',
    confirm_uninit: 'Are you sure you want to uninitialize [{name}]?\nThis will remove its .codegraph index database.',
    toast_path_copied: 'Path copied to clipboard.',
    toast_prompt_copied: 'Context prompt copied to clipboard.',
    toast_sync_done: '3D graph synchronized from CodeGraph.',
    toast_index_done: 'Project indexing completed successfully.',
    toast_init_done: 'CodeGraph index built successfully.',
    toast_uninit_done: 'Project uninitialized.',
    toast_reindex_done: 'Index rebuilt successfully.',
    toast_input_path: 'Please enter a valid directory path.',
    tree_filter_ph: 'Filter explorer...',
    pending_sync_tip: 'Physical files on disk not indexed yet (Click to review & index)',
    dir_unindexed_tip: '{n} unindexed files inside (Click to review & index)',
    sync_modal_title: 'Incremental Indexing & File Review',
    sync_modal_sub: 'Inspect unindexed physical files on disk. Inspect source code, batch index into CodeGraph, or exclude.',
    sync_search_ph: '🔍 Filter file path or extension...',
    sync_sel_all: '✔ Select All',
    sync_sel_none: '✖ Clear',
    sync_sel_count: 'Selected {n} / {total}',
    sync_btn_sync: 'Index to CodeGraph',
    sync_btn_exclude: 'Exclude Selected',
    sync_code_preview_tip: 'Select a file on the left to preview code',
    sync_code_empty_tip: 'Click any file in the list to view its source code',
    sync_no_unindexed: '🎉 All files in this project/directory are fully indexed!',
    sync_no_match: 'No matching files found',
    sync_status_unindexed: 'Unindexed',
    sync_loading: 'Loading source code...',
    sync_in_progress: 'CodeGraph indexing in progress...',
    sync_success_toast: '✅ {proj} indexing complete!',
    sync_exclude_confirm: 'Exclude {n} selected files from indexing?',
    sync_exclude_toast: '🚫 Excluded {n} files successfully!',
    sync_lines: '{n} lines'
  },
  'zh-TW': {
    lang_btn: '語系: 繁中',
    app_title: 'CodeGraph 3D 拓撲儀',
    btn_tree: '📁 Explorer',
    lbl_tree: '📁 Explorer',
    btn_repo_mgr: '⚙ 專案庫管理',
    btn_clear_hl: '清除高亮',
    all_projects: '全部專案',
    sel_all: '全選',
    sel_none: '清空',
    active_summary: '已啟用 {n} 個',
    lod_arch: '架構視角',
    lod_standard: '標準核心',
    lod_all: '完整細節',
    lod_arch_tip: '僅載入檔案與類別，自動聚合子呼叫鏈',
    lod_standard_tip: '包含主要函式與路由（推薦預設）',
    lod_all_tip: '完整節點與所有關係鏈',
    search_ph: '搜尋符號、函式、類別...',
    rotate_btn: '自動旋轉',
    rotate_tip: '開啟/關閉 3D 自動軌道旋轉',
    center_btn: '重設視角',
    center_tip: '重設 3D 視角中心',
    sync_btn: '⚡ 從 CodeGraph 同步',
    sync_tip: '從 CodeGraph 執行增量資料同步',
    cg_conn_checking: '檢查 CodeGraph 連接中…',
    cg_conn_ok: 'CodeGraph {version} 已連接（{source}）',
    cg_conn_mismatch: 'CodeGraph {version} 已連接 — 建議版本 {pinned}，建議重建索引',
    cg_conn_down: '找不到 CodeGraph CLI — 請執行 npm install',
    cg_src_bundled: '內建',
    cg_src_system: '系統',
    cg_sync_unavailable: 'CodeGraph CLI 無法使用 — 同步已停用',
    chat_ask: 'AI 對話',
    chat_title: '✦ AI 助理',
    chat_tip: '問 AI 關於這個 codebase',
    chat_model: '模型',
    chat_model_loading: '載入模型中…',
    chat_model_unavailable: '無可用模型',
    chat_project: '範圍',
    chat_scope_all: '全部專案（跟 Explorer 連動）',
    chat_prov_test: '測試',
    trace_search: '搜尋符號',
    trace_neighbors: '展開呼叫',
    trace_code: '讀取程式碼',
    trace_blast: '影響分析',
    help_title: '使用說明',
    help_mouse_t: '🖱 滑鼠',
    help_mouse_rows: '拖曳：旋轉星系\n滾輪：放大 / 縮小\n點節點：聚焦＋開 Inspector\n右鍵點 file/class：往下鑽\n空地點兩下：全部收回置中',
    help_keyboard_t: '⌨ 鍵盤',
    help_keyboard_rows: 'WASD / 方向鍵：飛行（Shift 加速）\nQ / E：下降／上升\nEnter：送出對話 · Shift+Enter：換行',
    help_chat_t: '✦ AI 對話',
    help_chat_rows: '範圍跟著 Explorer 勾選走\n每個回答附查碼過程\n「在圖上顯示」打光節點\n上面可換模型，⚙ 可加 endpoint',
    chat_copy: '複製',
    chat_copied: '已複製。',
    chat_locating: '定位節點中…',
    chat_lod_escalated: '已自動切到 Standard 模式以顯示 function 節點。',
    chat_show_parent: '目前視圖中隱藏，已定位到母節點 {name}（{kind}）。',
    chat_welcome: '👋 直接問這個 codebase，例如：\n• 進入點在哪？啟動時跑了什麼？\n• 登入會經過哪些函式？\n• 改了金流會炸到誰？\n• auth 模組在幹嘛？\n\n我會真的去查 code——看查碼過程，再按「在圖上顯示」。',
    prov_title: '模型服務商',
    prov_add: '新增服務商',
    prov_f_label: '名稱',
    prov_f_base: 'Base URL（OpenAI 相容 …/v1，或 Ollama 主機）',
    prov_f_key: 'API key（選填，只存這台機器）',
    prov_f_models: '模型——勾一個來用',
    prov_models_empty: '按自動帶入抓取可用模型',
    prov_fetch: '自動帶入',
    prov_cancel: '取消',
    prov_save: '儲存',
    chat_placeholder: '問 codebase 任何問題…',
    chat_thinking: '思考中…',
    chat_trace_title: '🔍 查碼過程（{n} 步）',
    chat_show_graph: '在圖上顯示 {n} 個',
    chat_conn_fail: '連線失敗，後端有在跑嗎？',
    chat_no_nodes: '這些節點不在目前的圖上。',
    chat_highlight_partial: '顯示 {shown}/{total}——其餘在目前視圖外（載入更多專案或切 LOD）。',
    chat_highlighted: '已標亮 {n} 個節點。',
    chat_tpl_entry: '找入口',
    chat_tpl_entry_p: '這個專案的進入點在哪？列出關鍵啟動檔案與函式。',
    chat_tpl_flow: '追流程',
    chat_tpl_flow_p: '挑最核心的請求處理流程，從呼叫者一路追到被呼叫者。',
    chat_tpl_explain: '解釋模組',
    chat_tpl_explain_p: '這個專案有哪些主要模組，各負責什麼？',
    chat_tpl_impact: '影響檢查',
    chat_tpl_impact_p: '哪個函式被最多人呼叫（改了影響最大）？',
    
    nodes_unit: '節點',
    edges_unit: '關係鏈',
    bc_overview: '全域總覽',
    tab_nodes: '節點類型',
    tab_edges: '關係類型',
    legend_all: '重設',
    kind_file: '檔案 (File)',
    kind_class: '類別 (Class / Interface)',
    kind_function: '函式/方法 (Function / Method)',
    kind_import: '引用 (Import)',
    kind_variable: '變數/常數 (Variable/Const)',
    edge_calls: '函式呼叫 (Calls)',
    edge_contains: '包含層級 (Contains)',
    edge_extends: '繼承與實作 (Extends)',
    edge_instantiates: '實例化 (Instantiates)',
    edge_imports: '模組引用 (Imports)',
    edge_references: '符號參照 (References)',
    drawer_panel_title: '🔍 Inspector 檢查器',
    drawer_antigravity: '使用 Antigravity 開啟',
    drawer_antigravity_tip: '直接於 Antigravity IDE 中開啟該行程式碼',
    drawer_copy_path: '複製路徑',
    drawer_copy_prompt: '複製提示詞',
    drawer_source: '原始碼切片',
    drawer_loading_code: '載入程式碼片段中...',
    drawer_inbound: '呼叫來源 (Inbound)',
    drawer_outbound: '依賴目標 (Outbound)',
    modal_title: 'CodeGraph 專案庫管理中心',
    modal_sub: '支援掃描本機任何目錄，在線執行建庫 (init)、增量同步 (sync)、全量重建 (index) 與退庫 (uninit)。',
    modal_add_dir: '掃描專案目錄：',
    modal_input_ph: '請輸入目錄絕對路徑 (例如: D:\Projects)',
    modal_btn_add: '新增路徑',
    modal_btn_browse: '📁 瀏覽資料夾...',
    modal_repo_list: '已發現之專案清單：',
    th_proj: '專案名稱',
    th_path: '實體路徑',
    th_metrics: '規模指標',
    th_status: '索引狀態',
    th_ops: '管理操作',
    status_ready: '已建庫',
    status_unindexed: '未建庫',
    act_init: '建立索引',
    act_uninit: '退庫',
    act_sync: '增量建庫',
    act_reindex: '全量重建',
    act_exclude: '排除',
    confirm_exclude: '確定要將專案 [{name}] 從清單中排除嗎？',
    toast_exclude_done: '已從清單中排除專案。',
    btn_close: '關閉',
    confirm_uninit: '確定要將專案 [{name}] 退庫嗎？\n此操作將移除其 .codegraph 索引資料庫。',
    toast_path_copied: '已複製檔案路徑。',
    toast_prompt_copied: '已複製脈絡提示詞。',
    toast_sync_done: '已從 CodeGraph 同步 3D 圖形資料。',
    toast_index_done: '專案索引建庫完成。',
    toast_init_done: 'CodeGraph 索引建立完成。',
    toast_uninit_done: '專案已完成退庫。',
    toast_reindex_done: '全量重建索引完成。',
    toast_input_path: '請輸入有效的目錄路徑。',
    tree_filter_ph: '過濾檔案與符號...',
    pending_sync_tip: '硬碟實體存在但尚未入庫至 CodeGraph 的檔案（點擊檢閱並建庫）',
    dir_unindexed_tip: '內含 {n} 個未建庫檔案（點擊檢閱並建庫）',
    sync_modal_title: '專案增量建庫與檔案檢閱',
    sync_modal_sub: '檢視尚未納入 CodeGraph 知識庫之實體檔案。可逐一檢閱代碼、勾選批次建庫 (Index) 或排除。',
    sync_search_ph: '🔍 搜尋過濾檔案路徑或副檔名...',
    sync_sel_all: '✔ 全選',
    sync_sel_none: '✖ 全不選',
    sync_sel_count: '已選 {n} / {total}',
    sync_btn_sync: '執行 CodeGraph 索引建庫',
    sync_btn_exclude: '排除已選',
    sync_code_preview_tip: '請從左側點選檔案以預覽代碼',
    sync_code_empty_tip: '點擊左側檔案列表即可即時檢視代碼內容',
    sync_no_unindexed: '🎉 該專案/目錄之實體檔案已全數入庫！',
    sync_no_match: '無符合搜尋條件的檔案',
    sync_status_unindexed: '未入庫',
    sync_loading: '載入原始碼中...',
    sync_in_progress: 'CodeGraph 索引建庫中...',
    sync_success_toast: '✅ {proj} 索引建庫完成！',
    sync_exclude_confirm: '確定要將已選取的 {n} 個檔案加入排除清單（不再提示未入庫）嗎？',
    sync_exclude_toast: '🚫 已成功排除 {n} 個檔案！',
    sync_lines: '{n} 行'
  }
};

function t(key, vars = {}) {
  const dict = I18N[currentLang] || I18N['en-US'];
  let val = dict[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    val = val.replace(`{${k}}`, v);
  }
  return val;
}

function applyLanguage() {
  if (typeof updateSyncModalI18n === "function") updateSyncModalI18n();
  document.getElementById('btn-lang').innerText = t('lang_btn');
  document.getElementById('app-logo').innerText = t('app_title');
  document.getElementById('btn-toggle-tree').innerText = t('btn_tree');
  document.getElementById('lbl-tree-title').innerText = t('lbl_tree');
  document.getElementById('btn-repo-mgr').innerText = t('btn_repo_mgr');
  document.getElementById('btn-clear-hl').innerText = t('btn_clear_hl');
  document.getElementById('tree-search').placeholder = t('tree_filter_ph');
  
  document.getElementById('btn-sel-all').innerText = t('sel_all');
  document.getElementById('btn-sel-none').innerText = t('sel_none');
  document.getElementById('lbl-proj-summary').innerText = t('active_summary', { n: selectedProjects.size });
  
  if (document.getElementById('lbl-mode-title')) document.getElementById('lbl-mode-title').innerText = t('lbl_mode_title');
  if (document.getElementById('lod-arch')) {
    document.getElementById('lod-arch').innerText = t('lod_arch');
    document.getElementById('lod-arch').title = t('lod_arch_tip');
  }
  if (document.getElementById('lod-standard')) {
    document.getElementById('lod-standard').innerText = t('lod_standard');
    document.getElementById('lod-standard').title = t('lod_standard_tip');
  }
  if (document.getElementById('lod-all')) {
    document.getElementById('lod-all').innerText = t('lod_all');
    document.getElementById('lod-all').title = t('lod_all_tip');
  }
  if (document.getElementById('lod-custom')) {
    document.getElementById('lod-custom').innerText = t('lod_custom');
    document.getElementById('lod-custom').title = t('lod_custom_tip');
  }
  
  document.getElementById('search-box').placeholder = t('search_ph');
  document.getElementById('btn-rotate').innerText = t('rotate_btn');
  document.getElementById('btn-rotate').title = t('rotate_tip');
  document.getElementById('btn-reset-cam').innerText = t('center_btn');
  document.getElementById('btn-reset-cam').title = t('center_tip');
  document.getElementById('btn-sync').innerText = t('sync_btn');
  document.getElementById('btn-sync').title = t('sync_tip');

  document.getElementById('bc-root').innerText = t('bc_overview');

  document.getElementById('tab-btn-nodes').innerText = t('tab_nodes');
  document.getElementById('tab-btn-edges').innerText = t('tab_edges');
  document.getElementById('btn-legend-all').innerText = t('legend_all');

  document.getElementById('lbl-drawer-panel-title').innerText = t('drawer_panel_title');
  document.getElementById('ide-antigravity').innerText = t('drawer_antigravity');
  document.getElementById('ide-antigravity').title = t('drawer_antigravity_tip');
  document.getElementById('btn-copy-path').innerText = t('drawer_copy_path');
  document.getElementById('btn-copy-prompt').innerText = t('drawer_copy_prompt');
  document.getElementById('lbl-source-title').innerText = t('drawer_source');
  document.getElementById('lbl-inbound').innerText = t('drawer_inbound');
  document.getElementById('lbl-outbound').innerText = t('drawer_outbound');

  document.getElementById('lbl-modal-title').innerText = t('modal_title');
  document.getElementById('lbl-modal-sub').innerText = t('modal_sub');
  document.getElementById('lbl-add-dir').innerText = t('modal_add_dir');
  document.getElementById('custom-path-input').placeholder = t('modal_input_ph');
  document.getElementById('btn-add-path').innerText = t('modal_btn_add');
  const browseBtn = document.getElementById('btn-browse-path');
  if (browseBtn) {
    browseBtn.innerText = t('modal_btn_browse');
    if (window.electronAPI && window.electronAPI.isElectron) {
      browseBtn.style.display = 'inline-flex';
    }
  }
  document.getElementById('lbl-repo-list').innerText = t('modal_repo_list');
  document.getElementById('th-proj').innerText = t('th_proj');
  document.getElementById('th-path').innerText = t('th_path');
  document.getElementById('th-metrics').innerText = t('th_metrics');
  document.getElementById('th-status').innerText = t('th_status');
  document.getElementById('th-ops').innerText = t('th_ops');
  document.getElementById('btn-close-modal').innerText = t('btn_close');

  buildLegends();
  if (typeof renderCodegraphConn === 'function') renderCodegraphConn();
  if (document.getElementById('path-modal').classList.contains('show')) {
    loadManagerList();
  }
}

function toggleLanguage() {
  currentLang = (currentLang === 'en-US') ? 'zh-TW' : 'en-US';
  localStorage.setItem('codegraph_lang', currentLang);
  applyLanguage();
  showToast(currentLang === 'en-US' ? 'Switched to English' : '已切換為繁體中文');
}

// ==========================================
// Palettes & Constants
// ==========================================
const KIND_COLORS = {
  file: '#f0883e',
  directory: '#58a6ff',
  project: '#bc8cff',
  unindexed_file: '#d29922',
  namespace: '#f0883e',
  class: '#3fb950',
  interface: '#2ea043',
  type_alias: '#56d364',
  function: '#58a6ff',
  method: '#79c0ff',
  variable: '#8b949e',
  field: '#8b949e',
  constant: '#d29922',
  property: '#a371f7',
  route: '#f778ba',
  import: '#bc8cff'
};

const EDGE_COLORS = {
  calls: '#58a6ff',
  contains: '#388bfd55',
  extends: '#f778ba',
  implements: '#f778ba',
  instantiates: '#d29922',
  imports: '#bc8cff',
  references: '#3fb950'
};

let Graph = null;
let allProjectsList = [];
let selectedProjects = new Set();
let currentLOD = 'arch';
let rawData = { nodes: [], links: [], unindexed_by_project: {} };
// Explorer tree source: full symbol list independent of the 3D LOD, so the
// tree always shows every symbol even when arch mode hides them in 3D.
let treeData = { nodes: [] };
let currentData = { nodes: [], links: [] };
let hiddenKinds = new Set();
let hiddenEdgeKinds = new Set();
let breadcrumb = [];
let isRotating = false;
let activeNode = null;
let lastBgClickAt = 0;

// Highlighting State
let highlightNodes = new Set();
let highlightLinks = new Set();
let selectedTreeNodeEl = null;

function init3DGraph() {
  const elem = document.getElementById('3d-graph');
  
  Graph = ForceGraph3D()(elem)
    .backgroundColor('#090d13')
    .nodeId('id')
    .nodeLabel(n => `${n.name} (${n.kind})\n${n.project} · ${n.file_path || ''}`)
    .nodeColor(n => {
      if (highlightNodes.size > 0) {
        return highlightNodes.has(n.id) ? (KIND_COLORS[n.kind] || '#58a6ff') : '#1c212888';
      }
      return KIND_COLORS[n.kind] || '#58a6ff';
    })
    .nodeRelSize(5)
    .nodeVal(n => {
      let base = 1.6;
      if (n.kind === 'file') base = 5.5;
      else if (n.kind === 'class') base = 4.2;
      else if (n.kind === 'function' || n.kind === 'route') base = 2.8;
      else if (n.kind === 'method') base = 2.0;

      if (highlightNodes.has(n.id)) return base * 1.8;
      return base;
    })
    .nodeResolution(8)
    .linkOpacity(l => {
      if (highlightNodes.size > 0) {
        return highlightLinks.has(l) ? 0.9 : 0.08;
      }
      return 0.35;
    })
    .linkColor(l => {
      if (highlightNodes.size > 0) {
        if (highlightLinks.has(l)) return '#58a6ff';
        return '#21262d22';
      }
      return l.cross_project ? '#f85149' : (EDGE_COLORS[l.kind] || '#58a6ff');
    })
    .linkWidth(l => {
      if (highlightNodes.size > 0) {
        return highlightLinks.has(l) ? 2.2 : 0.2;
      }
      return l.kind === 'calls' ? 1.0 : 0.5;
    })
    .linkDirectionalParticles(l => {
      if (highlightNodes.size > 0) {
        return highlightLinks.has(l) ? 4 : 0;
      }
      return 1;
    })
    .linkDirectionalParticleWidth(l => highlightLinks.has(l) ? 2.0 : 1.0)
    .linkDirectionalParticleSpeed(l => highlightLinks.has(l) ? 0.008 : 0.004)
    .d3AlphaDecay(0.02)
    .d3VelocityDecay(0.3)
    .onNodeClick(node => {
      highlightScope('node', node);
      focusOnNode(node);
      openDrawer(node);
      syncExplorerSelection(node);
    })
    .onNodeRightClick(node => {
      if (node.kind === 'file' || node.kind === 'class') {
        drillDown(node);
      }
    })
    .onBackgroundClick(() => {
      clearHighlight();
      const now = Date.now();
      if (now - lastBgClickAt < 350) {
        lastBgClickAt = 0;
        if (Graph) Graph.zoomToFit(600, 40);
      } else {
        lastBgClickAt = now;
      }
    });

  window.addEventListener('resize', () => {
    if (!Graph) return;
    layoutGraphViewport();
    try { Graph.height(window.innerHeight); } catch (e) { /* ignore */ }
  });
  try {
    const drawerEl = document.getElementById('drawer');
    if (drawerEl && typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => layoutGraphViewport())
        .observe(drawerEl, { attributes: true, attributeFilter: ['class'] });
    }
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => layoutGraphViewport());
      if (drawerEl) ro.observe(drawerEl);
      const treeEl = document.getElementById('tree-panel');
      if (treeEl) ro.observe(treeEl);
    }
  } catch (e) { /* observers optional */ }
  layoutGraphViewport();
  ensureFileLabelLayer();
  startFlightLoop();
}

// 3D canvas yields to side panels: orbit center stays in the visible
// strip so focusOnNode never lands under a panel.
let graphOriginX = 0;
let graphVisibleRight = (typeof window !== 'undefined' && window.innerWidth) || 1280;

function panelCutWidth(id, needOpenClass) {
  try {
    const el = document.getElementById(id);
    if (!el || el.offsetParent === null) return 0;
    if (needOpenClass && !el.classList.contains('open')) return 0;
    return el.getBoundingClientRect().width || 0;
  } catch (e) { /* ignore */ }
  return 0;
}

function drawerViewportCut() {
  return panelCutWidth('drawer', true);
}

function layoutGraphViewport() {
  if (typeof Graph === 'undefined' || !Graph || !Graph.width) return;
  try {
    const leftCut = Math.round(panelCutWidth('tree-panel', false));
    const rightCut = Math.round(drawerViewportCut());
    const w = Math.max(320, window.innerWidth - leftCut - rightCut);
    Graph.width(w);
    // NOTE: never querySelector('#3d-graph ...') — a leading-digit id is an
    // invalid CSS selector and throws (that silently killed the offset before).
    const holder = document.getElementById('3d-graph');
    if (holder) holder.style.paddingLeft = `${leftCut}px`;
    graphOriginX = leftCut;
    graphVisibleRight = window.innerWidth - rightCut;
  } catch (e) { /* ignore */ }
}

// ==========================================
// Keyboard flight (WASD/arrows + QE, Shift boost; CyberControl-style feel)
// ==========================================
const flightKeys = new Set();

function flightIsTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

window.addEventListener('keydown', (e) => {
  if (flightIsTyping()) return;
  const k = (e.key || '').toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
    flightKeys.add(k);
    if (k.startsWith('arrow')) e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  flightKeys.delete((e.key || '').toLowerCase());
});
window.addEventListener('blur', () => flightKeys.clear());

function flightOffset(fwd, right, up, keys, speed) {
  const o = { x: 0, y: 0, z: 0 };
  const add = (v, s) => { o.x += v.x * s; o.y += v.y * s; o.z += v.z * s; };
  if (keys.has('w') || keys.has('arrowup')) add(fwd, speed);
  if (keys.has('s') || keys.has('arrowdown')) add(fwd, -speed);
  if (keys.has('a') || keys.has('arrowleft')) add(right, -speed);
  if (keys.has('d') || keys.has('arrowright')) add(right, speed);
  if (keys.has('e')) add(up, speed);
  if (keys.has('q')) add(up, -speed);
  return o;
}

function startFlightLoop() {
  const tick = () => {
    try { flightStep(); } catch (e) { /* never break the render loop */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function flightStep() {
  if (!flightKeys.size || typeof Graph === 'undefined' || !Graph || !Graph.cameraPosition) return false;
  const pos = Graph.cameraPosition();
  let tgt = { x: 0, y: 0, z: 0 };
  try {
    const ctrl = (typeof Graph.controls === 'function') ? Graph.controls() : null;
    if (ctrl && ctrl.target && isFinite(ctrl.target.x)) {
      tgt = { x: ctrl.target.x, y: ctrl.target.y, z: ctrl.target.z };
    }
  } catch (e) { /* keep fallback target */ }
  const fwd = { x: tgt.x - pos.x, y: tgt.y - pos.y, z: tgt.z - pos.z };
  const dist = Math.sqrt(fwd.x * fwd.x + fwd.y * fwd.y + fwd.z * fwd.z) || 1;
  fwd.x /= dist; fwd.y /= dist; fwd.z /= dist;
  const up = { x: 0, y: 1, z: 0 };
  const right = {
    x: fwd.y * up.z - fwd.z * up.y,
    y: fwd.z * up.x - fwd.x * up.z,
    z: fwd.x * up.y - fwd.y * up.x,
  };
  const speed = dist * 0.02 * (flightKeys.has('shift') ? 3.5 : 1);
  const o = flightOffset(fwd, right, up, flightKeys, speed);
  if (!o.x && !o.y && !o.z) return false;
  const newPos = { x: pos.x + o.x, y: pos.y + o.y, z: pos.z + o.z };
  const newLook = { x: tgt.x + o.x, y: tgt.y + o.y, z: tgt.z + o.z };
  // lookAt follows: pure translation, no tilt (this is what makes Q/E truly vertical)
  Graph.cameraPosition(newPos, newLook);
  try {
    const ctrl = (typeof Graph.controls === 'function') ? Graph.controls() : null;
    if (ctrl && ctrl.target) {
      ctrl.target.x = newLook.x; ctrl.target.y = newLook.y; ctrl.target.z = newLook.z;
      if (typeof ctrl.update === 'function') ctrl.update();
    }
  } catch (e) { /* ignore */ }
  return true;
}

// ==========================================
// File sphere labels (HTML overlay, zero new deps)
// ==========================================
let fileLabelLayer = null;
const fileLabelDivs = new Map();

function fileLabelName(n) {
  const fp = n.file_path || n.name || '';
  return fp.split('/').pop().split('\\').pop();
}

function ensureFileLabelLayer() {
  if (fileLabelLayer) return fileLabelLayer;
  fileLabelLayer = document.createElement('div');
  fileLabelLayer.id = 'file-labels';
  fileLabelLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:5;';
  document.body.appendChild(fileLabelLayer);
  const tick = () => {
    try {
      updateFileLabels();
      updateFocusLabel();
    } catch (e) { /* never break the render loop */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return fileLabelLayer;
}

function updateFileLabels() {
  if (!Graph || !Graph.graphData || typeof Graph.graph2ScreenCoords !== 'function' || !fileLabelLayer) return;
  const nodes = Graph.graphData().nodes || [];
  let camPos = null, lookDir = null;
  try {
    const cam = Graph.camera();
    const ctrl = (typeof Graph.controls === 'function') ? Graph.controls() : null;
    if (cam && cam.position && ctrl && ctrl.target) {
      camPos = cam.position;
      lookDir = {
        x: ctrl.target.x - camPos.x,
        y: ctrl.target.y - camPos.y,
        z: ctrl.target.z - camPos.z,
      };
    }
  } catch (e) { /* ignore */ }
  const seen = new Set();
  const hlActive = (typeof highlightNodes !== 'undefined' && highlightNodes.size > 0);
  for (const n of nodes) {
    if (!n || n.kind !== 'file' || n.x === undefined) continue;
    const base = fileLabelName(n);
    if (!base || base === '__init__.py') continue;
    // Focused node shows the pill instead — one node, one label, no duplicates.
    if (typeof focusLabelNodeId !== 'undefined' && n.id === focusLabelNodeId) continue;
    seen.add(n.id);
    let div = fileLabelDivs.get(n.id);
    if (!div) {
      div = document.createElement('div');
      div.textContent = base;
      div.style.cssText = `position:absolute;transform:translate(-50%,-160%);font-size:11px;color:${(typeof KIND_COLORS !== 'undefined' && KIND_COLORS.file) || '#f0883e'};text-shadow:0 1px 3px #000,0 0 8px #000;white-space:nowrap;pointer-events:none;`;
      fileLabelLayer.appendChild(div);
      fileLabelDivs.set(n.id, div);
    }
    // behind camera → hide (dot((N-C),(T-C)) < 0)
    let behind = false;
    if (camPos && lookDir) {
      const dot = (n.x - camPos.x) * lookDir.x + (n.y - camPos.y) * lookDir.y + (n.z - camPos.z) * lookDir.z;
      behind = dot < 0;
    }
    let sp = null;
    try { sp = Graph.graph2ScreenCoords(n.x, n.y, n.z); } catch (e) { /* ignore */ }
    const vx = sp ? sp.x + graphOriginX : -9999;
    if (behind || !sp || vx < graphOriginX - 80 || sp.y < 8 || vx > graphVisibleRight + 40 || sp.y > window.innerHeight + 40) {
      div.style.display = 'none';
      continue;
    }
    div.style.display = '';
    div.style.left = `${vx}px`;
    div.style.top = `${sp.y}px`;
    div.style.opacity = (hlActive && !highlightNodes.has(n.id)) ? '0.15' : '0.95';
  }
  for (const [id, div] of fileLabelDivs) {
    if (!seen.has(id)) {
      try { div.remove(); } catch (e) { /* ignore */ }
      fileLabelDivs.delete(id);
    }
  }
}

// Focus label ("牌位"): the focused node always gets a label, even when its
// kind has no file-labels (class/function/...) or its layer is hidden —
// walk-up focus lands on the ancestor, and the ancestor's label shows.
let focusLabelNodeId = null;
const chainPillIds = new Set();
let focusChainToken = 0;

function showFocusLabelNode(n) {
  focusLabelNodeId = (n && n.id) || null;
  chainPillIds.clear();
}

function setChainPills(ids) {
  chainPillIds.clear();
  for (const id of (ids || [])) chainPillIds.add(id);
}

// Light the whole visible ancestor chain above the focused node, with pills.
// Attached chains (walk-up flows) apply synchronously; otherwise one cheap
// local fetch. Stale-safe via focusChainToken.
function lightFullChain(node, token) {
  const apply = (chain) => {
    if (!chain || !chain.length) return;
    if (token !== focusChainToken || focusLabelNodeId !== node.id) return;
    setChainPills(chain);
    let added = false;
    if (typeof highlightNodes !== 'undefined') {
      for (const aid of chain) {
        if (!highlightNodes.has(aid)) { highlightNodes.add(aid); added = true; }
      }
    }
    if (added && typeof Graph !== 'undefined' && Graph) {
      Graph.nodeColor(Graph.nodeColor())
        .linkColor(Graph.linkColor())
        .linkWidth(Graph.linkWidth())
        .linkDirectionalParticles(Graph.linkDirectionalParticles());
    }
  };
  const attached = (node && node._visibleAncestors) || null;
  if (attached) {
    apply(attached.filter((cid) => cid !== node.id));
    return;
  }
  if (!node || !node.project || !node.id) return;
  fetch(`/api/chat/node?id=${encodeURIComponent(node.id)}&project=${encodeURIComponent(node.project || '')}`)
    .then((res) => res.json())
    .then((info) => {
      if (!info || !info.found || typeof findGraphNode !== 'function') return;
      apply(info.vAncestors.filter((a) => a.id !== node.id && findGraphNode(a.id)).map((a) => a.id));
    })
    .catch(() => {});
}

const pillDivs = new Map(); // id -> pill div (focused + chain, one node one label)

function updateFocusLabel() {
  if (!fileLabelLayer) return;
  // Pills follow the focused node + its ancestor chain only — never the
  // whole highlight set (project scope would sprout hundreds of pills).
  const targets = new Set();
  if (focusLabelNodeId) targets.add(focusLabelNodeId);
  try {
    for (const id of chainPillIds) targets.add(id);
  } catch (e) { /* ignore */ }
  // Camera basis shared by all pills this frame.
  let camPos = null, lookDir = null;
  try {
    const cam = Graph.camera();
    const ctrl = (typeof Graph.controls === 'function') ? Graph.controls() : null;
    if (cam && cam.position && ctrl && ctrl.target) {
      camPos = cam.position;
      lookDir = {
        x: ctrl.target.x - camPos.x,
        y: ctrl.target.y - camPos.y,
        z: ctrl.target.z - camPos.z,
      };
    }
  } catch (e) { /* ignore */ }
  const seen = new Set();
  for (const id of targets) {
    const n = (typeof findGraphNode === 'function') ? findGraphNode(id) : null;
    if (!n || n.x === undefined || typeof Graph === 'undefined' || !Graph || typeof Graph.graph2ScreenCoords !== 'function') continue;
    // Filename labels already cover plain file nodes — except the focused one.
    if (n.kind === 'file' && id !== focusLabelNodeId) {
      const base = (typeof fileLabelName === 'function') ? fileLabelName(n) : '';
      if (base && base !== '__init__.py') continue;
    }
    let behind = false;
    if (camPos && lookDir) {
      behind = ((n.x - camPos.x) * lookDir.x + (n.y - camPos.y) * lookDir.y + (n.z - camPos.z) * lookDir.z) < 0;
    }
    let sp = null;
    try { sp = Graph.graph2ScreenCoords(n.x, n.y, n.z); } catch (e) { /* ignore */ }
    const vx = sp ? sp.x + graphOriginX : -9999;
    if (behind || !sp || vx < graphOriginX - 80 || sp.y < 8 || vx > graphVisibleRight + 40 || sp.y > window.innerHeight + 40) continue;
    seen.add(id);
    let div = pillDivs.get(id);
    if (!div) {
      div = document.createElement('div');
      div.style.cssText = 'position:absolute;transform:translate(-50%,70%);pointer-events:none;white-space:nowrap;';
      fileLabelLayer.appendChild(div);
      pillDivs.set(id, div);
    }
    const color = (typeof KIND_COLORS !== 'undefined' && KIND_COLORS[n.kind]) || '#58a6ff';
    div.style.display = '';
    div.style.left = `${vx}px`;
    div.style.top = `${sp.y}px`;
    div.innerHTML = '';
    const pill = document.createElement('span');
    pill.textContent = `${n.name || n.id} · ${n.kind || ''}`;
    pill.style.cssText = `background:rgba(13,17,23,0.92);border:1px solid ${color};color:${color};border-radius:999px;padding:2px 10px;font-size:12px;`;
    div.appendChild(pill);
  }
  for (const [id, div] of pillDivs) {
    if (!seen.has(id)) {
      try { div.remove(); } catch (e) { /* ignore */ }
      pillDivs.delete(id);
    }
  }
}

// ==========================================
// Explorer Panel & Nested Folder Directory Tree
// ==========================================
function toggleTreePanel() {
  const panel = document.getElementById('tree-panel');
  const btn = document.getElementById('btn-toggle-tree');
  panel.classList.toggle('collapsed');
  btn.classList.toggle('active', !panel.classList.contains('collapsed'));
}

function countUnindexedInDir(dirObj) {
  if (!dirObj) return 0;
  let count = 0;
  for (const f of Object.values(dirObj.files || {})) {
    if (f && f.is_unindexed) count++;
  }
  for (const d of Object.values(dirObj.dirs || {})) {
    count += countUnindexedInDir(d);
  }
  return count;
}

function loadTreeData() {
  const names = Array.from(selectedProjects);
  if (!names.length) {
    treeData = { nodes: [] };
    buildProjectTree();
    return;
  }
  fetch(`/api/graph?projects=${encodeURIComponent(names.join(','))}&lod=all`)
    .then(res => res.json())
    .then(data => {
      treeData = { nodes: data.nodes || [] };
      buildProjectTree();
    })
    .catch(() => { /* keep last good tree */ });
}

// Nest flat symbols under their parents via qualified_name
// (StateMachine::__init__ under StateMachine); unknown parents stay top-level.
function treeNestSymbols(symList) {
  const byQual = new Map();
  for (const s of (symList || [])) {
    if (s && s.kind !== 'file' && s.qualified_name) {
      const key = `${s.file_path || ''}\n${s.qualified_name}`;
      if (!byQual.has(key)) byQual.set(key, s);
    }
  }
  const childrenOf = new Map();
  const roots = [];
  for (const s of (symList || [])) {
    if (!s || s.kind === 'file') continue;
    const qn = s.qualified_name || '';
    const sep = qn.includes('::') ? '::' : (qn.includes('.') ? '.' : null);
    let parent = null;
    if (sep) {
      const parts = qn.split(sep);
      if (parts.length > 1) {
        parent = byQual.get(`${s.file_path || ''}\n${parts.slice(0, -1).join(sep)}`) || null;
      }
    }
    if (parent && parent.id !== s.id) {
      if (!childrenOf.has(parent.id)) childrenOf.set(parent.id, []);
      childrenOf.get(parent.id).push(s);
    } else {
      roots.push(s);
    }
  }
  return { roots, childrenOf };
}

function buildProjectTree() {
  const container = document.getElementById('tree-container');
  if (!container) return;
  
  // 1. Snapshot currently open folders, active selection, and scroll position
  const openProjs = new Set();
  const openDirs = new Set();
  const openFiles = new Set();

  container.querySelectorAll('.tree-children.open').forEach(childEl => {
    const prev = childEl.previousElementSibling;
    if (prev) {
      const p = prev.getAttribute('data-tree-proj');
      const d = prev.getAttribute('data-tree-dir');
      const f = prev.getAttribute('data-tree-file');
      if (p) openProjs.add(p);
      if (d) openDirs.add(d);
      if (f) openFiles.add(f);
    }
  });

  const selectedKey = selectedTreeNodeEl ? (
    selectedTreeNodeEl.getAttribute('data-tree-node-id') ||
    selectedTreeNodeEl.getAttribute('data-tree-file') ||
    selectedTreeNodeEl.getAttribute('data-tree-dir') ||
    selectedTreeNodeEl.getAttribute('data-tree-proj')
  ) : null;
  const prevScrollTop = container.scrollTop;

  container.innerHTML = '';
  
  const readyProjects = allProjectsList.filter(p => p.status === 'ready');
  if (readyProjects.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:#8b949e; padding:8px;">No indexed repositories</div>';
    return;
  }

  document.getElementById('lbl-proj-summary').innerText = t('active_summary', { n: selectedProjects.size });

  // Build recursive directory structure for active nodes per project
  const projRoots = {};

  // Ingest indexed nodes (full list: tree is independent of the 3D LOD)
  (treeData.nodes || []).forEach(n => {
    const proj = n.project || 'Unknown';
    if (!projRoots[proj]) {
      projRoots[proj] = { name: proj, dirs: {}, files: {} };
    }

    const rawPath = (n.file_path || '').split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
    if (!rawPath) return;

    const parts = rawPath.split('/');
    const fileName = parts.pop();

    let currentDir = projRoots[proj];
    let accumulatedPath = '';

    parts.forEach(p => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${p}` : p;
      if (!currentDir.dirs[p]) {
        currentDir.dirs[p] = {
          name: p,
          path: accumulatedPath,
          dirs: {},
          files: {}
        };
      }
      currentDir = currentDir.dirs[p];
    });

    if (!currentDir.files[fileName]) {
      currentDir.files[fileName] = {
        name: fileName,
        path: rawPath,
        symbols: [],
        is_unindexed: false
      };
    }
    currentDir.files[fileName].symbols.push(n);
  });

  // Ingest unindexed delta files
  const unindexedByProj = rawData.unindexed_by_project || {};
  for (const [proj, files] of Object.entries(unindexedByProj)) {
    if (!projRoots[proj]) {
      projRoots[proj] = { name: proj, dirs: {}, files: {} };
    }

    (files || []).forEach(fPath => {
      const normPath = fPath.split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
      const parts = normPath.split('/');
      const fileName = parts.pop();

      let currentDir = projRoots[proj];
      let accumulatedPath = '';

      parts.forEach(p => {
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${p}` : p;
        if (!currentDir.dirs[p]) {
          currentDir.dirs[p] = {
            name: p,
            path: accumulatedPath,
            dirs: {},
            files: {}
          };
        }
        currentDir = currentDir.dirs[p];
      });

      if (!currentDir.files[fileName]) {
        currentDir.files[fileName] = {
          name: fileName,
          path: normPath,
          symbols: [],
          is_unindexed: true
        };
      }
    });
  }

  // Render All Ready Project Roots
  readyProjects.forEach(proj => {
    const projName = proj.name;
    const isSelected = selectedProjects.has(projName);
    const projData = projRoots[projName] || { dirs: {}, files: {} };
    const pendingCount = proj.pending_sync_count || (proj.unindexed_files ? proj.unindexed_files.length : 0);

    const projNodeEl = document.createElement('div');
    projNodeEl.className = 'tree-node';
    projNodeEl.setAttribute('data-tree-proj', projName);
    
    const isProjOpen = openProjs.has(projName);

    projNodeEl.innerHTML = `
      <span class="tree-arrow ${isProjOpen ? 'open' : ''}">▸</span>
      <input type="checkbox" ${isSelected ? 'checked' : ''} title="Toggle project inclusion" />
      <span style="font-weight:600; color:#58a6ff;">📦 ${projName}</span>
      ${pendingCount > 0 ? `<span class="sync-delta-badge" title="${t('pending_sync_tip')}">⚡ ${pendingCount}</span>` : ''}
      <span class="node-kind-tag" style="margin-left:${pendingCount > 0 ? '4px' : 'auto'};">${isSelected ? 'active' : 'off'}</span>
    `;

    const pendingBadgeEl = projNodeEl.querySelector('.sync-delta-badge');
    if (pendingBadgeEl) {
      pendingBadgeEl.onclick = (e) => {
        e.stopPropagation();
        openSyncReviewModal(projName);
      };
    }

    const projChildrenEl = document.createElement('div');
    projChildrenEl.className = `tree-children ${isProjOpen ? 'open' : ''}`;

    const chk = projNodeEl.querySelector('input[type="checkbox"]');
    chk.onclick = (e) => {
      e.stopPropagation();
      if (chk.checked) {
        selectedProjects.add(projName);
      } else {
        selectedProjects.delete(projName);
      }
      loadRootGraph();
    };

    const arrow = projNodeEl.querySelector('.tree-arrow');
    arrow.onclick = (e) => {
      e.stopPropagation();
      projChildrenEl.classList.toggle('open');
      arrow.classList.toggle('open');
    };

    projNodeEl.onclick = () => {
      selectTreeNode(projNodeEl);
      if (isSelected) {
        highlightScope('project', { name: projName });
        openProjectDrawer(projName, proj);
      }
    };

    if (selectedKey === projName) {
      selectTreeNode(projNodeEl);
    }

    // Recursively render directory children preserving open states
    renderDirContents(projName, projData, projChildrenEl, openDirs, openFiles, selectedKey);

    container.appendChild(projNodeEl);
    container.appendChild(projChildrenEl);
  });

  // Restore scroll position
  container.scrollTop = prevScrollTop;
}

function renderDirContents(projName, dirObj, parentEl, openDirs, openFiles, selectedKey) {
  if (!dirObj) return;

  // 1. Render Subdirectories
  const dirNames = Object.keys(dirObj.dirs || {}).sort();
  dirNames.forEach(dName => {
    const subDir = dirObj.dirs[dName];
    const unindexedCount = countUnindexedInDir(subDir);
    const cleanSubPath = (subDir.path || '').split(String.fromCharCode(92)).join('/');
    const dirKey = `${projName}:${cleanSubPath}`;
    const isDirOpen = openDirs ? openDirs.has(dirKey) : false;

    const dirNodeEl = document.createElement('div');
    dirNodeEl.className = 'tree-node';
    dirNodeEl.setAttribute('data-tree-dir', dirKey);

    dirNodeEl.innerHTML = `
      <span class="tree-arrow ${isDirOpen ? 'open' : ''}">▸</span>
      <span style="font-weight:500; color:#e6edf3;">📁 ${dName}</span>
      ${unindexedCount > 0 ? `<span class="sync-delta-badge" style="font-size:9px; padding:0 4px; margin-left:auto;" title="${t('dir_unindexed_tip', { n: unindexedCount })}">⚡ ${unindexedCount}</span>` : ''}
    `;

    const deltaBadgeEl = dirNodeEl.querySelector('.sync-delta-badge');
    if (deltaBadgeEl) {
      deltaBadgeEl.onclick = (e) => {
        e.stopPropagation();
        openSyncReviewModal(projName, cleanSubPath);
      };
    }

    const dirChildrenEl = document.createElement('div');
    dirChildrenEl.className = `tree-children ${isDirOpen ? 'open' : ''}`;

    const arrow = dirNodeEl.querySelector('.tree-arrow');
    arrow.onclick = (e) => {
      e.stopPropagation();
      dirChildrenEl.classList.toggle('open');
      arrow.classList.toggle('open');
    };

    dirNodeEl.onclick = () => {
      selectTreeNode(dirNodeEl);
      highlightScope('dir', { project: projName, dir_path: cleanSubPath });
      openDirDrawer(projName, cleanSubPath, subDir);
    };

    if (selectedKey === dirKey) {
      selectTreeNode(dirNodeEl);
    }

    renderDirContents(projName, subDir, dirChildrenEl, openDirs, openFiles, selectedKey);

    parentEl.appendChild(dirNodeEl);
    parentEl.appendChild(dirChildrenEl);
  });

  // 2. Render Files
  const fileNames = Object.keys(dirObj.files || {}).sort();
  fileNames.forEach(fName => {
    const fileData = dirObj.files[fName];
    const symList = fileData.symbols || [];
    const isUnindexed = fileData.is_unindexed;
    const cleanFilePath = (fileData.path || '').split(String.fromCharCode(92)).join('/');
    const fileKey = `${projName}:${cleanFilePath}`;
    const isFileOpen = openFiles ? openFiles.has(fileKey) : false;

    const fileNode = isUnindexed ? {
      id: `${projName}:${cleanFilePath}`,
      name: fName,
      kind: 'unindexed_file',
      project: projName,
      file_path: cleanFilePath,
      start_line: 1,
      end_line: 500,
      is_unindexed: true
    } : (symList.find(s => s.kind === 'file') || {
      id: `${projName}:${cleanFilePath}`,
      name: fName,
      kind: 'file',
      project: projName,
      file_path: cleanFilePath,
      start_line: 1,
      end_line: 500
    });

    const fileNodeEl = document.createElement('div');
    fileNodeEl.className = 'tree-node';
    fileNodeEl.setAttribute('data-tree-file', fileKey);
    if (isUnindexed) fileNodeEl.setAttribute('data-is-unindexed', 'true');

    if (isUnindexed) {
      fileNodeEl.innerHTML = `
        <span class="tree-arrow" style="visibility:hidden;">▸</span>
        <span style="color:#d29922; font-weight:500;">📄 ${fName}</span>
        <span class="node-kind-tag" style="background:#d2992222; color:#d29922; border:1px solid #d2992255;">UNINDEXED</span>
      `;
    } else {
      fileNodeEl.innerHTML = `
        <span class="tree-arrow ${isFileOpen ? 'open' : ''}">▸</span>
        <span style="color:#c9d1d9;">📄 ${fName}</span>
        <span class="node-kind-tag">${symList.length}</span>
      `;
    }

    const fileChildrenEl = document.createElement('div');
    fileChildrenEl.className = `tree-children ${isFileOpen ? 'open' : ''}`;

    const arrow = fileNodeEl.querySelector('.tree-arrow');
    if (arrow) {
      arrow.onclick = (e) => {
        e.stopPropagation();
        fileChildrenEl.classList.toggle('open');
        arrow.classList.toggle('open');
      };
    }

    fileNodeEl.onclick = () => {
      selectTreeNode(fileNodeEl);
      if (isUnindexed) {
        openUnindexedFileDrawer(fileNode);
      } else {
        highlightScope('file', { project: projName, file_path: cleanFilePath, node: fileNode, symbols: symList });
        openDrawer(fileNode);
        if (fileNode.x !== undefined) focusOnNode(fileNode);
      }
    };

    if (selectedKey === fileKey) {
      selectTreeNode(fileNodeEl);
    }

    // Render Symbols nested under their parents (method under class),
    // collapsible; dot + tag colors follow the 3D legend (KIND_COLORS).
    if (!isUnindexed) {
      const nest = treeNestSymbols(symList);
      const renderTreeSym = (s, parentEl) => {
        const symNodeEl = document.createElement('div');
        symNodeEl.className = 'tree-node';
        symNodeEl.setAttribute('data-tree-node-id', s.id);
        const color = KIND_COLORS[s.kind] || '#58a6ff';
        const kids = nest.childrenOf.get(s.id) || [];
        symNodeEl.innerHTML = `
          <span class="tree-arrow" style="${kids.length ? '' : 'visibility:hidden;'}">▸</span>
          <span style="width:8px; height:8px; border-radius:50%; background:${color}; display:inline-block; flex:none;"></span>
          <span style="font-size:11px;">${s.name}</span>
          <span class="node-kind-tag" style="color:${color}; border:1px solid ${color}55; background:${color}14;">${s.kind}</span>
        `;
        const childBox = document.createElement('div');
        childBox.className = 'tree-children open';
        for (const k of kids) renderTreeSym(k, childBox);
        const arrow = symNodeEl.querySelector('.tree-arrow');
        if (arrow && kids.length) {
          arrow.onclick = (e) => {
            e.stopPropagation();
            childBox.classList.toggle('open');
            arrow.classList.toggle('open');
          };
        }
        symNodeEl.onclick = (e) => {
          e.stopPropagation();
          selectTreeNode(symNodeEl);
          openDrawer(s);
          ensureChatNodeVisible(s.id, s.project).then((n) => {
            const target = (n && n._viaAncestor) ? n : (n || s);
            highlightScope('node', target);
            focusOnNode(target);
            if (n && n._viaAncestor) {
              showToast(t('chat_show_parent', { name: n.name || n.id, kind: n.kind || '' }));
            }
          }).catch(() => {
            highlightScope('node', s);
            focusOnNode(s);
          });
        };
        if (selectedKey === s.id) {
          selectTreeNode(symNodeEl);
        }
        parentEl.appendChild(symNodeEl);
        if (kids.length) parentEl.appendChild(childBox);
      };
      for (const s of nest.roots) renderTreeSym(s, fileChildrenEl);
    }

    parentEl.appendChild(fileNodeEl);
    if (!isUnindexed) {
      parentEl.appendChild(fileChildrenEl);
    }
  });
}

function selectTreeNode(el) {
  if (selectedTreeNodeEl) selectedTreeNodeEl.classList.remove('selected');
  selectedTreeNodeEl = el;
  if (selectedTreeNodeEl) selectedTreeNodeEl.classList.add('selected');
}

// Synchronize 3D point selection with Explorer Tree: Auto-Open panel, Expand all parent folders & Scroll into center
function syncExplorerSelection(node) {
  if (!node) return;

  // 1. Ensure Explorer panel is open
  const panel = document.getElementById('tree-panel');
  const toggleBtn = document.getElementById('btn-toggle-tree');
  if (panel.classList.contains('collapsed')) {
    panel.classList.remove('collapsed');
    toggleBtn.classList.add('active');
  }

  // 2. Locate matching element in Explorer tree
  let targetEl = null;
  if (node.id) {
    targetEl = document.querySelector(`[data-tree-node-id="${CSS.escape(node.id)}"]`);
  }
  if (!targetEl && node.file_path && node.project) {
    const rawPath = node.file_path.split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
    targetEl = document.querySelector(`[data-tree-file="${CSS.escape(node.project + ':' + rawPath)}"]`);
  }
  if (!targetEl && node.project) {
    targetEl = document.querySelector(`[data-tree-proj="${CSS.escape(node.project)}"]`);
  }

  if (!targetEl) return;

  // 3. Expand all parent tree-children & rotate their arrows
  let curr = targetEl.parentElement;
  while (curr && curr.id !== 'tree-container') {
    if (curr.classList.contains('tree-children')) {
      curr.classList.add('open');
      const prev = curr.previousElementSibling;
      if (prev && prev.classList.contains('tree-node')) {
        const arrow = prev.querySelector('.tree-arrow');
        if (arrow) arrow.classList.add('open');
      }
    }
    curr = curr.parentElement;
  }

  // 4. Highlight & selected state
  selectTreeNode(targetEl);

  // 5. Smooth scroll into center of Explorer container
  setTimeout(() => {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 40);
}

function highlightScope(scopeType, targetObj) {
  highlightNodes.clear();
  highlightLinks.clear();

  const rawLinks = rawData.links || [];

  if (scopeType === 'project') {
    rawData.nodes.filter(n => n.project === targetObj.name).forEach(n => highlightNodes.add(n.id));
    rawLinks.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (highlightNodes.has(sId) || highlightNodes.has(tId)) {
        highlightLinks.add(l);
      }
    });
    if (Graph) Graph.zoomToFit(600, 40);
  }
  else if (scopeType === 'dir') {
    const dirPrefix = targetObj.dir_path.split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
    rawData.nodes.filter(n => {
      if (n.project !== targetObj.project) return false;
      const f = (n.file_path || '').split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
      return f.startsWith(dirPrefix);
    }).forEach(n => highlightNodes.add(n.id));

    rawLinks.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (highlightNodes.has(sId) || highlightNodes.has(tId)) {
        highlightLinks.add(l);
      }
    });
    if (Graph) Graph.zoomToFit(600, 40);
  }
  else if (scopeType === 'file') {
    const symList = targetObj.symbols || [];
    symList.forEach(s => highlightNodes.add(s.id));
    if (targetObj.node) highlightNodes.add(targetObj.node.id);

    rawLinks.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (highlightNodes.has(sId) || highlightNodes.has(tId)) {
        highlightLinks.add(l);
        highlightNodes.add(sId);
        highlightNodes.add(tId);
      }
    });
    if (targetObj.node && targetObj.node.x !== undefined) focusOnNode(targetObj.node);
  }
  else if (scopeType === 'node') {
    const node = targetObj;
    highlightNodes.add(node.id);

    rawLinks.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sId === node.id) {
        highlightLinks.add(l);
        highlightNodes.add(tId);
      } else if (tId === node.id) {
        highlightLinks.add(l);
        highlightNodes.add(sId);
      }
    });
  }

  // Refresh 3D colors & particle properties
  if (Graph) {
    Graph.nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }
}

function clearHighlight() {
  highlightNodes.clear();
  highlightLinks.clear();
  selectTreeNode(null);
  showFocusLabelNode(null);

  if (Graph) {
    Graph.nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }
}

function filterTree(query) {
  const q = (query || '').toLowerCase().trim();
  const nodes = document.querySelectorAll('#tree-container .tree-node');
  nodes.forEach(n => {
    if (!q) {
      n.style.display = 'flex';
      return;
    }
    const text = n.innerText.toLowerCase();
    n.style.display = text.includes(q) ? 'flex' : 'none';
  });
}

// ==========================================
// Legends & Filtering with LOD Mode Synergy
// ==========================================
const LOD_PRESETS = {
  'arch': {
    hiddenKinds: ['function', 'import', 'variable'],
    hiddenEdgeKinds: []
  },
  'standard': {
    hiddenKinds: ['import', 'variable'],
    hiddenEdgeKinds: []
  },
  'all': {
    hiddenKinds: [],
    hiddenEdgeKinds: []
  }
};

function initLODAndFilters() {
  currentLOD = localStorage.getItem('codegraph_lod_mode') || 'arch';
  if (currentLOD in LOD_PRESETS) {
    hiddenKinds = new Set(LOD_PRESETS[currentLOD].hiddenKinds);
    hiddenEdgeKinds = new Set(LOD_PRESETS[currentLOD].hiddenEdgeKinds);
  } else if (currentLOD === 'custom') {
    try {
      const savedHidden = localStorage.getItem('codegraph_custom_hidden_kinds');
      const savedEdgeHidden = localStorage.getItem('codegraph_custom_hidden_edge_kinds');
      hiddenKinds = savedHidden ? new Set(JSON.parse(savedHidden)) : new Set(LOD_PRESETS['arch'].hiddenKinds);
      hiddenEdgeKinds = savedEdgeHidden ? new Set(JSON.parse(savedEdgeHidden)) : new Set();
    } catch(e) {
      hiddenKinds = new Set(LOD_PRESETS['arch'].hiddenKinds);
      hiddenEdgeKinds = new Set();
    }
  } else {
    currentLOD = 'arch';
    hiddenKinds = new Set(LOD_PRESETS['arch'].hiddenKinds);
    hiddenEdgeKinds = new Set();
  }

  document.querySelectorAll('.lod-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lod === currentLOD);
  });
  updateLegendUI();
}

function updateLegendUI() {
  document.querySelectorAll('#legend-nodes-list .legend-item').forEach(el => {
    const kind = el.dataset.kind;
    if (kind) {
      el.classList.toggle('dimmed', hiddenKinds.has(kind));
    }
  });
  document.querySelectorAll('#legend-edges-list .legend-item').forEach(el => {
    const kind = el.dataset.kind;
    if (kind) {
      el.classList.toggle('dimmed', hiddenEdgeKinds.has(kind));
    }
  });
}

function switchLegendTab(tab) {
  document.getElementById('tab-btn-nodes').classList.toggle('active', tab === 'nodes');
  document.getElementById('tab-btn-edges').classList.toggle('active', tab === 'edges');
  document.getElementById('legend-nodes-list').style.display = tab === 'nodes' ? 'flex' : 'none';
  document.getElementById('legend-edges-list').style.display = tab === 'edges' ? 'flex' : 'none';
}

function buildLegends() {
  const nodesList = document.getElementById('legend-nodes-list');
  nodesList.innerHTML = '';
  const nodeKinds = [
    { kind: 'file', labelKey: 'kind_file' },
    { kind: 'class', labelKey: 'kind_class' },
    { kind: 'function', labelKey: 'kind_function' },
    { kind: 'import', labelKey: 'kind_import' },
    { kind: 'variable', labelKey: 'kind_variable' }
  ];

  nodeKinds.forEach(item => {
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.dataset.kind = item.kind;
    el.classList.toggle('dimmed', hiddenKinds.has(item.kind));
    el.innerHTML = `
      <div class="legend-dot" style="background:${KIND_COLORS[item.kind] || '#58a6ff'};"></div>
      <span>${t(item.labelKey)}</span>
    `;
    el.onclick = () => {
      if (hiddenKinds.has(item.kind)) {
        hiddenKinds.delete(item.kind);
      } else {
        hiddenKinds.add(item.kind);
      }

      // Switch to custom mode
      currentLOD = 'custom';
      localStorage.setItem('codegraph_lod_mode', 'custom');
      localStorage.setItem('codegraph_custom_hidden_kinds', JSON.stringify(Array.from(hiddenKinds)));
      localStorage.setItem('codegraph_custom_hidden_edge_kinds', JSON.stringify(Array.from(hiddenEdgeKinds)));

      document.querySelectorAll('.lod-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lod === 'custom');
      });

      updateLegendUI();

      // Check if full dataset reload is needed from backend
      const hasImports = (rawData.nodes || []).some(n => n.kind === 'import');
      const hasVars = (rawData.nodes || []).some(n => n.kind === 'variable');
      const hasFuncs = (rawData.nodes || []).some(n => n.kind === 'function' || n.kind === 'method');
      if ((!hiddenKinds.has('import') && !hasImports) || (!hiddenKinds.has('variable') && !hasVars) || (!hiddenKinds.has('function') && !hasFuncs)) {
        loadRootGraph();
      } else {
        applyFilter();
      }
    };
    nodesList.appendChild(el);
  });

  const edgesList = document.getElementById('legend-edges-list');
  edgesList.innerHTML = '';
  const edgeKinds = [
    { kind: 'calls', labelKey: 'edge_calls' },
    { kind: 'contains', labelKey: 'edge_contains' },
    { kind: 'extends', labelKey: 'edge_extends' },
    { kind: 'instantiates', labelKey: 'edge_instantiates' },
    { kind: 'imports', labelKey: 'edge_imports' },
    { kind: 'references', labelKey: 'edge_references' }
  ];

  edgeKinds.forEach(item => {
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.dataset.kind = item.kind;
    el.classList.toggle('dimmed', hiddenEdgeKinds.has(item.kind));
    el.innerHTML = `
      <div class="legend-line" style="background:${EDGE_COLORS[item.kind] || '#58a6ff'};"></div>
      <span>${t(item.labelKey)}</span>
    `;
    el.onclick = () => {
      if (hiddenEdgeKinds.has(item.kind)) {
        hiddenEdgeKinds.delete(item.kind);
      } else {
        hiddenEdgeKinds.add(item.kind);
      }

      // Switch to custom mode
      currentLOD = 'custom';
      localStorage.setItem('codegraph_lod_mode', 'custom');
      localStorage.setItem('codegraph_custom_hidden_kinds', JSON.stringify(Array.from(hiddenKinds)));
      localStorage.setItem('codegraph_custom_hidden_edge_kinds', JSON.stringify(Array.from(hiddenEdgeKinds)));

      document.querySelectorAll('.lod-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lod === 'custom');
      });

      updateLegendUI();
      applyFilter();
    };
    edgesList.appendChild(el);
  });
}

function getRelatedKinds(group) {
  if (group === 'class') return ['class', 'interface', 'type_alias'];
  if (group === 'function') return ['function', 'method', 'route'];
  if (group === 'file') return ['file', 'namespace'];
  if (group === 'variable') return ['variable', 'field', 'constant', 'property'];
  return [group];
}

function resetFilters() {
  currentLOD = 'all';
  localStorage.setItem('codegraph_lod_mode', 'all');
  hiddenKinds.clear();
  hiddenEdgeKinds.clear();
  localStorage.setItem('codegraph_custom_hidden_kinds', JSON.stringify([]));
  localStorage.setItem('codegraph_custom_hidden_edge_kinds', JSON.stringify([]));
  
  document.querySelectorAll('.lod-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lod === 'all');
  });
  
  updateLegendUI();
  loadRootGraph();
}

function applyFilter(isInitial = false) {
  const activeHiddenKinds = new Set();
  hiddenKinds.forEach(k => {
    getRelatedKinds(k).forEach(subk => activeHiddenKinds.add(subk));
  });

  const filteredNodes = rawData.nodes.filter(n => !activeHiddenKinds.has(n.kind));
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  
  // Stable Physics: Smoothly preserve existing 3D node coordinates with zero velocity impulse
  if (Graph) {
    const prevData = Graph.graphData();
    if (prevData && prevData.nodes) {
      const posMap = new Map();
      prevData.nodes.forEach(n => {
        if (n && n.id !== undefined && n.x !== undefined) {
          posMap.set(n.id, { x: n.x, y: n.y, z: n.z });
        }
      });
      filteredNodes.forEach(n => {
        const prev = posMap.get(n.id);
        if (prev) {
          n.x = prev.x;
          n.y = prev.y;
          n.z = prev.z;
          n.vx = 0;
          n.vy = 0;
          n.vz = 0;
        }
      });
    }
  }

  // Update activeNode to point to the newly instantiated node object
  if (activeNode) {
    const matching = filteredNodes.find(n => n.id === activeNode.id || (n.project === activeNode.project && n.file_path === activeNode.file_path && n.name === activeNode.name));
    if (matching) {
      activeNode = matching;
    }
  }

  const rawLinks = rawData.links || [];
  const filteredLinks = rawLinks.filter(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    return nodeIds.has(s) && nodeIds.has(t) && !hiddenEdgeKinds.has(l.kind);
  });

  // Snapshot Exact Camera & Orbit Target to guarantee Zero Drift
  let camPos = null;
  let camTarget = null;
  if (Graph && typeof Graph.camera === 'function') {
    const cam = Graph.camera();
    if (cam && cam.position) {
      camPos = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    }
    const ctrl = typeof Graph.controls === 'function' ? Graph.controls() : null;
    if (ctrl && ctrl.target) {
      camTarget = { x: ctrl.target.x, y: ctrl.target.y, z: ctrl.target.z };
    }
  }

  currentData = { nodes: filteredNodes, links: filteredLinks };
  if (Graph) {
    Graph.graphData(currentData);

    // Freeze camera in place across sync
    if (camPos && !isInitial) {
      const cam = Graph.camera();
      if (cam) cam.position.set(camPos.x, camPos.y, camPos.z);
      const ctrl = typeof Graph.controls === 'function' ? Graph.controls() : null;
      if (ctrl && camTarget) {
        ctrl.target.set(camTarget.x, camTarget.y, camTarget.z);
        ctrl.update();
      }
    }

    if (isInitial) {
      setTimeout(() => {
        if (currentData.nodes.length > 0) {
          Graph.zoomToFit(600, 40);
        }
      }, 250);
    }
  }

  document.getElementById('stats-nodes').innerText = `${filteredNodes.length} ${t('nodes_unit')}`;
  document.getElementById('stats-edges').innerText = `${filteredLinks.length} ${t('edges_unit')}`;

  // Re-apply highlight if active
  if (highlightNodes.size > 0 || highlightLinks.size > 0) {
    Graph.nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }
}

function changeLOD(mode) {
  currentLOD = mode;
  localStorage.setItem('codegraph_lod_mode', mode);

  document.querySelectorAll('.lod-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lod === mode);
  });

  if (mode in LOD_PRESETS) {
    hiddenKinds = new Set(LOD_PRESETS[mode].hiddenKinds);
    hiddenEdgeKinds = new Set(LOD_PRESETS[mode].hiddenEdgeKinds);
  } else if (mode === 'custom') {
    try {
      const savedHidden = localStorage.getItem('codegraph_custom_hidden_kinds');
      const savedEdgeHidden = localStorage.getItem('codegraph_custom_hidden_edge_kinds');
      if (savedHidden) hiddenKinds = new Set(JSON.parse(savedHidden));
      if (savedEdgeHidden) hiddenEdgeKinds = new Set(JSON.parse(savedEdgeHidden));
    } catch(e) {}
  }

  updateLegendUI();
  loadRootGraph();
}

function focusOnNode(node) {
  if (!node || node.x === undefined) return;
  const distance = 80;
  const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
  Graph.cameraPosition(
    { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
    { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
    1200
  );
  showFocusLabelNode(node);
  if (node && node.id) lightFullChain(node, ++focusChainToken);
}

// Open Inspector for Nodes/Files
function openDrawer(node) {
  activeNode = node;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('d-name').innerText = node.name || 'Unnamed';
  document.getElementById('d-sub').innerText = `${node.project || ''} · ${node.file_path || ''}`;
  
  const badge = document.getElementById('d-kind-badge');
  badge.innerText = (node.kind || 'NODE').toUpperCase();
  badge.style.background = KIND_COLORS[node.kind] || '#1f6feb';
  badge.style.color = '#fff';

  const absPath = node.abs_path || (node.file_path ? `${node.project_path || ''}/${node.file_path}` : '');
  const startLine = node.start_line || 1;
  const endLine = node.end_line || (node.kind === 'file' ? 1000 : startLine);

  const encodedPath = encodeURIComponent(absPath.split(String.fromCharCode(92)).join('/'));
  document.getElementById('ide-antigravity').href = `vscode://file/${encodedPath}:${startLine}`;
  document.getElementById('ide-vscode').href = `vscode://file/${encodedPath}:${startLine}`;
  document.getElementById('ide-cursor').href = `cursor://file/${encodedPath}:${startLine}`;
  document.getElementById('ide-pycharm').href = `pycharm://open?file=${encodedPath}&line=${startLine}`;

  document.getElementById('code-lines-badge').innerText = `Line ${startLine} - ${endLine}`;
  document.getElementById('d-code').innerText = t('drawer_loading_code');

  const codeContainer = document.getElementById('d-code');
  if (node.file_path && node.project) {
    fetch(`/api/code?project=${encodeURIComponent(node.project)}&file_path=${encodeURIComponent(node.file_path)}&start_line=${startLine}&end_line=${endLine}`)
      .then(res => res.json())
      .then(data => {
        if (data.code) {
          renderHighlightedCode(data.code, node.project, codeContainer);
        } else {
          codeContainer.innerHTML = '<span style="color:#6e7681;">// Source snippet unavailable</span>';
        }
      })
      .catch((err) => {
        codeContainer.innerHTML = `<span style="color:#f85149;">// Error reading source file: ${escapeHtml(err.message || '')}</span>`;
      });
  } else {
    codeContainer.innerHTML = '<span style="color:#6e7681;">// Virtual or external symbol</span>';
  }

  // Relations
  const rawLinks = rawData.links || [];
  const inLinks = rawLinks.filter(l => {
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return targetId === node.id;
  });
  const outLinks = rawLinks.filter(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    return sourceId === node.id;
  });

  document.getElementById('in-degree-count').innerText = inLinks.length;
  document.getElementById('out-degree-count').innerText = outLinks.length;

  const inList = document.getElementById('in-degree-list');
  inList.innerHTML = '';
  inLinks.slice(0, 20).forEach(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const sourceNode = rawData.nodes.find(n => n.id === sourceId);
    if (sourceNode) {
      const item = document.createElement('div');
      item.className = 'relation-item';
      item.innerHTML = `<span>${sourceNode.name}</span><span style="color:#8b949e; font-size:10px;">${l.kind}</span>`;
      item.onclick = () => { focusOnNode(sourceNode); openDrawer(sourceNode); highlightScope('node', sourceNode); syncExplorerSelection(sourceNode); };
      inList.appendChild(item);
    }
  });

  const outList = document.getElementById('out-degree-list');
  outList.innerHTML = '';
  outLinks.slice(0, 20).forEach(l => {
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    const targetNode = rawData.nodes.find(n => n.id === targetId);
    if (targetNode) {
      const item = document.createElement('div');
      item.className = 'relation-item';
      item.innerHTML = `<span>${targetNode.name}</span><span style="color:#8b949e; font-size:10px;">${l.kind}</span>`;
      item.onclick = () => { focusOnNode(targetNode); openDrawer(targetNode); highlightScope('node', targetNode); syncExplorerSelection(targetNode); };
      outList.appendChild(item);
    }
  });
}

function openUnindexedFileDrawer(node) {
  activeNode = node;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('d-name').innerText = node.name;
  document.getElementById('d-sub').innerText = `${node.project} · ${node.file_path} [UNINDEXED]`;
  
  const badge = document.getElementById('d-kind-badge');
  badge.innerText = 'UNINDEXED';
  badge.style.background = KIND_COLORS.unindexed_file;
  badge.style.color = '#fff';

  const absPath = node.abs_path || (node.file_path ? `${node.project_path || ''}/${node.file_path}` : '');
  const encodedPath = encodeURIComponent(absPath.split(String.fromCharCode(92)).join('/'));
  document.getElementById('ide-antigravity').href = `vscode://file/${encodedPath}:1`;
  document.getElementById('ide-vscode').href = `vscode://file/${encodedPath}:1`;
  document.getElementById('ide-cursor').href = `cursor://file/${encodedPath}:1`;
  document.getElementById('ide-pycharm').href = `pycharm://open?file=${encodedPath}&line=1`;

  document.getElementById('code-lines-badge').innerText = 'Physical File (Unindexed)';
  document.getElementById('d-code').innerText = t('drawer_loading_code');

  fetch(`/api/code?project=${encodeURIComponent(node.project)}&file_path=${encodeURIComponent(node.file_path)}&start_line=1&end_line=2000`)
    .then(res => res.json())
    .then(data => {
      renderHighlightedCode(data.code, node.project, document.getElementById('d-code'));
    })
    .catch(() => {
      document.getElementById('d-code').innerText = '// Error reading physical file';
    });

  document.getElementById('in-degree-count').innerText = '0';
  document.getElementById('out-degree-count').innerText = '0';
  document.getElementById('in-degree-list').innerHTML = '<div style="font-size:10px; color:#8b949e; padding:4px;">No AST relationships extracted yet.</div>';
  document.getElementById('out-degree-list').innerHTML = '<div style="font-size:10px; color:#8b949e; padding:4px;">No AST relationships extracted yet.</div>';
}

function openDirDrawer(projName, dirPath, dirObj) {
  activeNode = {
    name: dirPath.split('/').pop(),
    kind: 'directory',
    project: projName,
    file_path: dirPath
  };
  document.getElementById('drawer').classList.add('open');
  document.getElementById('d-name').innerText = activeNode.name;
  document.getElementById('d-sub').innerText = `${projName} · ${dirPath}`;
  
  const badge = document.getElementById('d-kind-badge');
  badge.innerText = 'DIRECTORY';
  badge.style.background = KIND_COLORS.directory;
  badge.style.color = '#fff';

  document.getElementById('code-lines-badge').innerText = 'Directory Scope';
  
  const dirPrefix = dirPath.split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
  const containedNodes = rawData.nodes.filter(n => {
    if (n.project !== projName) return false;
    const f = (n.file_path || '').split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
    return f.startsWith(dirPrefix);
  });

  document.getElementById('d-code').innerText = `// Directory Overview\n// Project: ${projName}\n// Path: ${dirPath}\n// Total Contained Entities: ${containedNodes.length}\n// Files in directory:\n` +
    Object.keys(dirObj.files || {}).map(f => ` - ${f}`).join('\n');

  document.getElementById('in-degree-count').innerText = '0';
  document.getElementById('out-degree-count').innerText = containedNodes.length;
  document.getElementById('in-degree-list').innerHTML = '';
  
  const outList = document.getElementById('out-degree-list');
  outList.innerHTML = '';
  containedNodes.slice(0, 20).forEach(n => {
    const item = document.createElement('div');
    item.className = 'relation-item';
    item.innerHTML = `<span>${n.name}</span><span style="color:#8b949e; font-size:10px;">${n.kind}</span>`;
    item.onclick = () => { focusOnNode(n); openDrawer(n); highlightScope('node', n); syncExplorerSelection(n); };
    outList.appendChild(item);
  });
}

function openProjectDrawer(projName, projObj) {
  activeNode = {
    name: projName,
    kind: 'project',
    project: projName,
    file_path: ''
  };
  document.getElementById('drawer').classList.add('open');
  document.getElementById('d-name').innerText = projName;
  document.getElementById('d-sub').innerText = `Project Repository · ${projObj ? projObj.path : ''}`;
  
  const badge = document.getElementById('d-kind-badge');
  badge.innerText = 'PROJECT';
  badge.style.background = KIND_COLORS.project;
  badge.style.color = '#fff';

  document.getElementById('code-lines-badge').innerText = 'Project Scope';
  
  const projNodes = rawData.nodes.filter(n => n.project === projName);
  const pendingCount = projObj && projObj.pending_sync_count ? projObj.pending_sync_count : 0;
  
  document.getElementById('d-code').innerText = `// Project Repository Overview\n// Name: ${projName}\n// Directory: ${projObj ? projObj.path : 'N/A'}\n// Total Loaded Nodes: ${projNodes.length}\n// Pending Sync Files: ${pendingCount}\n\n// Tip: Click the pending badge to review and index unindexed files on disk.`;

  document.getElementById('in-degree-count').innerText = '0';
  document.getElementById('out-degree-count').innerText = projNodes.length;
  document.getElementById('in-degree-list').innerHTML = '';
  
  const outList = document.getElementById('out-degree-list');
  outList.innerHTML = '';
  projNodes.slice(0, 25).forEach(n => {
    const item = document.createElement('div');
    item.className = 'relation-item';
    item.innerHTML = `<span>${n.name}</span><span style="color:#8b949e; font-size:10px;">${n.kind}</span>`;
    item.onclick = () => { focusOnNode(n); openDrawer(n); highlightScope('node', n); syncExplorerSelection(n); };
    outList.appendChild(item);
  });
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  activeNode = null;
}

function copyAbsPath() {
  if (!activeNode) return;
  const path = activeNode.abs_path || activeNode.file_path || '';
  navigator.clipboard.writeText(path).then(() => {
    showToast(t('toast_path_copied'));
  });
}

function copyAiPrompt() {
  if (!activeNode) return;
  const prompt = `Symbol: ${activeNode.name} (${activeNode.kind})\nProject: ${activeNode.project}\nFile: ${activeNode.abs_path || activeNode.file_path}\nLines: ${activeNode.start_line || 1}-${activeNode.end_line || activeNode.start_line || 1}`;
  navigator.clipboard.writeText(prompt).then(() => {
    showToast(t('toast_prompt_copied'));
  });
}

function showToast(msg) {
  const tEl = document.getElementById('toast');
  tEl.innerText = msg;
  tEl.style.display = 'block';
  setTimeout(() => { tEl.style.display = 'none'; }, 2200);
}

// ==========================================
// Drag-to-Resize for Explorer & Inspector
// ==========================================

// ==========================================
// Draggable Legend Panel
// ==========================================
function initDraggableLegend() {
  const panel = document.getElementById('legend-panel');
  const handle = document.getElementById('legend-drag-handle') || panel;
  if (!panel || !handle) return;

  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  // Restore saved position if any
  try {
    const savedPos = localStorage.getItem('codegraph_legend_pos');
    if (savedPos) {
      const pos = JSON.parse(savedPos);
      if (typeof pos.left === 'number' && typeof pos.top === 'number') {
        const maxL = window.innerWidth - panel.offsetWidth - 10;
        const maxT = window.innerHeight - panel.offsetHeight - 10;
        const safeL = Math.max(10, Math.min(maxL, pos.left));
        const safeT = Math.max(50, Math.min(maxT, pos.top));
        panel.style.left = safeL + 'px';
        panel.style.top = safeT + 'px';
        panel.style.bottom = 'auto';
        panel.style.transition = 'none';
        panel.dataset.customPos = 'true';
      }
    }
  } catch(e) {}

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.lod-btn') || e.target.tagName === 'BUTTON') return;
    
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;
    panel.style.transition = 'none';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    const maxLeft = window.innerWidth - panel.offsetWidth - 10;
    const maxTop = window.innerHeight - panel.offsetHeight - 10;
    newLeft = Math.max(10, Math.min(maxLeft, newLeft));
    newTop = Math.max(50, Math.min(maxTop, newTop));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
    panel.dataset.customPos = 'true';
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.style.cursor = '';
      document.body.style.userSelect = '';
      const rect = panel.getBoundingClientRect();
      localStorage.setItem('codegraph_legend_pos', JSON.stringify({
        left: rect.left,
        top: rect.top
      }));
    }
  });
}

function initPanelResizers() {
  // 1. Explorer Resizer (Left Panel)
  const treePanel = document.getElementById('tree-panel');
  const treeResizer = document.getElementById('tree-resizer');
  const breadcrumbEl = document.getElementById('breadcrumb');
  const legendPanelEl = document.getElementById('legend-panel');

  let isDraggingTree = false;

  treeResizer.addEventListener('mousedown', (e) => {
    isDraggingTree = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  // 2. Inspector Resizer (Right Drawer)
  const drawer = document.getElementById('drawer');
  const drawerResizer = document.getElementById('drawer-resizer');
  let isDraggingDrawer = false;

  drawerResizer.addEventListener('mousedown', (e) => {
    isDraggingDrawer = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingTree) {
      const newWidth = Math.max(200, Math.min(650, e.clientX));
      treePanel.style.width = newWidth + 'px';
      breadcrumbEl.style.left = (newWidth + 16) + 'px';
      if (!legendPanelEl.dataset.customPos) { legendPanelEl.style.left = (newWidth + 16) + 'px'; }
    } else if (isDraggingDrawer) {
      const newWidth = Math.max(320, Math.min(950, window.innerWidth - e.clientX));
      drawer.style.width = newWidth + 'px';
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingTree || isDraggingDrawer) {
      isDraggingTree = false;
      isDraggingDrawer = false;
      document.body.style.cursor = 'default';
    }
  });
}

// ==========================================
// Project Management & Explorer Lifecycle
// ==========================================
function loadProjects(isSilent = false) {
  return fetch('/api/projects')
    .then(res => res.json())
    .then(projects => {
      allProjectsList = projects;
      const readyProjects = projects.filter(p => p.status === 'ready');
      
      if (selectedProjects.size === 0 && readyProjects.length > 0) {
        if (readyProjects.length <= 3) {
          readyProjects.forEach(p => selectedProjects.add(p.name));
        } else {
          const pref = readyProjects.find(p => p.name === 'RDLib') || readyProjects[0];
          selectedProjects.add(pref.name);
          const second = readyProjects.find(p => p.name === 'DeployGate' || p.name === 'RevenueApp');
          if (second) selectedProjects.add(second.name);
        }
      }
      
      loadRootGraph(isSilent);
    });
}

function refreshOpenDrawerCode() {
  if (!activeNode || !activeNode.file_path || !activeNode.project) return;
  const startLine = activeNode.start_line || 1;
  const endLine = activeNode.end_line || 1000;
  fetch(`/api/code?project=${encodeURIComponent(activeNode.project)}&file_path=${encodeURIComponent(activeNode.file_path)}&start_line=${startLine}&end_line=${endLine}`)
    .then(res => res.json())
    .then(data => {
      if (data.code && document.getElementById('d-code')) {
        renderHighlightedCode(data.code, activeNode.project, document.getElementById('d-code'));
      }
    }).catch(() => {});
}

function selectAllProjects(select) {
  const readyProjects = allProjectsList.filter(p => p.status === 'ready');
  if (select) {
    readyProjects.forEach(p => selectedProjects.add(p.name));
  } else {
    selectedProjects.clear();
  }
  loadRootGraph();
}

function loadRootGraph(isSilent = false) {
  if (selectedProjects.size === 0) {
    rawData = { nodes: [], links: [], unindexed_by_project: {} };
    applyFilter(false);
    loadTreeData();
    return;
  }

  const projParam = Array.from(selectedProjects).join(',');
  const backendLOD = (currentLOD === 'custom' || currentLOD === 'all') ? 'all' : currentLOD;
  fetch(`/api/graph?projects=${encodeURIComponent(projParam)}&lod=${backendLOD}`)
    .then(res => res.json())
    .then(data => {
      const nodes = data.nodes || [];
      const links = data.links || data.edges || [];
      const unindexed_by_project = data.unindexed_by_project || {};
      
      rawData = { nodes, links, unindexed_by_project };
      applyFilter(!isSilent && !window._graphInitialized);
      window._graphInitialized = true;
      buildProjectTree();
      loadTreeData();

      // Quietly update inspector code if drawer is currently open
      if (activeNode && activeNode.project && activeNode.file_path) {
        refreshOpenDrawerCode();
      }
    });
}

function drillDown(node) {
  breadcrumb.push(node);
  updateBreadcrumb();
  
  const projParam = encodeURIComponent(node.project);
  fetch(`/api/graph?projects=${projParam}&lod=all&parent_id=${encodeURIComponent(node.id)}`)
    .then(res => res.json())
    .then(data => {
      rawData = { nodes: data.nodes || [], links: data.links || data.edges || [], unindexed_by_project: {} };
      applyFilter();
      buildProjectTree();
    });
}

function updateBreadcrumb() {
  const bcContainer = document.getElementById('breadcrumb');
  bcContainer.innerHTML = `<span class="bc-item" onclick="navigateTo(-1)">${t('bc_overview')}</span>`;
  breadcrumb.forEach((item, idx) => {
    const sep = document.createElement('span');
    sep.className = 'bc-sep';
    sep.innerText = '/';
    bcContainer.appendChild(sep);

    const span = document.createElement('span');
    span.className = 'bc-item';
    span.innerText = item.name;
    span.onclick = () => navigateTo(idx);
    bcContainer.appendChild(span);
  });
}

function navigateTo(idx) {
  if (idx === -1) {
    breadcrumb = [];
    updateBreadcrumb();
    loadRootGraph();
  } else {
    breadcrumb = breadcrumb.slice(0, idx + 1);
    updateBreadcrumb();
    drillDown(breadcrumb[breadcrumb.length - 1]);
  }
}

// ==========================================
// Table Column Resizing
// ==========================================
function initTableResizable() {
  const table = document.getElementById('manager-table');
  if (!table) return;
  const cols = table.querySelectorAll('th');
  cols.forEach((col, idx) => {
    if (idx === cols.length - 1) return;
    let resizer = col.querySelector('.col-resizer');
    if (!resizer) {
      resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      col.style.position = 'relative';
      col.appendChild(resizer);
    }
    let startX = 0, startW = 0;
    resizer.onmousedown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      startX = e.clientX;
      startW = col.offsetWidth;
      resizer.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev) => {
        const newW = Math.max(60, startW + (ev.clientX - startX));
        col.style.width = newW + 'px';
      };
      const onMouseUp = () => {
        resizer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };
  });
}

// Modal Management
function openPathModal() {
  setTimeout(initTableResizable, 50);
  document.getElementById('path-modal').classList.add('show');
  refreshCodegraphConn();
  loadManagerList();
}
function closePathModal() {
  document.getElementById('path-modal').classList.remove('show');
}

function loadManagerList() {
  fetch('/api/projects')
    .then(res => res.json())
    .then(projects => {
      allProjectsList = projects;
      const tbody = document.getElementById('manager-table-body');
      tbody.innerHTML = '';
      
      projects.forEach(p => {
        const isReady = p.status === 'ready';
        const tr = document.createElement('tr');
        const escapedPath = p.path.replace(/\\/g, '\\\\');
        
        tr.innerHTML = `
          <td style="font-weight:600; color:#58a6ff;">${p.name}</td>
          <td style="font-family:monospace; font-size:11px; color:#8b949e; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.path}">${p.path}</td>
          <td>${isReady ? `${p.nodes} / ${p.links || p.edges}` : '<span style="color:#8b949e;">--</span>'}</td>
          <td>
            <span class="status-tag ${isReady ? 'ready' : 'unindexed'}">
              ${isReady ? t('status_ready') : t('status_unindexed')}
            </span>
          </td>
          <td>
            <div class="action-btn-group">
              ${isReady ? `
                <button class="act-btn" onclick="syncSingleProject('${escapedPath}')">${t('act_sync')}</button>
                <button class="act-btn" onclick="reindexProject('${escapedPath}')">${t('act_reindex')}</button>
                <button class="act-btn danger" onclick="uninitProject('${escapedPath}', '${p.name}')">${t('act_uninit')}</button>
              ` : `
                <button class="act-btn green" onclick="initProject('${escapedPath}')">${t('act_init')}</button>
                <button class="act-btn danger" onclick="excludeProject('${escapedPath}', '${p.name}')">${t('act_exclude')}</button>
              `}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
}

function excludeProject(path, name) {
  const confirmMsg = t('confirm_exclude', { name });
  if (!confirm(confirmMsg)) return;

  fetch('/api/project/exclude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(t('toast_exclude_done'));
      selectedProjects.delete(name);
      loadProjects();
      loadManagerList();
    } else {
      alert('Failed to exclude project: ' + (res.error || ''));
    }
  });
}

function initProject(path) {
  fetch('/api/project/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(t('toast_init_done'));
      loadProjects();
      loadManagerList();
    } else {
      alert('Initialization failed: ' + (res.error || res.output));
    }
  });
}

function uninitProject(path, name) {
  const confirmMsg = t('confirm_uninit', { name });
  if (!confirm(confirmMsg)) return;
  
  fetch('/api/project/uninit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(t('toast_uninit_done'));
      selectedProjects.delete(name);
      loadProjects();
      loadManagerList();
    } else {
      alert('Uninitialization failed: ' + (res.error || res.output));
    }
  });
}

function reindexProject(path) {
  fetch('/api/project/reindex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(t('toast_reindex_done'));
      loadProjects();
    } else {
      alert('Reindex failed: ' + (res.error || res.output));
    }
  });
}

function syncSingleProject(path) {
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      showToast(t('toast_index_done'));
      loadProjects();
    } else {
      alert('Indexing failed: ' + (res.error || res.output));
    }
  });
}


async function browseDirectoryNative() {
  if (window.electronAPI && typeof window.electronAPI.openDirectoryDialog === 'function') {
    const selected = await window.electronAPI.openDirectoryDialog();
    if (selected) {
      document.getElementById('custom-path-input').value = selected;
    }
  }
}

function submitAddPath() {
  const input = document.getElementById('custom-path-input');
  const path = input.value.trim();
  if (!path) {
    alert(t('toast_input_path'));
    return;
  }
  
  fetch('/api/paths/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      input.value = '';
      loadProjects();
      loadManagerList();
    } else {
      alert('Failed to add path: ' + res.error);
    }
  });
}

// Search
document.getElementById('search-box').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  const resContainer = document.getElementById('search-results');
  if (!q) {
    resContainer.style.display = 'none';
    return;
  }

  const matches = rawData.nodes.filter(n => n.name.toLowerCase().includes(q)).slice(0, 20);
  if (matches.length === 0) {
    resContainer.style.display = 'none';
    return;
  }

  resContainer.innerHTML = '';
  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.innerHTML = `
      <span class="search-kind" style="color:${KIND_COLORS[m.kind] || '#58a6ff'}">${m.kind}</span>
      <span style="font-weight:500;">${m.name}</span>
      <span style="margin-left:auto; color:#8b949e; font-size:10px;">${m.project}</span>
    `;
    item.onclick = () => {
      resContainer.style.display = 'none';
      highlightScope('node', m);
      focusOnNode(m);
      openDrawer(m);
      syncExplorerSelection(m);
    };
    resContainer.appendChild(item);
  });
  resContainer.style.display = 'block';
});

// Auto Rotate
document.getElementById('btn-rotate').addEventListener('click', () => {
  isRotating = !isRotating;
  document.getElementById('btn-rotate').classList.toggle('highlight', isRotating);
  if (isRotating) {
    let angle = 0;
    const distance = 400;
    window._rotateTimer = setInterval(() => {
      if (!isRotating) { clearInterval(window._rotateTimer); return; }
      angle += Math.PI / 600;
      Graph.cameraPosition({
        x: distance * Math.sin(angle),
        z: distance * Math.cos(angle)
      });
    }, 20);
  } else {
    clearInterval(window._rotateTimer);
  }
});

// Reset Camera
document.getElementById('btn-reset-cam').addEventListener('click', () => {
  if (Graph) Graph.zoomToFit(600, 40);
});

// ==========================================
// Stable Incremental Sync Logic
// ==========================================
document.getElementById('btn-sync').addEventListener('click', () => {
  if (typeof codegraphConn !== 'undefined' && codegraphConn.level === 'down') {
    showToast(t('cg_conn_down'));
    return;
  }
  const btn = document.getElementById('btn-sync');
  btn.innerText = '⚡ Syncing...';
  btn.style.opacity = '0.7';
  
  fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then(res => res.json())
    .then(res => {
      showToast(t('toast_index_done'));
      loadProjects(true).finally(() => {
        btn.innerText = t('sync_btn');
        btn.style.opacity = '1';
      });
    })
    .catch(() => {
      btn.innerText = t('sync_btn');
      btn.style.opacity = '1';
    });
});

// ==================== CodeGraph CLI Connection Status ====================
// Pure mapper (no DOM): ok | warn | down. Kept side-effect free so it stays
// unit-testable outside the browser.
function codegraphConnState(s) {
  s = s || {};
  if (!s.available) return { level: 'down' };
  if (s.matches_pinned === false) {
    return { level: 'warn', version: s.version, pinned: s.pinned, source: s.source };
  }
  return { level: 'ok', version: s.version, pinned: s.pinned, source: s.source };
}

let codegraphConn = { level: 'unknown' };

function renderCodegraphConn() {
  const bar = document.getElementById('cg-conn-bar');
  if (!bar) return;
  const dot = document.getElementById('cg-conn-dot');
  const txt = document.getElementById('cg-conn-text');
  const st = (typeof codegraphConn !== 'undefined') ? codegraphConn : { level: 'unknown' };
  const colors = { ok: '#3fb950', warn: '#d29922', down: '#f85149', unknown: '#8b949e' };
  if (dot) dot.style.background = colors[st.level] || colors.unknown;
  if (txt) {
    if (st.level === 'unknown') {
      txt.textContent = t('cg_conn_checking');
    } else if (st.level === 'down') {
      txt.textContent = t('cg_conn_down');
    } else {
      const src = st.source === 'bundled' ? t('cg_src_bundled') : t('cg_src_system');
      const key = st.level === 'warn' ? 'cg_conn_mismatch' : 'cg_conn_ok';
      txt.textContent = t(key, { version: st.version || '?', pinned: st.pinned || '?', source: src });
    }
  }
  const btn = document.getElementById('btn-sync');
  if (btn) {
    const down = st.level === 'down';
    btn.style.opacity = down ? '0.4' : '';
    btn.title = down ? t('cg_sync_unavailable') : t('sync_tip');
  }
}

async function refreshCodegraphConn() {
  renderCodegraphConn();
  try {
    const res = await fetch('/api/codegraph');
    codegraphConn = codegraphConnState(await res.json());
  } catch (e) {
    codegraphConn = { level: 'down' };
  }
  renderCodegraphConn();
}

// ==================== Code Assistant Chat ====================
let chatBusy = false;
let chatHistory = [];

function chatTemplates() {
  return [
    { label: t('chat_tpl_entry'), prompt: t('chat_tpl_entry_p') },
    { label: t('chat_tpl_flow'), prompt: t('chat_tpl_flow_p') },
    { label: t('chat_tpl_explain'), prompt: t('chat_tpl_explain_p') },
    { label: t('chat_tpl_impact'), prompt: t('chat_tpl_impact_p') },
  ];
}

function renderChatLabels() {
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('lbl-btn-chat', t('chat_ask'));
  set('lbl-chat-title', t('chat_title'));
  set('lbl-chat-model', t('chat_model'));
  set('lbl-chat-project', t('chat_project'));
  const btn = document.getElementById('btn-chat');
  if (btn) btn.title = t('chat_tip');
  const inp = document.getElementById('chat-input');
  if (inp) inp.placeholder = t('chat_placeholder');
}

function chatSelectedModel() {
  try {
    const saved = JSON.parse(localStorage.getItem('galaxy-chat-model') || 'null');
    if (saved && saved.model) return saved;
  } catch (e) { /* ignore */ }
  const sel = document.getElementById('chat-model');
  if (sel && sel.value) {
    const idx = sel.value.indexOf(':');
    return { provider: sel.value.substring(0, idx), model: sel.value.substring(idx + 1) };
  }
  return {};
}

function loadChatModels() {
  const sel = document.getElementById('chat-model');
  if (!sel) return;
  sel.innerHTML = '';
  const loading = document.createElement('option');
  loading.textContent = t('chat_model_loading');
  sel.appendChild(loading);
  fetch('/api/chat/models')
    .then((res) => res.json())
    .then((data) => {
      sel.innerHTML = '';
      const current = (data && data.current) || {};
      for (const p of (data && data.providers) || []) {
        const group = document.createElement('optgroup');
        group.label = (p.available ? '' : '⚠️ ') + (p.label || p.id);
        for (const m of p.models || []) {
          const opt = document.createElement('option');
          opt.value = `${p.id}:${m}`;
          opt.textContent = m;
          group.appendChild(opt);
        }
        sel.appendChild(group);
      }
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('galaxy-chat-model') || 'null'); } catch (e) { /* ignore */ }
      const want = (saved && saved.model ? `${saved.provider || 'ollama'}:${saved.model}` : null)
        || `${current.provider || 'ollama'}:${current.model || ''}`;
      const match = Array.from(sel.options).find((o) => o.value === want)
        || Array.from(sel.options).find((o) => !o.disabled);
      if (match) sel.value = match.value;
    })
    .catch(() => {
      sel.innerHTML = '';
      const opt = document.createElement('option');
      opt.textContent = t('chat_model_unavailable');
      sel.appendChild(opt);
    });
  sel.onchange = () => {
    const idx = sel.value.indexOf(':');
    const pick = { provider: sel.value.substring(0, idx), model: sel.value.substring(idx + 1) };
    try { localStorage.setItem('galaxy-chat-model', JSON.stringify(pick)); } catch (e) { /* ignore */ }
    fetch('/api/chat/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pick),
    }).catch(() => { /* session default is best-effort */ });
  };
}

function chatCurrentProject() {
  try {
    return localStorage.getItem('galaxy-chat-project') || '';
  } catch (e) {
    return '';
  }
}

function setChatProject(name) {
  if (!name) return;
  try { localStorage.setItem('galaxy-chat-project', name); } catch (e) { /* ignore */ }
}

function renderChatScope() {
  const el = document.getElementById('chat-scope');
  if (!el) return;
  let names = [];
  try {
    names = Array.from(selectedProjects || []);
  } catch (e) { /* ignore */ }
  if (!names.length) {
    el.textContent = t('chat_scope_all');
    el.title = t('chat_scope_all');
  } else {
    el.textContent = names.join('、');
    el.title = names.join('、');
  }
}

function restoreChatPanelGeom() {
  try {
    const g = JSON.parse(localStorage.getItem('galaxy-chat-geom') || 'null');
    const panel = document.getElementById('chat-panel');
    if (!g || !panel) return;
    if (g.w > 200) panel.style.width = `${g.w}px`;
    if (g.h > 200) panel.style.height = `${g.h}px`;
    if (typeof g.x === 'number' && typeof g.y === 'number') {
      panel.style.left = `${g.x}px`;
      panel.style.top = `${g.y}px`;
      panel.style.right = 'auto';
    }
  } catch (e) { /* ignore */ }
}

function saveChatPanelGeom() {
  try {
    const panel = document.getElementById('chat-panel');
    if (!panel || panel.style.display === 'none') return;
    const r = panel.getBoundingClientRect();
    localStorage.setItem('galaxy-chat-geom', JSON.stringify({
      w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.left), y: Math.round(r.top),
    }));
  } catch (e) { /* ignore */ }
}

function initChatPanelDrag() {
  const panel = document.getElementById('chat-panel');
  const header = document.getElementById('chat-header');
  if (!panel || !header || header.dataset.dragBound) return;
  header.dataset.dragBound = '1';
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const r = panel.getBoundingClientRect();
    const baseX = r.left, baseY = r.top;
    panel.style.left = `${baseX}px`;
    panel.style.top = `${baseY}px`;
    panel.style.right = 'auto';
    const onMove = (ev) => {
      const nx = Math.min(Math.max(0, baseX + ev.clientX - startX), window.innerWidth - 120);
      const ny = Math.min(Math.max(0, baseY + ev.clientY - startY), window.innerHeight - 60);
      panel.style.left = `${nx}px`;
      panel.style.top = `${ny}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveChatPanelGeom();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  document.addEventListener('mouseup', () => {
    if (panel.style.display !== 'none') saveChatPanelGeom();
  });
  initChatPanelEdges(panel);
}

function initChatPanelEdges(panel) {
  if (!panel || panel.dataset.edgesBound) return;
  panel.dataset.edgesBound = '1';
  const zones = [
    { keys: 'n', cursor: 'ns-resize', css: 'top:-4px;left:10px;right:10px;height:8px;' },
    { keys: 's', cursor: 'ns-resize', css: 'bottom:-4px;left:10px;right:10px;height:8px;' },
    { keys: 'w', cursor: 'ew-resize', css: 'left:-4px;top:10px;bottom:10px;width:8px;' },
    { keys: 'e', cursor: 'ew-resize', css: 'right:-4px;top:10px;bottom:10px;width:8px;' },
    { keys: 'nw', cursor: 'nwse-resize', css: 'left:-5px;top:-5px;width:12px;height:12px;' },
    { keys: 'ne', cursor: 'nesw-resize', css: 'right:-5px;top:-5px;width:12px;height:12px;' },
    { keys: 'sw', cursor: 'nesw-resize', css: 'left:-5px;bottom:-5px;width:12px;height:12px;' },
    { keys: 'se', cursor: 'nwse-resize', css: 'right:-5px;bottom:-5px;width:12px;height:12px;' },
  ];
  for (const z of zones) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;${z.css}cursor:${z.cursor};z-index:5;`;
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX, startY = e.clientY;
      const r = panel.getBoundingClientRect();
      const base = { l: r.left, t: r.top, w: r.width, h: r.height };
      panel.style.left = `${base.l}px`;
      panel.style.top = `${base.t}px`;
      panel.style.right = 'auto';
      panel.style.width = `${base.w}px`;
      panel.style.height = `${base.h}px`;
      const onMove = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        let l = base.l, t = base.t, w = base.w, h = base.h;
        if (z.keys.includes('e')) w = base.w + dx;
        if (z.keys.includes('s')) h = base.h + dy;
        if (z.keys.includes('w')) { w = base.w - dx; l = base.l + dx; }
        if (z.keys.includes('n')) { h = base.h - dy; t = base.t + dy; }
        if (w < 280) { if (z.keys.includes('w')) l -= 280 - w; w = 280; }
        if (h < 300) { if (z.keys.includes('n')) t -= 300 - h; h = 300; }
        w = Math.min(w, window.innerWidth - 24);
        h = Math.min(h, window.innerHeight - 24);
        l = Math.min(Math.max(0, l), window.innerWidth - 120);
        t = Math.min(Math.max(0, t), window.innerHeight - 60);
        panel.style.left = `${l}px`;
        panel.style.top = `${t}px`;
        panel.style.width = `${w}px`;
        panel.style.height = `${h}px`;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveChatPanelGeom();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    panel.appendChild(el);
  }
}

function toggleProviderDialog(force) {
  const dlg = document.getElementById('prov-dialog');
  if (!dlg) return;
  const show = typeof force === 'boolean' ? force : dlg.style.display === 'none';
  dlg.style.display = show ? 'flex' : 'none';
  if (show) {
    renderProvDialogLabels();
    renderProvPresets();
    refreshProviderList();
  }
}

let provCurrentType = 'ollama';
let provFetchedModels = [];

function provTypes() {
  return [
    { id: 'ollama', label: 'Ollama local', base: 'http://127.0.0.1:11434', key: '', urlMode: 'edit', keyMode: 'hide', suggest: [] },
    { id: 'llamacpp', label: 'llama.cpp server', base: 'http://172.22.20.125:8080/v1', key: 'EMPTY', urlMode: 'edit', keyMode: 'hide', suggest: [] },
    { id: 'openai', label: 'OpenAI', base: 'https://api.openai.com/v1', key: '', urlMode: 'fixed', keyMode: 'require', suggest: ['gpt-4o-mini', 'gpt-4o'] },
    { id: 'deepseek', label: 'DeepSeek', base: 'https://api.deepseek.com/v1', key: '', urlMode: 'fixed', keyMode: 'require', suggest: ['deepseek-chat', 'deepseek-reasoner'] },
    { id: 'gemini', label: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai/', key: '', urlMode: 'fixed', keyMode: 'require', suggest: ['gemini-2.0-flash', 'gemini-1.5-flash'] },
    { id: 'groq', label: 'Groq (Llama)', base: 'https://api.groq.com/openai/v1', key: '', urlMode: 'fixed', keyMode: 'require', suggest: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
    { id: 'grok', label: 'xAI Grok', base: 'https://api.x.ai/v1', key: '', urlMode: 'fixed', keyMode: 'require', suggest: ['grok-3', 'grok-3-mini'] },
    { id: 'custom', label: 'Custom URL', base: '', urlMode: 'edit', keyMode: 'optional', suggest: [] },
  ];
}

function renderProvPresets() {
  const box = document.getElementById('prov-types');
  if (!box) return;
  box.innerHTML = '';
  for (const p of provTypes()) {
    const b = document.createElement('button');
    b.textContent = p.label;
    b.dataset.typeId = p.id;
    b.style.cssText = 'border:1px solid #30363d; background:#161b22; color:#c9d1d9; border-radius:999px; padding:4px 12px; font-size:var(--cfs-sm); cursor:pointer;';
    b.onclick = () => selectProvType(p.id);
    box.appendChild(b);
  }
  selectProvType(provCurrentType);
}

function selectProvType(id) {
  const t = provTypes().find((p) => p.id === id) || provTypes()[0];
  provCurrentType = t.id;
  provFetchedModels = [];
  const box = document.getElementById('prov-types');
  if (box) {
    Array.from(box.children).forEach((b) => {
      const on = b.dataset.typeId === t.id;
      b.style.borderColor = on ? '#1f6feb' : '#30363d';
      b.style.color = on ? '#58a6ff' : '#c9d1d9';
    });
  }
  const set = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v; };
  set('chat-prov-label', t.label);
  const rowUrl = document.getElementById('prov-row-url');
  const fixedUrl = document.getElementById('prov-fixed-url');
  if (t.urlMode === 'fixed') {
    if (rowUrl) rowUrl.style.display = 'none';
    if (fixedUrl) {
      fixedUrl.style.display = 'block';
      fixedUrl.textContent = t.base;
    }
  } else {
    if (rowUrl) rowUrl.style.display = '';
    if (fixedUrl) fixedUrl.style.display = 'none';
    set('chat-prov-base', t.base);
  }
  const rowKey = document.getElementById('prov-row-key');
  if (rowKey) rowKey.style.display = t.keyMode === 'hide' ? 'none' : '';
  set('chat-prov-key', t.key || '');
  const keyLabel = document.getElementById('lbl-prov-f-key');
  if (keyLabel) keyLabel.textContent = t('prov_f_key') + (t.keyMode === 'require' ? ' *' : '');
  renderProvModelList(t.suggest || []);
  const msg = document.getElementById('chat-prov-msg');
  if (msg) msg.textContent = '';
  if (t.keyMode !== 'require') fetchProvModels();
}

function renderProvModelList(models) {
  provFetchedModels = models || [];
  const box = document.getElementById('prov-model-list');
  if (!box) return;
  box.innerHTML = '';
  if (!provFetchedModels.length) {
    const hint = document.createElement('div');
    hint.style.cssText = 'color:#8b949e; font-size:var(--cfs-sm);';
    hint.textContent = t('prov_models_empty');
    box.appendChild(hint);
    return;
  }
  provFetchedModels.forEach((m, idx) => {
    const lab = document.createElement('label');
    lab.style.cssText = 'display:flex; gap:8px; align-items:center; border:1px solid #21262d; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:var(--cfs);';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'prov-model-pick';
    radio.value = m;
    if (idx === 0) radio.checked = true;
    lab.appendChild(radio);
    const span = document.createElement('span');
    span.textContent = m;
    span.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    lab.appendChild(span);
    box.appendChild(lab);
  });
}

function provPickedModel() {
  const checked = document.querySelector('input[name="prov-model-pick"]:checked');
  return checked ? checked.value : '';
}

function provFormBase() {
  const t = provTypes().find((p) => p.id === provCurrentType) || {};
  if (t.urlMode === 'fixed') return t.base;
  const el = document.getElementById('chat-prov-base');
  return el ? el.value.trim() : '';
}

function provFormKey() {
  const t = provTypes().find((p) => p.id === provCurrentType) || {};
  if (t.keyMode === 'hide') return t.key || '';
  const el = document.getElementById('chat-prov-key');
  return el ? el.value.trim() : '';
}

function fetchProvModels() {
  const msg = document.getElementById('chat-prov-msg');
  if (msg) msg.textContent = '…';
  fetch('/api/chat/providers/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base: provFormBase(), key: provFormKey() }),
  })
    .then((res) => res.json())
    .then((d) => {
      if (d.ok && d.models && d.models.length) {
        renderProvModelList(d.models.slice(0, 20));
        if (msg) msg.textContent = `✅ ${d.models.length} models (${d.kind || ''})`;
      } else {
        renderProvModelList([]);
        if (msg) msg.textContent = `❌ ${(d && d.error) || 'empty'}`;
      }
    })
    .catch(() => {
      renderProvModelList([]);
      if (msg) msg.textContent = '❌';
    });
}

function toggleProviderSettings(force) {
  toggleProviderDialog(force);
}

function refreshProviderList() {
  const list = document.getElementById('chat-prov-list');
  const msg = document.getElementById('chat-prov-msg');
  if (!list) return;
  fetch('/api/chat/providers')
    .then((res) => res.json())
    .then((data) => {
      list.innerHTML = '';
      for (const p of (data && data.providers) || []) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; gap:6px; align-items:center; border:1px solid #21262d; border-radius:6px; padding:4px 8px;';
        const label = document.createElement('span');
        label.style.flex = '1';
        label.textContent = `${p.label || p.id} [${(p.models || []).join(', ')}]${p.source === 'file' ? '' : ' 🔒'}`;
        row.appendChild(label);
        const testBtn = document.createElement('button');
        testBtn.textContent = t('chat_prov_test');
        testBtn.style.cssText = 'background:transparent; border:1px solid #30363d; border-radius:6px; color:#c9d1d9; cursor:pointer; padding:2px 8px; font-size:var(--cfs-sm);';
        testBtn.onclick = () => {
          if (msg) msg.textContent = '…';
          fetch(`/api/chat/providers/${encodeURIComponent(p.id)}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strLang: (typeof currentLang !== 'undefined' && currentLang) || 'en-US' }),
          })
            .then((r) => r.json())
            .then((d) => { if (msg) msg.textContent = d.ok ? `✅ ${d.info || ''}` : `❌ ${d.error || ''}`; })
            .catch(() => { if (msg) msg.textContent = '❌'; });
        };
        row.appendChild(testBtn);
        if (p.source === 'file') {
          const delBtn = document.createElement('button');
          delBtn.textContent = '✕';
          delBtn.style.cssText = 'background:transparent; border:1px solid #30363d; border-radius:6px; color:#f85149; cursor:pointer; padding:2px 8px; font-size:var(--cfs-sm);';
          delBtn.onclick = () => {
            const lang = (typeof currentLang !== 'undefined' && currentLang) || 'en-US';
            fetch(`/api/chat/providers/${encodeURIComponent(p.id)}?strLang=${encodeURIComponent(lang)}`, { method: 'DELETE' })
              .then(() => { refreshProviderList(); loadChatModels(); })
              .catch(() => { /* ignore */ });
          };
          row.appendChild(delBtn);
        }
        list.appendChild(row);
      }
    })
    .catch(() => { /* ignore */ });
}

function addChatProvider() {
  const msg = document.getElementById('chat-prov-msg');
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const picked = provPickedModel();
  if (!provFetchedModels.length || !picked) {
    if (msg) msg.textContent = `❌ ${t('prov_models_empty')}`;
    return;
  }
  const payload = {
    label: val('chat-prov-label'),
    base: provFormBase(),
    key: provFormKey(),
    models: provFetchedModels,
    strLang: (typeof currentLang !== 'undefined' && currentLang) || 'en-US',
  };
  fetch('/api/chat/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json().then((d) => ({ status: res.status, body: d })))
    .then(({ status, body }) => {
      if (status === 200 && body.bSuccess) {
        const newId = body.provider.id;
        fetch('/api/chat/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: newId, model: picked }),
        }).catch(() => { /* best-effort */ });
        try { localStorage.setItem('galaxy-chat-model', JSON.stringify({ provider: newId, model: picked })); } catch (e) { /* ignore */ }
        if (msg) msg.textContent = `✅ ${newId} → ${picked}`;
        refreshProviderList();
        loadChatModels();
        toggleProviderDialog(false);
      } else if (msg) {
        msg.textContent = `❌ ${(body && body.strError) || status}`;
      }
    })
    .catch(() => { if (msg) msg.textContent = '❌'; });
}

let chatWelcomed = false;

function showChatWelcome() {
  const box = document.getElementById('chat-msgs');
  if (!box || box.children.length > 0 || chatHistory.length > 0) return;
  chatWelcomed = true;
  const div = document.createElement('div');
  div.setAttribute('data-guide', '1');
  div.style.cssText = 'align-self:flex-start; max-width:94%; background:#161b22; border:1px solid #30363d; border-radius:8px; padding:6px 10px; white-space:pre-wrap; word-break:break-word;';
  div.textContent = t('chat_welcome');
  box.appendChild(div);
}

function renderProvDialogLabels() {
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('lbl-prov-title', t('prov_title'));
  set('lbl-prov-add', t('prov_add'));
  set('lbl-prov-f-label', t('prov_f_label'));
  set('lbl-prov-f-base', t('prov_f_base'));
  set('lbl-prov-f-key', t('prov_f_key'));
  set('lbl-prov-f-models', t('prov_f_models'));
  set('lbl-prov-fetch', t('prov_fetch'));
  set('lbl-prov-cancel', t('prov_cancel'));
  set('lbl-prov-save', t('prov_save'));
}

function toggleChatPanel(force) {
  const panel = document.getElementById('chat-panel');
  if (!panel) return;
  const show = typeof force === 'boolean' ? force : panel.style.display === 'none';
  panel.style.display = show ? 'flex' : 'none';
  if (show) {
    renderChatLabels();
    renderChatChips();
    loadChatModels();
    renderChatScope();
    restoreChatPanelGeom();
    initChatPanelDrag();
    showChatWelcome();
    const inp = document.getElementById('chat-input');
    if (inp) {
      inp.focus();
      if (!inp.dataset.bound) {
        inp.dataset.bound = '1';
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatFromInput();
          }
        });
      }
    }
    document.dispatchEvent(new CustomEvent('rd:chat-opened', { detail: {} }));
  } else {
    document.dispatchEvent(new CustomEvent('rd:chat-closed', { detail: {} }));
  }
}

function renderChatChips() {
  const box = document.getElementById('chat-chips');
  if (!box) return;
  box.innerHTML = '';
  for (const tpl of chatTemplates()) {
    const b = document.createElement('button');
    b.textContent = tpl.label;
    b.style.cssText = 'border:1px solid #30363d; background:#161b22; color:#c9d1d9; border-radius:999px; padding:4px 12px; font-size:var(--cfs-sm); cursor:pointer;';
    b.onclick = () => sendChatMessage(tpl.prompt);
    box.appendChild(b);
  }
}

function sendChatFromInput() {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || chatBusy) return;
  inp.value = '';
  sendChatMessage(text);
}

function chatAppendBubble(role, text) {
  const box = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  div.setAttribute('data-role', role);
  div.style.cssText = role === 'user'
    ? 'align-self:flex-end; max-width:92%; background:#1f6feb33; border:1px solid #1f6feb55; border-radius:8px; padding:6px 10px; white-space:pre-wrap; word-break:break-word;'
    : 'align-self:flex-start; max-width:94%; background:#161b22; border:1px solid #30363d; border-radius:8px; padding:6px 10px; white-space:pre-wrap; word-break:break-word;';
  div.dataset.raw = text || '';
  const span = document.createElement('span');
  span.textContent = text;
  div.appendChild(span);
  div._span = span;
  const copyBtn = document.createElement('button');
  copyBtn.innerHTML = chatCopySvg(false);
  copyBtn.title = t('chat_copy');
  copyBtn.style.cssText = 'float:right; background:transparent; border:none; color:#8b949e; cursor:pointer; font-size:var(--cfs-sm); padding:0 0 0 6px;';
  copyBtn.onclick = (e) => {
    e.stopPropagation();
    copyChatText(div.dataset.raw || '', copyBtn);
  };
  div.appendChild(copyBtn);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function chatCopySvg(done) {
  if (done) {
    return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#3fb950" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>';
  }
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 5.5v-2a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2"/></svg>';
}

function copyChatText(text, btn) {
  const done = () => {
    showToast(t('chat_copied'));
    if (btn) {
      const old = btn.innerHTML;
      btn.innerHTML = chatCopySvg(true);
      setTimeout(() => { btn.innerHTML = old; }, 1200);
    }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => copyChatFallback(text, done));
    } else {
      copyChatFallback(text, done);
    }
  } catch (e) {
    copyChatFallback(text, done);
  }
}

function copyChatFallback(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed; opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  } catch (e) { /* clipboard unavailable */ }
}

function traceToolLabel(tool) {
  const map = {
    galaxy_search_symbols: '🔍 ' + t('trace_search'),
    galaxy_get_neighbors: '🕸 ' + t('trace_neighbors'),
    galaxy_get_code: '📄 ' + t('trace_code'),
    galaxy_blast_radius: '💥 ' + t('trace_blast'),
  };
  return map[tool] || `🔍 ${tool}`;
}

function chatParseSseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) event = line.substring(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.substring(5).trim());
  }
  if (!dataLines.length) return null;
  let data = dataLines.join('\n');
  try { data = JSON.parse(data); } catch (e) { /* plain text */ }
  return { event, data };
}

function sendChatMessage(text) {
  if (!text || chatBusy) return;
  const panel = document.getElementById('chat-panel');
  if (!panel || panel.style.display === 'none') toggleChatPanel(true);
  chatBusy = true;
  chatAppendBubble('user', text);
  const aiDiv = chatAppendBubble('assistant', t('chat_thinking'));
  const traceRows = document.createElement('div');
  traceRows.style.cssText = 'align-self:flex-start; max-width:94%; font-size:var(--cfs-sm); color:#8b949e; display:flex; flex-direction:column; gap:2px;';
  document.getElementById('chat-msgs').appendChild(traceRows);

  const payload = {
    message: text,
    context: {
      vHistory: chatHistory.slice(-10),
      strProject: chatCurrentProject(),
      vProjects: Array.from(selectedProjects || []),
      strLang: (typeof currentLang !== 'undefined' && currentLang) || 'en-US',
    },
    ...chatSelectedModel(),
  };
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/chat/stream', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    let offset = 0, buffer = '', accumulated = '';
    const steps = [];
    xhr.onprogress = () => {
      const resp = xhr.responseText || '';
      buffer += resp.substring(offset);
      offset = resp.length;
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';
      for (const block of blocks) {
        const frame = chatParseSseBlock(block);
        if (!frame) continue;
        if (frame.event === 'chat_delta' && frame.data && frame.data.strDelta) {
          accumulated += frame.data.strDelta;
          if (aiDiv._span) aiDiv._span.textContent = accumulated;
          else aiDiv.textContent = accumulated;
        } else if (frame.event === 'chat_trace' && frame.data) {
          steps.push(frame.data);
          const row = document.createElement('div');
          const tool = frame.data.strTool || frame.data.tool || 'tool';
          const summary = frame.data.strSummary || frame.data.summary || '';
          row.textContent = `${traceToolLabel(tool)} — ${summary}`;
          traceRows.appendChild(row);
          appendTraceNodeChips(traceRows, (frame.data.vNodes || frame.data.nodes || []));
        } else if (frame.event === 'chat_done' && frame.data) {
          finishChatAnswer(frame.data, steps, accumulated, aiDiv, traceRows, text);
        } else if (frame.event === 'error') {
          const msg = '⚠️ ' + ((frame.data && (frame.data.strError || frame.data.message)) || 'chat failed');
          if (aiDiv._span) aiDiv._span.textContent = msg;
          else aiDiv.textContent = msg;
          aiDiv.dataset.raw = msg;
          chatBusy = false;
        }
      }
      const box = document.getElementById('chat-msgs');
      if (box) box.scrollTop = box.scrollHeight;
    };
    xhr.onload = () => {
      if (xhr.status !== 200 && chatBusy) {
        const msg = `⚠️ server error (${xhr.status})`;
        if (aiDiv._span) aiDiv._span.textContent = msg;
        else aiDiv.textContent = msg;
        aiDiv.dataset.raw = msg;
        chatBusy = false;
      }
    };
    xhr.onerror = () => {
      const msg = '⚠️ ' + t('chat_conn_fail');
      if (aiDiv._span) aiDiv._span.textContent = msg;
      else aiDiv.textContent = msg;
      aiDiv.dataset.raw = msg;
      chatBusy = false;
    };
    xhr.send(JSON.stringify(payload));
  } catch (err) {
    const msg = '⚠️ ' + String((err && err.message) || err);
    if (aiDiv._span) aiDiv._span.textContent = msg;
    else aiDiv.textContent = msg;
    aiDiv.dataset.raw = msg;
    chatBusy = false;
  }
}

// Pure markdown renderer (zero deps, XSS-safe): headings, tables, fenced code,
// lists, hr, bold, inline code, links. Streaming uses plain text; final render
// goes through here.
function chatRenderMarkdown(src) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const codes = [];
  let text = String(src || '').replace(/```(\w*)\n([\s\S]*?)(```|$)/g, (m, lang, code) => {
    codes.push({ lang: (lang || '').trim(), code: code.replace(/\n$/, '') });
    return `\u0000CODE${codes.length - 1}\u0000`;
  });
  text = esc(text);
  const inline = (s) => s
    .replace(/`([^`\n]+)`/g, (m, c) => `<code style="background:#161b22; border:1px solid #30363d; border-radius:4px; padding:0 4px;">${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#58a6ff;">$1</a>');
  const lines = text.split('\n');
  let html = '';
  let i = 0;
  const isSep = (s) => /^\s*\|?[\s:|\-]+\|?\s*$/.test(s) && s.includes('-');
  const splitRow = (s) => {
    let r = s.trim();
    if (r.startsWith('|')) r = r.slice(1);
    if (r.endsWith('|')) r = r.slice(0, -1);
    return r.split('|').map((c) => c.trim());
  };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    const codePh = t.match(/^\u0000CODE(\d+)\u0000$/);
    if (codePh) {
      const c = codes[parseInt(codePh[1], 10)];
      html += `<pre style="background:#010409; border:1px solid #30363d; border-radius:6px; padding:8px; overflow-x:auto; font-size:11px;"><code>${esc(c.code)}</code></pre>`;
      i++;
      continue;
    }
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lv = h[1].length;
      html += `<div style="font-weight:700; font-size:${15 - lv}px; margin:6px 0 2px;">${inline(h[2])}</div>`;
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(t)) {
      html += '<hr style="border:none; border-top:1px solid #30363d; margin:6px 0;" />';
      i++;
      continue;
    }
    if (t.includes('|') && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = splitRow(t);
      html += '<table style="border-collapse:collapse; margin:4px 0; font-size:11px;"><thead><tr>'
        + head.map((c) => `<th style="border:1px solid #30363d; padding:3px 8px; background:#161b22;">${inline(c)}</th>`).join('')
        + '</tr></thead><tbody>';
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        html += '<tr>' + splitRow(lines[i]).map((c) => `<td style="border:1px solid #30363d; padding:3px 8px;">${inline(c)}</td>`).join('') + '</tr>';
        i++;
      }
      html += '</tbody></table>';
      continue;
    }
    const lm = t.match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/);
    if (lm) {
      const ordered = /^\d/.test(lm[2]);
      const tag = ordered ? 'ol' : 'ul';
      html += `<${tag} style="margin:2px 0 2px 18px; padding:0;">`;
      while (i < lines.length) {
        const m2 = lines[i].trim().match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/);
        if (!m2) break;
        html += `<li>${inline(m2[3])}</li>`;
        i++;
      }
      html += `</${tag}>`;
      continue;
    }
    html += `<div style="margin:2px 0;">${inline(t)}</div>`;
    i++;
  }
  return html.replace(/\u0000CODE(\d+)\u0000/g, (m, n) => {
    const c = codes[parseInt(n, 10)];
    return `<pre style="background:#010409; border:1px solid #30363d; border-radius:6px; padding:8px; overflow-x:auto; font-size:11px;"><code>${esc(c ? c.code : '')}</code></pre>`;
  });
}

function finishChatAnswer(done, steps, streamed, aiDiv, traceRows, userText) {
  const reply = (done && done.strReply) || streamed || '';
  aiDiv.dataset.raw = reply;
  aiDiv.innerHTML = chatRenderMarkdown(reply);
  const copyBtn = document.createElement('button');
  copyBtn.innerHTML = chatCopySvg(false);
  copyBtn.title = t('chat_copy');
  copyBtn.style.cssText = 'float:right; background:transparent; border:none; color:#8b949e; cursor:pointer; font-size:var(--cfs-sm); padding:0 0 0 6px;';
  copyBtn.onclick = (e) => {
    e.stopPropagation();
    copyChatText(aiDiv.dataset.raw || '', copyBtn);
  };
  aiDiv.appendChild(copyBtn);
  if (done && done.strProject) setChatProject(done.strProject);
  const highlights = (done && done.vHighlights) || [];
  const trace = (done && done.vTrace) || steps;
  if (trace && trace.length) {
    const details = document.createElement('details');
    details.style.cssText = 'align-self:flex-start; max-width:94%; font-size:var(--cfs-sm); color:#8b949e;';
    const summary = document.createElement('summary');
    summary.style.cursor = 'pointer';
    summary.textContent = t('chat_trace_title', { n: trace.length });
    details.appendChild(summary);
    while (traceRows.firstChild) details.appendChild(traceRows.firstChild);
    traceRows.parentNode.replaceChild(details, traceRows);
  } else if (traceRows.parentNode) {
    traceRows.parentNode.removeChild(traceRows);
  }
  if (highlights.length) {
    const btn = document.createElement('button');
    btn.textContent = t('chat_show_graph', { n: highlights.length });
    btn.style.cssText = 'align-self:flex-start; border:1px solid #bc8cff55; background:#bc8cff15; color:#bc8cff; border-radius:6px; padding:4px 10px; font-size:var(--cfs-sm); cursor:pointer;';
    btn.onclick = () => showChatHighlights(highlights);
    aiDiv.parentNode.insertBefore(btn, aiDiv.nextSibling);
  }
  chatHistory.push({ role: 'user', content: userText }, { role: 'assistant', content: reply });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  chatBusy = false;
  document.dispatchEvent(new CustomEvent('rd:chat-message', {
    detail: { strReply: reply, vHighlights: highlights, vTrace: trace },
  }));
}

function traceNodeColor(kind) {
  const k = String(kind || '').toLowerCase();
  if (k.includes('file')) return '#f0883e';
  if (k.includes('class') || k.includes('interface') || k.includes('namespace') || k.includes('struct')) return '#3fb950';
  return '#58a6ff';
}

function locateChatNode(id) {
  const meta = (typeof chatNodeIndex !== 'undefined' && chatNodeIndex[id]) || {};
  ensureChatNodeVisible(id, meta.project || '').then((n) => {
    if (n) {
      focusOnNode(n);
      try { openDrawer(n); } catch (e) { /* drawer optional */ }
      try { syncExplorerSelection(n); } catch (e) { /* ignore */ }
      if (n._viaAncestor) {
        showToast(t('chat_show_parent', { name: n.name || n.id, kind: n.kind || '' }));
      }
    } else {
      showToast(t('chat_no_nodes'));
    }
  }).catch(() => {
    showToast(t('chat_no_nodes'));
  });
}

// id → {kind, project} from trace chips (powers locate without extra queries)
let chatNodeIndex = {};

function findGraphNode(id) {
  if (typeof Graph === 'undefined' || !Graph || !Graph.graphData) return null;
  return ((Graph.graphData().nodes) || []).find((x) => x && x.id === id) || null;
}

function setChatLOD(mode) {
  currentLOD = mode;
  try { localStorage.setItem('codegraph_lod_mode', mode); } catch (e) { /* ignore */ }
  document.querySelectorAll('.lod-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lod === mode);
  });
  updateLegendUI();
  loadRootGraph();
}

// Walk-up locate: never touches layers or LOD. If the node itself is not
// revealed, climb vAncestors (nearest first) to the first visible node.
async function ensureChatNodeVisible(id, projectHint) {
  let n = findGraphNode(id);
  if (n) return n;
  showToast(t('chat_locating'));
  let info = null;
  try {
    const res = await fetch(`/api/chat/node?id=${encodeURIComponent(id)}&project=${encodeURIComponent(projectHint || '')}`);
    info = await res.json();
  } catch (e) { /* backend unreachable */ }
  if (!info || !info.found) return null;
  // Its project must be selected for anything (self or ancestors) to appear.
  if (!selectedProjects.has(info.project)) {
    selectedProjects.add(info.project);
    loadRootGraph();
  }
  const cands = [{ id, kind: info.kind, name: info.name }, ...((info.vAncestors) || [])];
  for (let i = 0; i < 40; i++) {
    for (const c of cands) {
      const hit = findGraphNode(c.id);
      if (hit) {
        if (hit.id !== id) {
          hit._viaAncestor = { id, name: info.name, kind: info.kind };
        }
        return hit;
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

function appendTraceNodeChips(box, nodes) {
  if (!nodes || !nodes.length || !box) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin:2px 0 4px 14px;';
  for (const nd of nodes.slice(0, 8)) {
    if (!nd || !nd.id) continue;
    chatNodeIndex[nd.id] = { kind: nd.kind || '', project: nd.project || '' };
    const chip = document.createElement('button');
    const color = traceNodeColor(nd.kind);
    chip.style.cssText = `border:1px solid ${color}66; background:${color}18; color:${color}; border-radius:999px; padding:2px 9px; font-size:var(--cfs-sm); cursor:pointer; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`;
    chip.textContent = `● ${nd.name || nd.id}`;
    chip.title = `${nd.id}${nd.project ? ` @${nd.project}` : ''} — click to locate`;
    chip.onclick = () => locateChatNode(nd.id);
    wrap.appendChild(chip);
  }
  if (nodes.length > 8) {
    const more = document.createElement('span');
    more.style.cssText = 'color:#8b949e; font-size:var(--cfs-sm); align-self:center;';
    more.textContent = `+${nodes.length - 8}`;
    wrap.appendChild(more);
  }
  box.appendChild(wrap);
}

async function showChatHighlights(ids) {
  if (!ids || !ids.length || typeof Graph === 'undefined' || !Graph || !Graph.graphData) return;
  // Resolve each id to itself-or-nearest-revealed-ancestor (single reload, one poll).
  const resolved = new Map();
  const missing = [];
  for (const id of ids) {
    const direct = findGraphNode(id);
    if (direct) resolved.set(id, direct);
    else missing.push(id);
  }
  if (missing.length) {
    showToast(t('chat_locating'));
    const infos = await Promise.all(missing.map(async (id) => {
      const meta = (typeof chatNodeIndex !== 'undefined' && chatNodeIndex[id]) || {};
      try {
        const res = await fetch(`/api/chat/node?id=${encodeURIComponent(id)}&project=${encodeURIComponent(meta.project || '')}`);
        return { id, info: await res.json() };
      } catch (e) {
        return { id, info: null };
      }
    }));
    let needReload = false;
    for (const { info } of infos) {
      if (info && info.found && !selectedProjects.has(info.project)) {
        selectedProjects.add(info.project);
        needReload = true;
      }
    }
    if (needReload) loadRootGraph();
    const chainUnion = new Set();
    for (let i = 0; i < 40; i++) {
      let allDone = true;
      for (const { id, info } of infos) {
        if (resolved.has(id) || !info || !info.found) continue;
        const cands = [id, ...((info.vAncestors) || []).map((a) => a.id)];
        let hit = null;
        for (const cid of cands) {
          hit = findGraphNode(cid);
          if (hit) break;
        }
        if (hit) {
          if (hit.id !== id) hit._viaAncestor = { id, name: info.name, kind: info.kind };
          resolved.set(id, hit);
          for (const a of ((info.vAncestors) || [])) {
            if (a.id !== hit.id && findGraphNode(a.id)) chainUnion.add(a.id);
          }
        } else {
          allDone = false;
        }
      }
      if (allDone) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  const seenIds = new Set();
  const uniq = [];
  for (const id of ids) {
    const n = resolved.get(id);
    if (n && !seenIds.has(n.id)) {
      seenIds.add(n.id);
      uniq.push(n);
    }
  }
  if (!uniq.length) {
    showToast(t('chat_no_nodes'));
    return;
  }
  const idSet = new Set(uniq.map((n) => n.id));
  highlightNodes.clear();
  highlightLinks.clear();
  for (const id of idSet) highlightNodes.add(id);
  for (const l of (Graph.graphData().links || [])) {
    const s = (l.source && l.source.id) || l.source;
    const tt = (l.target && l.target.id) || l.target;
    if (highlightNodes.has(s) && highlightNodes.has(tt)) highlightLinks.add(l);
  }
  Graph.nodeColor(Graph.nodeColor())
    .linkColor(Graph.linkColor())
    .linkWidth(Graph.linkWidth())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());
  const first = uniq[0];
  focusOnNode(first);
  focusChainToken++;
  setChainPills(Array.from(chainUnion));
  let chainAdded = false;
  for (const aid of chainUnion) {
    if (!highlightNodes.has(aid)) { highlightNodes.add(aid); chainAdded = true; }
  }
  if (chainAdded) {
    Graph.nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }
  try { openDrawer(first); } catch (e) { /* drawer optional */ }
  try { syncExplorerSelection(first); } catch (e) { /* ignore */ }
  if (uniq.length < ids.length) {
    showToast(t('chat_highlight_partial', { shown: uniq.length, total: ids.length }));
  }
  if (first._viaAncestor) {
    showToast(t('chat_show_parent', { name: first.name || first.id, kind: first.kind || '' }));
  } else if (uniq.length === ids.length) {
    showToast(t('chat_highlighted', { n: uniq.length }));
  }
}

function toggleHelp(force) {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  const show = typeof force === 'boolean' ? force : modal.style.display === 'none';
  modal.style.display = show ? 'flex' : 'none';
  if (show) renderHelpContent();
}

function renderHelpContent() {
  const title = document.getElementById('lbl-help-title');
  if (title) title.textContent = t('help_title');
  const body = document.getElementById('help-body');
  if (!body) return;
  body.innerHTML = '';
  for (const sec of ['mouse', 'keyboard', 'chat']) {
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:600; color:#58a6ff; margin-bottom:2px;';
    h.textContent = t(`help_${sec}_t`);
    body.appendChild(h);
    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:0 0 4px 18px; padding:0; color:#c9d1d9; display:flex; flex-direction:column; gap:3px;';
    for (const row of t(`help_${sec}_rows`).split('\n')) {
      if (!row.trim()) continue;
      const li = document.createElement('li');
      li.textContent = row.trim();
      ul.appendChild(li);
    }
    body.appendChild(ul);
  }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  init3DGraph();
  initLODAndFilters();
  applyLanguage();
  initPanelResizers();
  initDraggableLegend();
  refreshCodegraphConn();
  loadProjects();
});


// ==================== CodeGraph Sync & Review Modal Logic ====================
let currentSyncProject = null;
let currentSyncFiles = [];
let selectedSyncFiles = new Set();
let activePreviewFile = null;

function normSlash(s) {
  return (s || '').split(String.fromCharCode(92)).join('/');
}

function getSyncFileIcon(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.py')) return '🐍';
  if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.jsx') || lower.endsWith('.tsx')) return '📜';
  if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.less')) return '🎨';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return '🌐';
  if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.toml')) return '⚙️';
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return '📝';
  if (lower.endsWith('.sql')) return '🗄️';
  return '📄';
}

function updateSyncModalI18n() {
  const titleEl = document.getElementById('lbl-sync-modal-title');
  if (titleEl) titleEl.textContent = t('sync_modal_title');
  const subEl = document.getElementById('lbl-sync-modal-sub');
  if (subEl) subEl.textContent = t('sync_modal_sub');
  const searchEl = document.getElementById('syncModalSearch');
  if (searchEl) searchEl.placeholder = t('sync_search_ph');
  const selAllEl = document.getElementById('btn-sync-sel-all');
  if (selAllEl) selAllEl.textContent = t('sync_sel_all');
  const selNoneEl = document.getElementById('btn-sync-sel-none');
  if (selNoneEl) selNoneEl.textContent = t('sync_sel_none');
  const btnSyncEl = document.getElementById('lbl-btn-sync');
  if (btnSyncEl) btnSyncEl.textContent = t('sync_btn_sync');
  const btnExcludeEl = document.getElementById('lbl-btn-exclude');
  if (btnExcludeEl) btnExcludeEl.textContent = t('sync_btn_exclude');
  const emptyTipEl = document.getElementById('lbl-sync-code-empty');
  if (emptyTipEl) emptyTipEl.textContent = t('sync_code_empty_tip');
}

window.openSyncReviewModal = async function(projName, targetSubDir) {
  console.log('openSyncReviewModal invoked for:', projName, 'targetSubDir:', targetSubDir);
  currentSyncProject = projName;
  const modal = document.getElementById('syncReviewModal');
  if (!modal) return;

  updateSyncModalI18n();

  const projBadge = document.getElementById('syncModalProjectBadge');
  if (projBadge) projBadge.textContent = projName;

  // Always fetch latest project list to guarantee fresh unindexed_files list
  try {
    const res = await fetch('/api/projects');
    allProjectsList = await res.json();
  } catch (e) {
    console.error('Failed to fetch projects', e);
  }

  const proj = (allProjectsList || []).find(p => p.name === projName);
  let files = (proj && proj.unindexed_files) ? [...proj.unindexed_files] : [];
  
  if (targetSubDir && typeof targetSubDir === 'string' && targetSubDir !== 'null' && targetSubDir !== 'undefined') {
    const normSub = normSlash(targetSubDir).toLowerCase();
    files = files.filter(f => normSlash(f).toLowerCase().startsWith(normSub));
  }

  console.log('Found unindexed files:', files.length, 'for', projName);
  currentSyncFiles = files;
  selectedSyncFiles = new Set(files);
  activePreviewFile = files.length > 0 ? files[0] : null;

  window.renderSyncFileList();
  if (activePreviewFile) {
    window.selectSyncFileForPreview(activePreviewFile);
  } else {
    resetSyncCodeViewer();
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
};

window.closeSyncReviewModal = function() {
  const modal = document.getElementById('syncReviewModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
};

window.renderSyncFileList = function() {
  const listEl = document.getElementById('syncFileList');
  const searchVal = (document.getElementById('syncModalSearch')?.value || '').trim().toLowerCase();
  if (!listEl) return;

  listEl.innerHTML = '';
  const filtered = currentSyncFiles.filter(f => !searchVal || f.toLowerCase().includes(searchVal));

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #6e7681; font-size: 0.85rem;">
        ${currentSyncFiles.length === 0 ? t('sync_no_unindexed') : t('sync_no_match')}
      </div>
    `;
    updateSyncCountText();
    return;
  }

  filtered.forEach(filePath => {
    const isChecked = selectedSyncFiles.has(filePath);
    const isActive = activePreviewFile === filePath;
    const icon = getSyncFileIcon(filePath);
    const normPath = normSlash(filePath);
    const fileName = normPath.split('/').pop();
    const slashIdx = normPath.lastIndexOf('/');
    const dirPath = slashIdx !== -1 ? normPath.substring(0, slashIdx) : '';

    const row = document.createElement('div');
    row.className = 'sync-file-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      background: ${isActive ? 'rgba(88, 166, 255, 0.12)' : 'transparent'};
      border: 1px solid ${isActive ? 'rgba(88, 166, 255, 0.4)' : 'transparent'};
      transition: all 0.15s ease;
    `;
    row.onmouseover = () => { if (!isActive) row.style.background = 'rgba(255,255,255,0.04)'; };
    row.onmouseout = () => { if (!isActive) row.style.background = 'transparent'; };

    row.innerHTML = `
      <input type="checkbox" ${isChecked ? 'checked' : ''} style="cursor: pointer;" />
      <span style="font-size: 1rem;">${icon}</span>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
        <span style="color: ${isActive ? '#58a6ff' : '#c9d1d9'}; font-weight: 500; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fileName}</span>
        ${dirPath ? `<span style="color: #6e7681; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dirPath}</span>` : ''}
      </div>
      <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 8px; background: rgba(210,153,34,0.15); color: #d29922; border: 1px solid rgba(210,153,34,0.3); flex-shrink: 0;">${t('sync_status_unindexed')}</span>
    `;

    const chk = row.querySelector('input[type="checkbox"]');
    chk.onclick = (e) => {
      e.stopPropagation();
      if (chk.checked) {
        selectedSyncFiles.add(filePath);
      } else {
        selectedSyncFiles.delete(filePath);
      }
      updateSyncCountText();
    };

    row.onclick = () => {
      activePreviewFile = filePath;
      window.renderSyncFileList();
      window.selectSyncFileForPreview(filePath);
    };

    listEl.appendChild(row);
  });

  updateSyncCountText();
};

window.filterSyncFileList = function() {
  window.renderSyncFileList();
};

window.toggleAllSyncFiles = function(select) {
  const searchVal = (document.getElementById('syncModalSearch')?.value || '').trim().toLowerCase();
  const visibleFiles = currentSyncFiles.filter(f => !searchVal || f.toLowerCase().includes(searchVal));
  
  visibleFiles.forEach(f => {
    if (select) selectedSyncFiles.add(f);
    else selectedSyncFiles.delete(f);
  });

  window.renderSyncFileList();
};

function updateSyncCountText() {
  const countEl = document.getElementById('syncSelectionCount');
  if (countEl) {
    countEl.textContent = t('sync_sel_count', { n: selectedSyncFiles.size, total: currentSyncFiles.length });
  }
}

function resetSyncCodeViewer() {
  const fileNameEl = document.getElementById('syncCodeFileName');
  const badgeEl = document.getElementById('syncCodeBadge');
  const actionsEl = document.getElementById('syncCodeActions');
  const contentEl = document.getElementById('syncCodeContent');
  if (fileNameEl) fileNameEl.textContent = t('sync_code_preview_tip');
  if (badgeEl) badgeEl.style.display = 'none';
  if (actionsEl) actionsEl.style.display = 'none';
  if (contentEl) {
    contentEl.innerHTML = `
      <div style="color: #6e7681; display: flex; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 10px;">
        <span style="font-size: 2.5rem; opacity: 0.3;">📄</span>
        <span>${t('sync_code_empty_tip')}</span>
      </div>
    `;
  }
}

window.selectSyncFileForPreview = async function(filePath) {
  activePreviewFile = filePath;
  const fileNameEl = document.getElementById('syncCodeFileName');
  const iconEl = document.getElementById('syncCodeFileIcon');
  const badgeEl = document.getElementById('syncCodeBadge');
  const actionsEl = document.getElementById('syncCodeActions');
  const statsEl = document.getElementById('syncCodeStats');
  const contentEl = document.getElementById('syncCodeContent');

  if (fileNameEl) fileNameEl.textContent = filePath;
  if (iconEl) iconEl.textContent = getSyncFileIcon(filePath);
  if (badgeEl) {
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = t('sync_status_unindexed');
  }
  if (actionsEl) actionsEl.style.display = 'flex';
  if (contentEl) {
    contentEl.innerHTML = `<div style="color: #8b949e; padding: 20px;">${t('sync_loading')}</div>`;
  }

  try {
    const res = await fetch(`/api/code?project=${encodeURIComponent(currentSyncProject)}&file_path=${encodeURIComponent(filePath)}&start_line=1&end_line=2000`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (data.code !== undefined) {
      const lines = data.code.split(String.fromCharCode(10));
      if (statsEl) statsEl.textContent = t('sync_lines', { n: lines.length });

      let codeHtml = '';
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        codeHtml += `<div style="display: flex; line-height: 1.5;"><span style="width: 48px; color: #484f58; text-align: right; margin-right: 16px; user-select: none; font-size: 0.78rem;">${lineNum}</span><span style="color: #c9d1d9; flex: 1;">${escapeHtml(line)}</span></div>`;
      });
      if (contentEl) contentEl.innerHTML = codeHtml || '<span style="color: #6e7681;">(empty file)</span>';
    } else {
      if (contentEl) contentEl.innerHTML = `<span style="color: #f85149;">Error reading file: ${escapeHtml(data.error || 'Unknown error')}</span>`;
    }
  } catch (err) {
    if (contentEl) contentEl.innerHTML = `<span style="color: #f85149;">Load failed: ${escapeHtml(err.message)}</span>`;
  }
};

window.openSyncFileInIDE = function(ideType) {
  if (!currentSyncProject || !activePreviewFile) return;
  const proj = (allProjectsList || []).find(p => p.name === currentSyncProject);
  const projRoot = proj ? proj.path : '';
  const fullPath = projRoot ? normSlash(`${projRoot}/${activePreviewFile}`) : activePreviewFile;
  
  if (ideType === 'antigravity') {
    window.location.href = `antigravity://file/${fullPath}:1:1`;
  } else {
    window.location.href = `vscode://file/${fullPath}:1:1`;
  }
};

window.executeSyncSelected = async function() {
  if (!currentSyncProject) return;
  const btn = document.getElementById('btnSyncSelected');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> ${t('sync_in_progress')}`;
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: [currentSyncProject] })
    });
    const data = await res.json();
    const result = data[currentSyncProject];
    if (result && result.success) {
      showToast(t('sync_success_toast', { proj: currentSyncProject }));
      window.closeSyncReviewModal();
      const projRes = await fetch('/api/projects');
      allProjectsList = await projRes.json();
      loadRootGraph();
    } else {
      alert(`Indexing issue: ${result?.error || result?.output || 'Check logs'}`);
    }
  } catch (err) {
    alert(`Indexing error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
};

window.executeExcludeSelected = async function() {
  if (!currentSyncProject || selectedSyncFiles.size === 0) {
    alert('Please select files to exclude.');
    return;
  }

  const proj = (allProjectsList || []).find(p => p.name === currentSyncProject);
  const projRoot = proj ? proj.path : '';
  const pathsToExclude = Array.from(selectedSyncFiles).map(f => {
    return projRoot ? normSlash(`${projRoot}/${f}`) : f;
  });

  if (!confirm(t('sync_exclude_confirm', { n: pathsToExclude.length }))) {
    return;
  }

  const btn = document.getElementById('btnExcludeSelected');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/project/exclude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: pathsToExclude })
    });
    const data = await res.json();
    if (data.success) {
      showToast(t('sync_exclude_toast', { n: pathsToExclude.length }));
      window.closeSyncReviewModal();
      const projRes = await fetch('/api/projects');
      allProjectsList = await projRes.json();
      loadRootGraph();
    } else {
      alert(`Exclude failed: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    alert(`Exclude error: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
};


document.addEventListener('click', handleCodeReferenceClick);
