/* galaxy-tree.js — Explorer tree panel, split from galaxy.js. Classic script, shares global scope; load AFTER galaxy.js. */
// ==========================================
// Explorer Panel & Nested Folder Directory Tree
// ==========================================
function toggleTreePanel() {
  const panel = document.getElementById('tree-panel');
  const btn = document.getElementById('btn-toggle-tree');
  panel.classList.toggle('collapsed');
  btn.classList.toggle('active', !panel.classList.contains('collapsed'));
}

function countIndexedInDir(dirObj) {
  if (!dirObj) return 0;
  let count = 0;
  for (const f of Object.values(dirObj.files || {})) {
    if (f && !f.is_unindexed) count++;
  }
  for (const d of Object.values(dirObj.dirs || {})) {
    count += countIndexedInDir(d);
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

// A markdown file on disk always has a doc twin (merged doc nodes cover all
// on-disk .md); folder rows prefer the doc identity so clicks preview markdown.
function treeDocForFile(projName, cleanFilePath) {
  const list = (typeof treeData !== 'undefined' && treeData.nodes) || [];
  for (const n of list) {
    if (n && n.kind === 'doc' && n.project === projName && (n.file_path || '') === cleanFilePath) return n;
  }
  return null;
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
    const sb0 = document.getElementById('tree-statusbar');
    if (sb0) sb0.innerText = t('tree_status', { r: 0, n: 0, f: 0 });
    return;
  }

  document.getElementById('lbl-proj-summary').innerText = t('active_summary', { n: selectedProjects.size });

  const sbEl = document.getElementById('tree-statusbar');
  if (sbEl) {
    const totNodes = readyProjects.reduce((a, p) => a + (p.nodes || 0), 0);
    const totIndexed = readyProjects.reduce((a, p) => a + ((p.indexed_files || []).length), 0);
    sbEl.innerText = t('tree_status', { r: readyProjects.length, n: totNodes, f: totIndexed });
  }

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

  // Ingest rule-ignored + git-blocked rows: kept visible (gray/yellow),
  // rules handled silently. allProjectsList already carries both lists.
  const ingestExtraFiles = (projName, list, flags) => {
    if (!projRoots[projName]) {
      projRoots[projName] = { name: projName, dirs: {}, files: {} };
    }
    (list || []).forEach(fPath => {
      const normPath = fPath.split(String.fromCharCode(92)).join('/').replace(/^\/+/, '');
      const parts = normPath.split('/');
      const fileName = parts.pop();
      let currentDir = projRoots[projName];
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
          is_unindexed: true,
          ...flags
        };
      } else {
        Object.assign(currentDir.files[fileName], flags);
      }
    });
  };
  (allProjectsList || []).forEach(proj => {
    if (!proj || proj.status !== 'ready') return;
    ingestExtraFiles(proj.name, proj.rule_ignored, { is_ignored: true });
    ingestExtraFiles(proj.name, proj.vcs_ignored, { is_vcs: true });
  });

  // Render All Ready Project Roots
  readyProjects.forEach(proj => {
    const projName = proj.name;
    const isSelected = selectedProjects.has(projName);
    const projData = projRoots[projName] || { dirs: {}, files: {} };
    const indexedCount = (proj.indexed_files || []).length;

    const projNodeEl = document.createElement('div');
    projNodeEl.className = 'tree-node';
    projNodeEl.setAttribute('data-tree-proj', projName);
    
    const isProjOpen = openProjs.has(projName);

    projNodeEl.innerHTML = `
      <span class="tree-arrow ${isProjOpen ? 'open' : ''}">▸</span>
      <input type="checkbox" ${isSelected ? 'checked' : ''} title="Toggle project inclusion" />
      <span style="font-weight:600; color:#58a6ff;">📦 ${projName}</span>
      <span class="sync-delta-badge" title="${t('indexed_count_tip', { n: indexedCount })}">⚡ ${indexedCount}</span>
      <span class="node-kind-tag" style="margin-left:4px;">${isSelected ? 'active' : 'off'}</span>
    `;

    const mgrBadgeEl = projNodeEl.querySelector('.sync-delta-badge');
    if (mgrBadgeEl) {
      mgrBadgeEl.onclick = (e) => {
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

    // Project docs folder (first-class doc nodes, independent of code LOD)
    const docList = (treeData.nodes || []).filter(n => n && n.kind === 'doc' && n.project === projName);
    if (docList.length) {
      const docsKey = `${projName}:DOCS`;
      const isDocsOpen = openDirs ? openDirs.has(docsKey) : false;
      const docsNodeEl = document.createElement('div');
      docsNodeEl.className = 'tree-node';
      docsNodeEl.setAttribute('data-tree-dir', docsKey);
      docsNodeEl.innerHTML = `
        <span class="tree-arrow ${isDocsOpen ? 'open' : ''}">▸</span>
        <span style="font-weight:500; color:#e6edf3;">📚 Docs</span>
        <span class="node-kind-tag" style="color:#e3b341; border:1px solid #e3b34155; background:#e3b34114;">${docList.length}</span>
      `;
      const docsChildrenEl = document.createElement('div');
      docsChildrenEl.className = `tree-children ${isDocsOpen ? 'open' : ''}`;
      const docsArrow = docsNodeEl.querySelector('.tree-arrow');
      if (docsArrow) {
        docsArrow.onclick = (e) => {
          e.stopPropagation();
          docsChildrenEl.classList.toggle('open');
          docsArrow.classList.toggle('open');
        };
      }
      docList.sort((a, b) => (a.file_path || '').localeCompare(b.file_path || '')).forEach(d => {
        const dEl = document.createElement('div');
        dEl.className = 'tree-node';
        dEl.setAttribute('data-tree-node-id', d.id);
        dEl.innerHTML = `
          <span class="tree-arrow" style="visibility:hidden;">▸</span>
          <span style="color:#c9d1d9;">📄 ${d.name}</span>
          <span class="node-kind-tag" style="color:#e3b341; border:1px solid #e3b34155; background:#e3b34114;">DOC</span>
        `;
        dEl.onclick = (e) => {
          e.stopPropagation();
          selectTreeNode(dEl);
          openDrawer(d);
          const g = (typeof findGraphNode === 'function') ? findGraphNode(d.id) : null;
          const target = g || d;
          highlightScope('node', target);
          focusOnNode(target);
        };
        if (selectedKey === d.id) {
          selectTreeNode(dEl);
        }
        docsChildrenEl.appendChild(dEl);
      });
      projChildrenEl.appendChild(docsNodeEl);
      projChildrenEl.appendChild(docsChildrenEl);
    }

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
    const indexedCount = countIndexedInDir(subDir);
    const cleanSubPath = (subDir.path || '').split(String.fromCharCode(92)).join('/');
    const dirKey = `${projName}:${cleanSubPath}`;
    const isDirOpen = openDirs ? openDirs.has(dirKey) : false;

    const dirNodeEl = document.createElement('div');
    dirNodeEl.className = 'tree-node';
    dirNodeEl.setAttribute('data-tree-dir', dirKey);

    dirNodeEl.innerHTML = `
      <span class="tree-arrow ${isDirOpen ? 'open' : ''}">▸</span>
      <span style="font-weight:500; color:#e6edf3;">📁 ${dName}</span>
      <span class="sync-delta-badge" style="font-size:9px; padding:0 4px; margin-left:auto;" title="${t('indexed_count_tip', { n: indexedCount })}">⚡ ${indexedCount}</span>
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
    const fileMuted = isUnindexed && isMuted(projName, cleanFilePath);

    const fileNode = isUnindexed ? {
      id: `${projName}:${cleanFilePath}`,
      name: fName,
      kind: 'unindexed_file',
      project: projName,
      file_path: cleanFilePath,
      start_line: 1,
      end_line: 500,
      is_unindexed: true,
      is_ignored: !!fileData.is_ignored,
      is_vcs: !!fileData.is_vcs
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
      if (fileMuted) {
        fileNodeEl.innerHTML = `
          <span class="tree-arrow" style="visibility:hidden;">▸</span>
          <span style="color:#8b949e; font-weight:500;">📄 ${fName}</span>
          <span class="node-kind-tag tree-mute-badge" style="background:#6e768122; color:#8b949e; border:1px solid #6e768155; cursor:pointer;" title="${t('sync_badge_toggle_tip')}">IGNORE</span>
        `;
      } else {
        fileNodeEl.innerHTML = `
          <span class="tree-arrow" style="visibility:hidden;">▸</span>
          <span style="color:#d29922; font-weight:500;">📄 ${fName}</span>
          <span class="node-kind-tag tree-mute-badge" style="background:#d2992222; color:#d29922; border:1px solid #d2992255; cursor:pointer;" title="${t('sync_badge_toggle_tip')}">UNINDEXED</span>
        `;
      }
      const treeBadge = fileNodeEl.querySelector('.tree-mute-badge');
      if (treeBadge) {
        treeBadge.onclick = (e) => {
          e.stopPropagation();
          toggleMute(projName, cleanFilePath, { vcsIgnored: !!fileData.is_vcs, ignored: !!fileData.is_ignored });
        };
      }
    } else {
      fileNodeEl.innerHTML = `
        <span class="tree-arrow ${isFileOpen ? 'open' : ''}">▸</span>
        <span style="color:#c9d1d9;">📄 ${fName}</span>
        <span class="node-kind-tag">${symList.length}</span>
      `;
    }

    const fileChildrenEl = document.createElement('div');
    fileChildrenEl.className = `tree-children ${isFileOpen ? 'open' : ''}`;
    const docTwin = treeDocForFile(projName, cleanFilePath);
    if (docTwin) {
      const tag = fileNodeEl.querySelector('.node-kind-tag');
      if (tag) {
        tag.textContent = 'DOC';
        tag.style.color = '#e3b341';
        tag.style.border = '1px solid #e3b34155';
        tag.style.background = '#e3b34114';
      }
    }

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
      const twin = treeDocForFile(projName, cleanFilePath);
      if (twin) {
        openDrawer(twin);
        const g = (typeof findGraphNode === 'function') ? findGraphNode(twin.id) : null;
        const target = g || twin;
        highlightScope('node', target);
        focusOnNode(target);
        return;
      }
      if (isUnindexed) {
        openUnindexedFileDrawer(fileNode);
      } else {
        highlightScope('file', { project: projName, file_path: cleanFilePath, node: fileNode, symbols: symList });
        openDrawer(fileNode);
        // Tree objects carry no layout coords — focus the live graph node.
        const g = (typeof findGraphNode === 'function') ? findGraphNode(fileNode.id) : null;
        if (g) {
          if (!g._visibleAncestors) g._visibleAncestors = [];
          focusOnNode(g);
        } else if (fileNode.x !== undefined) {
          focusOnNode(fileNode);
        }
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
  clearTempReveal();

  if (Graph) {
    Graph.nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }
}

function clearTempReveal() {
  let had = false;
  try {
    if (tempRevealed.size > 0) had = true;
    tempRevealed.clear();
    if (typeof setChainPills === 'function') setChainPills([]);
  } catch (e) { /* ignore */ }
  if (had) { try { applyFilter(); } catch (e) { /* ignore */ } }
}

async function revealChainForSelect(nodeId, projectHint) {
  clearTempReveal();
  let info = null;
  try {
    const res = await fetch(`/api/chat/node?id=${encodeURIComponent(nodeId)}&project=${encodeURIComponent(projectHint || '')}`);
    info = await res.json();
  } catch (e) { /* backend unreachable */ }
  if (!info || !info.found) return null;
  if (typeof selectedProjects !== 'undefined' && !selectedProjects.has(info.project)) {
    selectedProjects.add(info.project);
    try { loadRootGraph(); } catch (e) { /* ignore */ }
  }
  const chain = [info.id, ...((info.vAncestors) || []).map((a) => a.id)];
  let added = false;
  for (const cid of chain) {
    if (!tempRevealed.has(cid)) { tempRevealed.add(cid); added = true; }
  }
  if (added) { try { applyFilter(); } catch (e) { /* ignore */ } }
  for (let i = 0; i < 40; i++) {
    const hit = (typeof findGraphNode === 'function') ? findGraphNode(nodeId) : null;
    if (hit && hit.x !== undefined && isFinite(hit.x)) return hit;
    await new Promise((r) => setTimeout(r, 250));
  }
  for (const cid of chain) {
    const hit = (typeof findGraphNode === 'function') ? findGraphNode(cid) : null;
    if (hit && hit.x !== undefined && isFinite(hit.x)) {
      if (hit.id !== nodeId) {
        hit._viaAncestor = { id: nodeId, name: info.name, kind: info.kind };
      }
      return hit;
    }
  }
  return null;
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
