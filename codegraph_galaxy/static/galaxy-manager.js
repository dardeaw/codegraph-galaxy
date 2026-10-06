/* galaxy-manager.js — indexing manager modal + window.* handlers, split from galaxy.js. Classic script; load LAST (needs core helpers). */
// ==================== CodeGraph Sync & Review Modal Logic ====================
let currentSyncProject = null;
let currentSyncSubDir = null;
// currentSyncFiles entries: { path, indexed }. selectedSyncFiles = desired
// membership (checked = in index; apply reconciles both ways).
let currentSyncFiles = [];
let selectedSyncFiles = new Set(); // derived: desired == 'indexed' (compat)
let syncDesired = new Map(); // path -> 'indexed' | 'unindexed' | 'ignored'

// Desired-state setter: single writer for seg control, select-all, VCS
// helpers. Persists mute (ignored display) alongside; rule IO happens only
// in apply (and toggleMute's immediate tree path).
function setDesired(filePath, state) {
  if (!filePath) return;
  syncDesired.set(filePath, state);
  if (state === 'indexed') selectedSyncFiles.add(filePath);
  else selectedSyncFiles.delete(filePath);
  if (state === 'ignored') setMuted(currentSyncProject, filePath, true);
  else setMuted(currentSyncProject, filePath, false);
}
let activePreviewFile = null;

// Indexing manager state: every source file with its membership.
// indexed (checked) / pending (unchecked) / ignored (unchecked + ruled) /
// vcs-ignored (unchecked + disabled: .gitignore blocks the CLI forever).
function buildSyncFileState(proj) {
  const indexed = (proj && proj.indexed_files) ? [...proj.indexed_files] : [];
  const fresh = (proj && proj.unindexed_files) ? [...proj.unindexed_files] : [];
  const ruled = (proj && proj.rule_ignored) ? [...proj.rule_ignored] : [];
  const vcs = (proj && proj.vcs_ignored) ? [...proj.vcs_ignored] : [];
  let idx = indexed, fr = fresh, ig = ruled, vc = vcs;
  if (currentSyncSubDir) {
    const normSub = normSlash(currentSyncSubDir).toLowerCase();
    const inScope = (f) => normSlash(f).toLowerCase().startsWith(normSub);
    idx = idx.filter(inScope);
    fr = fr.filter(inScope);
    ig = ig.filter(inScope);
    vc = vc.filter(inScope);
  }
  const idxSet = new Set(idx.map(f => normSlash(f)));
  const notIdx = (f) => !idxSet.has(normSlash(f));
  const forcedSet = new Set(((proj && proj.vcs_forced) || []).map(f => normSlash(f)));
  const projName = (proj && proj.name) || '';
  // Backend lists are disjoint, but never render one path twice (first wins).
  const seen = new Set(idxSet);
  const uniq = (list) => list.filter(f => {
    const k = normSlash(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const all = [
    ...idx.map(f => ({ path: f, indexed: true, ignored: false, vcsIgnored: false, forced: forcedSet.has(normSlash(f)), muted: isMuted(projName, f) })),
    ...uniq(fr.filter(notIdx)).map(f => ({ path: f, indexed: false, ignored: false, vcsIgnored: false, muted: isMuted(projName, f) })),
    ...uniq(ig.filter(notIdx)).map(f => ({ path: f, indexed: false, ignored: true, vcsIgnored: false, muted: isMuted(projName, f) })),
    ...uniq(vc.filter(notIdx)).map(f => ({ path: f, indexed: false, ignored: false, vcsIgnored: true, muted: isMuted(projName, f) }))
  ];
  all.sort((a, b) => a.path.localeCompare(b.path));
  currentSyncFiles = all;
  selectedSyncFiles = new Set(idx);
  syncDesired = new Map();
  for (const e of all) {
    if (e.indexed) syncDesired.set(e.path, 'indexed');
    else if (e.muted) syncDesired.set(e.path, 'ignored');
    else syncDesired.set(e.path, 'unindexed');
  }
}

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
  if (selAllEl) { selAllEl.textContent = t('sync_sel_all'); selAllEl.title = t('sync_sel_all_tip'); }
  const selNoneEl = document.getElementById('btn-sync-sel-none');
  if (selNoneEl) { selNoneEl.textContent = t('sync_sel_none'); selNoneEl.title = t('sync_sel_none_tip'); }
  const selMuteEl = document.getElementById('btn-sync-sel-mute');
  if (selMuteEl) { selMuteEl.textContent = t('sync_sel_mute'); selMuteEl.title = t('sync_sel_mute_tip'); }
  const btnSyncEl = document.getElementById('lbl-btn-sync');
  if (btnSyncEl) btnSyncEl.textContent = t('sync_btn_sync');
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

  // Always fetch latest project list to guarantee fresh file lists
  try {
    const res = await fetch('/api/projects');
    allProjectsList = await res.json();
  } catch (e) {
    console.error('Failed to fetch projects', e);
  }

  const proj = (allProjectsList || []).find(p => p.name === projName);
  currentSyncSubDir = (typeof targetSubDir === 'string' && targetSubDir !== 'null' && targetSubDir !== 'undefined') ? targetSubDir : null;
  buildSyncFileState(proj);

  console.log('Indexing manager:', currentSyncFiles.length, 'files for', projName);
  activePreviewFile = currentSyncFiles.length > 0 ? currentSyncFiles[0].path : null;

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

function segBtnStyle(active, color) {
  return `padding:3px 9px; font-size:0.72rem; border-radius:5px; cursor:pointer; border:1px solid ${active ? color : '#30363d'}; background:${active ? color + '26' : '#21262d'}; color:${active ? color : '#8b949e'}; font-weight:${active ? '600' : '400'};`;
}

function paintSeg(rowEl, active) {
  rowEl.querySelectorAll('.seg-ctl button').forEach(b => {
    const seg = b.getAttribute('data-seg');
    const color = seg === 'indexed' ? '#3fb950' : seg === 'unindexed' ? '#d29922' : '#8b949e';
    b.style.cssText = segBtnStyle(seg === active, color);
  });
}

window.renderSyncFileList = function() {
  const listEl = document.getElementById('syncFileList');
  const searchVal = (document.getElementById('syncModalSearch')?.value || '').trim().toLowerCase();
  if (!listEl) return;

  listEl.innerHTML = '';
  const filtered = currentSyncFiles.filter(e => !searchVal || e.path.toLowerCase().includes(searchVal));

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #6e7681; font-size: 0.85rem;">
        ${currentSyncFiles.length === 0 ? t('sync_no_unindexed') : t('sync_no_match')}
      </div>
    `;
    updateSyncDiffText();
    return;
  }

  filtered.forEach(entry => {
    const filePath = entry.path;
    const rowIndexed = !!entry.indexed;
    const rowIgnored = !!entry.ignored;
    const rowVcs = !!entry.vcsIgnored;
    const rowForced = !!entry.forced;
    const rowMuted = !!entry.muted && !rowIndexed;
    const desiredState = syncDesired.get(filePath) || 'unindexed';
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

    // Badge truth table: green in index, gray muted, yellow attention.
    // Rule/include/git mechanics stay invisible by design.
    let bBg = 'rgba(210,153,34,0.15)', bFg = '#d29922', bBd = 'rgba(210,153,34,0.3)';
    let bTx = t('sync_status_unindexed');
    if (rowIndexed) { bBg = 'rgba(35,134,54,0.15)'; bFg = '#3fb950'; bBd = 'rgba(35,134,54,0.3)'; bTx = t('sync_status_indexed'); }
    if (rowMuted) { bBg = 'rgba(110,118,129,0.15)'; bFg = '#8b949e'; bBd = 'rgba(110,118,129,0.3)'; bTx = t('sync_status_ignored'); }
    row.innerHTML = `
      <div class="seg-ctl" style="display:flex; gap:4px; flex-shrink:0;">
        <button data-seg="indexed" title="${t('seg_indexed_tip')}" style="${segBtnStyle(desiredState === 'indexed', '#3fb950')}">${t('seg_indexed')}</button>
        <button data-seg="unindexed" title="${t('seg_pending_tip')}" style="${segBtnStyle(desiredState === 'unindexed', '#d29922')}">${t('seg_pending')}</button>
        <button data-seg="ignored" title="${t('seg_ignored_tip')}" style="${segBtnStyle(desiredState === 'ignored', '#8b949e')}">${t('seg_ignored')}</button>
      </div>
      <span style="font-size: 1rem;">${icon}</span>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
        <span style="color: ${isActive ? '#58a6ff' : '#c9d1d9'}; font-weight: 500; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fileName}</span>
        ${dirPath ? `<span style="color: #6e7681; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dirPath}</span>` : ''}
      </div>
      <span class="sync-state-badge" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 8px; background: ${bBg}; color: ${bFg}; border: 1px solid ${bBd}; flex-shrink: 0; cursor: pointer;" title="${t('sync_badge_toggle_tip')}">${bTx}</span>
    `;

    row.querySelectorAll('.seg-ctl button').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const want = btn.getAttribute('data-seg');
        setDesired(filePath, want);
        paintSeg(row, want);
        updateSyncDiffText();
      };
    });

    const stateBadge = row.querySelector('.sync-state-badge');
    if (stateBadge) {
      stateBadge.onclick = (e) => {
        e.stopPropagation();
        toggleMute(currentSyncProject, filePath);
      };
    }

    row.onclick = () => {
      activePreviewFile = filePath;
      window.renderSyncFileList();
      window.selectSyncFileForPreview(filePath);
    };

    listEl.appendChild(row);
  });

  updateSyncDiffText();
};

window.filterSyncFileList = function() {
  window.renderSyncFileList();
};

window.toggleAllSyncFiles = function(select) {
  const searchVal = (document.getElementById('syncModalSearch')?.value || '').trim().toLowerCase();
  const visibleFiles = currentSyncFiles.filter(e => !searchVal || e.path.toLowerCase().includes(searchVal));
  const target = select === 'ignored' ? 'ignored' : select ? 'indexed' : 'unindexed';
  
  visibleFiles.forEach(e => {
    setDesired(e.path, target);
  });

  window.renderSyncFileList();
};

function updateSyncDiffText() {
  const countEl = document.getElementById('syncSelectionCount');
  if (countEl) {
    const d = planIndexing();
    countEl.textContent = t('sync_desired_diff', { i: d.idx.length, m: d.kicks.length, k: d.mutes.length, total: currentSyncFiles.length });
  }
}

// Desired-vs-current plan: pure data, no IO. Apply executes it in order:
// exclusions (rules+kick), includes (force+kick), soft kicks, scoped sync.
function planIndexing() {
  const idx = [], soft = [], ign = [], unr = [], frc = [], unfr = [], mutes = [], kicks = [];
  for (const e of currentSyncFiles) {
    const want = syncDesired.get(e.path) || 'unindexed';
    const wasMuted = !!(e.muted) && !e.indexed;
    if (want === 'indexed' && !e.indexed) idx.push(e.path);
    if (want === 'indexed' && e.ignored) unr.push(e.path);
    if (want === 'indexed' && e.vcsIgnored && !e.indexed) frc.push(e.path);
    if (want === 'unindexed' && e.indexed && !e.forced) soft.push(e.path);
    if (want === 'unindexed' && e.forced) unfr.push(e.path);
    if (want === 'ignored' && !e.ignored && !e.vcsIgnored) ign.push(e.path);
    if (want === 'ignored' && !e.indexed && !wasMuted) mutes.push(e.path);
    if (want !== 'indexed' && e.indexed) kicks.push(e.path);
  }
  const ded = (a) => [...new Set(a)];
  return { idx: ded(idx), soft: ded(soft), ign: ded(ign), unr: ded(unr), frc: ded(frc), unfr: ded(unfr), mutes: ded(mutes), kicks: ded(kicks) };
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
    const ent = (currentSyncFiles || []).find(e => e.path === filePath);
    const entMuted = !!(ent && ent.muted) && !(ent && ent.indexed);
    badgeEl.textContent = (ent && ent.indexed) ? t('sync_status_indexed') : entMuted ? t('sync_status_ignored') : t('sync_status_unindexed');
  }
  if (actionsEl) actionsEl.style.display = 'flex';
  // VCS choice: git-blocked files get two honest doors (un-ignore edits
  // version control; force touches only the index). Hidden otherwise.
  const vcsChoice = document.getElementById('syncVcsChoice');
  const vcsEnt = (currentSyncFiles || []).find(e => e.path === filePath);
  const showChoice = !!(vcsEnt && vcsEnt.vcsIgnored && !vcsEnt.indexed);
  if (vcsChoice) {
    vcsChoice.style.display = showChoice ? 'block' : 'none';
    if (showChoice) {
      const lbl = document.getElementById('lbl-sync-vcs-text');
      if (lbl) lbl.textContent = t('sync_vcs_choice_text');
      const bU = document.getElementById('syncVcsUnignore');
      if (bU) {
        bU.textContent = t('sync_vcs_unignore');
        bU.onclick = () => unignoreVcsFile(currentSyncProject, filePath);
      }
      const bF = document.getElementById('syncVcsForce');
      if (bF) {
        bF.textContent = t('sync_vcs_force');
        bF.onclick = () => forceIndexVcsFile(currentSyncProject, filePath);
      }
    }
  }
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

// ==========================================
// File-manager actions: direct per-file index management
// ==========================================
function refreshAfterIndexChange() {
  return fetch('/api/projects')
    .then(res => res.json())
    .then(projs => {
      allProjectsList = projs;
      loadRootGraph();
      if (typeof loadManagerList === 'function') {
        try { loadManagerList(); } catch (e) { /* ignore */ }
      }
    })
    .catch(() => { /* keep last good state */ });
}

window.kickOutFile = async function(project, filePath) {
  if (!project || !filePath) return;
  try {
    const res = await fetch('/api/file/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, file_path: filePath })
    });
    const data = await res.json();
    if (data.success) {
      const r = data.removed || {};
      showToast(t('toast_kicked_out', { n: filePath, nodes: r.nodes || 0, edges: r.edges || 0 }));
      if (data.rule_error) alert(t('rule_save_failed', { e: data.rule_error }));
      setMuted(project, filePath, false);  // kicked files show yellow
      closeDrawer();
      await refreshAfterIndexChange();
    } else {
      alert(t('kickout_failed', { e: data.error || '' }));
    }
  } catch (err) {
    alert(t('kickout_failed', { e: err.message }));
  }
};

window.indexFile = async function(project, filePath, via) {
  if (!project || !filePath) return;
  try {
    if (via === 'vcs') {
      // Git-blocked: force via include gate, sync takes it.
      const inRes = await fetch('/api/project/includes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, add: [filePath], remove: [] })
      });
      const inData = await inRes.json();
      if (!inData.success) {
        alert(t('rule_save_failed', { e: inData.error || '' }));
        return;
      }
    } else {
      // Ruled files are skipped by sync: lift the rule first, then index.
      // Plain pending files: no-op remove, then sync.
      const unRes = await fetch('/api/project/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, add: [], remove: [filePath] })
      });
      const unData = await unRes.json();
      if (!unData.success) {
        alert(t('rule_save_failed', { e: unData.error || '' }));
        return;
      }
    }
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    const data = await res.json();
    const per = data[project];
    if (per && per.success) {
      const m = per.metrics ? per.metrics.after : null;
      showToast(t('toast_indexed_file', { n: filePath, pending: m ? m.pending : '?' }));
      await refreshAfterIndexChange();
    } else {
      alert(t('index_failed', { e: (per && per.error) || data.error || '' }));
    }
  } catch (err) {
    alert(t('index_failed', { e: err.message }));
  }
};

function fmtBytes(b) {
  if (b === null || b === undefined) return '?';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fmtTime(ts) {
  if (!ts) return '?';
  try { return new Date(ts * 1000).toLocaleString(); } catch (e) { return '?'; }
}

// Detail pane: disk truth + index truth side by side (best-effort).
function loadFileMeta(project, filePath) {
  const metaEl = document.getElementById('d-meta');
  if (!metaEl) return;
  metaEl.style.display = 'none';
  metaEl.innerText = '';
  if (!project || !filePath) return;
  fetch(`/api/file/info?project=${encodeURIComponent(project)}&file_path=${encodeURIComponent(filePath)}`)
    .then(res => res.json())
    .then(d => {
      if (!d || !d.success) return;
      if (d.in_index) {
        const rec = d.record || {};
        metaEl.innerText = t('meta_indexed', {
          n: (d.live && d.live.nodes) || 0, e: (d.live && d.live.edges) || 0,
          at: fmtTime(rec.indexed_at),
          size: fmtBytes(d.disk ? d.disk.size : rec.size)
        });
      } else if (d.exists_on_disk) {
        metaEl.innerText = t('meta_unindexed', {
          size: fmtBytes(d.disk ? d.disk.size : null),
          at: fmtTime(d.disk ? d.disk.mtime : null)
        });
      } else {
        metaEl.innerText = t('meta_missing');
      }
      metaEl.style.display = 'block';
    })
    .catch(() => { /* meta is best-effort */ });
}

async function reloadSyncFileList(keepChecks = false) {
  const keep = keepChecks ? new Set(selectedSyncFiles) : null;
  const keepWant = keepChecks ? new Map(syncDesired) : null;
  try {
    const projRes = await fetch('/api/projects');
    allProjectsList = await projRes.json();
  } catch (e) { /* keep last good list */ }
  const proj = (allProjectsList || []).find(p => p.name === currentSyncProject);
  buildSyncFileState(proj);
  if (keep) {
    selectedSyncFiles = new Set([...keep].filter(p => currentSyncFiles.some(e => e.path === p)));
    for (const [p, s] of keepWant) {
      if (currentSyncFiles.some(e => e.path === p)) syncDesired.set(p, s);
    }
  }
  window.renderSyncFileList();
  if (activePreviewFile && currentSyncFiles.some(e => e.path === activePreviewFile)) {
    window.selectSyncFileForPreview(activePreviewFile);
  } else if (currentSyncFiles.length) {
    activePreviewFile = currentSyncFiles[0].path;
    window.selectSyncFileForPreview(activePreviewFile);
  } else {
    activePreviewFile = null;
    resetSyncCodeViewer();
  }
}

window.unignoreVcsFile = async function(project, filePath) {
  if (!project || !filePath) return;
  if (!confirm(t('sync_vcs_unignore_confirm', { n: filePath }))) return;
  try {
    const res = await fetch('/api/project/gitignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, unignore: [filePath] })
    });
    const data = await res.json();
    if (!data.success) {
      alert(t('index_failed', { e: data.error || '' }));
      return;
    }
    const blocked = data.still_blocked || [];
    if (blocked.length > 0) {
      alert(t('sync_vcs_still_blocked', { n: filePath, s: blocked[0].source || '' }));
      return;
    }
    showToast(t('sync_vcs_unignored', { n: filePath }));
    await reloadSyncFileList();
    setDesired(filePath, 'indexed');
    window.renderSyncFileList();
  } catch (err) {
    alert(t('index_failed', { e: err.message }));
  }
};

window.forceIndexVcsFile = async function(project, filePath) {
  if (!project || !filePath) return;
  setDesired(filePath, 'indexed');
  window.renderSyncFileList();
  await window.applyIndexing();
};

// Indexing manager apply: rules first (official gate + instant kick),
// then scoped sync (CLI skips ruled files natively, indexes the rest).
window.applyIndexing = async function() {
  if (!currentSyncProject) return;
  const plan = planIndexing();
  if (plan.idx.length === 0 && plan.soft.length === 0 && plan.ign.length === 0 && plan.unr.length === 0 && plan.frc.length === 0 && plan.unfr.length === 0) {
    showToast(t('sync_nothing_to_do'));
    return;
  }
  // Pure index-new-files goes straight through; anything dropping rows or
  // touching codegraph.json rules asks first.
  const noisy = plan.soft.length + plan.ign.length + plan.unr.length + plan.frc.length + plan.unfr.length;
  if (noisy > 0 && !confirm(t('sync_apply_confirm', { i: plan.idx.length, m: plan.kicks.length, k: plan.mutes.length }))) return;
  const btn = document.getElementById('btnSyncSelected');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> ${t('sync_in_progress')}`;
  }

  try {
    let added = 0, resolved = 0, rfiles = 0;
    if (plan.ign.length > 0 || plan.unr.length > 0 || plan.soft.length > 0) {
      const res = await fetch('/api/project/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentSyncProject, add: plan.ign, remove: [...plan.unr, ...plan.soft] })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'exclusions failed');
      rfiles += (data.kicked && data.kicked.files) || 0;
    }
    if (plan.frc.length > 0 || plan.unfr.length > 0) {
      const resI = await fetch('/api/project/includes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentSyncProject, add: plan.frc, remove: plan.unfr })
      });
      const dataI = await resI.json();
      if (!dataI.success) throw new Error(dataI.error || 'includes failed');
      rfiles += (dataI.kicked && dataI.kicked.files) || 0;
    }
    for (const fp of plan.soft) {
      const resS = await fetch('/api/file/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentSyncProject, file_path: fp, rule: false })
      });
      const dataS = await resS.json();
      if (!dataS.success) throw new Error(dataS.error || ('remove failed: ' + fp));
      rfiles += ((dataS.removed && dataS.removed.files) || 0);
    }
    if (plan.idx.length > 0) {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentSyncProject })
      });
      const data = await res.json();
      const per = data[currentSyncProject];
      if (!per || !per.success) throw new Error((per && per.error) || 'sync failed');
      added = (per.metrics && per.metrics.nodes_added) || 0;
      resolved = (per.metrics && per.metrics.pending_resolved) || 0;
    }
    showToast(t('sync_apply_toast', { added, resolved, rfiles, k: plan.mutes.length }));
    loadRootGraph();
    await reloadSyncFileList();
  } catch (err) {
    alert(t('index_failed', { e: err.message }));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
};

document.addEventListener('click', handleCodeReferenceClick);
