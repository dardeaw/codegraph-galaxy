
// ==========================================
// Source Code Reference Highlighter & 3D/Explorer Linkage
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
let currentData = { nodes: [], links: [] };
let hiddenKinds = new Set();
let hiddenEdgeKinds = new Set();
let breadcrumb = [];
let isRotating = false;
let activeNode = null;

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
    });

  window.addEventListener('resize', () => {
    if (Graph) Graph.width(window.innerWidth).height(window.innerHeight);
  });
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

  // Ingest indexed nodes
  (rawData.nodes || []).forEach(n => {
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

    // Render Symbols (Classes, Functions, Methods)
    if (!isUnindexed) {
      symList.filter(s => s.kind !== 'file').forEach(s => {
        const symNodeEl = document.createElement('div');
        symNodeEl.className = 'tree-node';
        symNodeEl.setAttribute('data-tree-node-id', s.id);
        
        let icon = '🔹';
        if (s.kind === 'class' || s.kind === 'interface') icon = '🟢';
        else if (s.kind === 'function' || s.kind === 'method') icon = '⚡';

        symNodeEl.innerHTML = `
          <span style="font-size:10px;">${icon}</span>
          <span style="font-size:11px;">${s.name}</span>
          <span class="node-kind-tag" style="color:${KIND_COLORS[s.kind] || '#8b949e'}">${s.kind}</span>
        `;

        symNodeEl.onclick = (e) => {
          e.stopPropagation();
          selectTreeNode(symNodeEl);
          highlightScope('node', s);
          focusOnNode(s);
          openDrawer(s);
        };

        if (selectedKey === s.id) {
          selectTreeNode(symNodeEl);
        }

        fileChildrenEl.appendChild(symNodeEl);
      });
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
      document.getElementById('d-code').innerText = `// ⚡ Physical File on Disk (Not Indexed Yet)\n// Click [Index to CodeGraph] on project badge to extract AST symbols.\n\n` + (data.code || '');
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
        document.getElementById('d-code').innerText = data.code;
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
    buildProjectTree();
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

// Init
window.addEventListener('DOMContentLoaded', () => {
  init3DGraph();
  initLODAndFilters();
  applyLanguage();
  initPanelResizers();
  initDraggableLegend();
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
