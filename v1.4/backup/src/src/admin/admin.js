/**
 * 后台逻辑 v1.1：登录 → 文章 / 页面 / 媒体库 / 站点设置
 */
(function () {
  var H = window.__HUT__ || {};
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    list: [], current: null, dirty: false,
    tags: new Set(), allTags: [], images: [],
    settings: null, settingsSha: '',
    mode: 'articles',
  };

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---------------- 口令校验 ---------------- */
  function subtleAvailable() {
    return !!(typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest);
  }
  async function sha256(text) {
    if (!subtleAvailable()) throw new Error('当前环境不支持 Web Crypto。请用 https 访问，或换用 Chrome/Edge/Firefox 最新版。');
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function checkPass(pw) {
    return await sha256((H.passSalt || '') + pw) === H.passHash;
  }

  /** 给任意 Promise 加超时，防止界面永久停在「验证中…」 */
  function withTimeout(p, ms, msg) {
    return Promise.race([
      p,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error(msg || ('超时（' + (ms / 1000) + 's）'))); }, ms);
      }),
    ]);
  }

  function setLoginError(msg, html) {
    var err = $('loginError');
    err[html ? 'innerHTML' : 'textContent'] = msg;
    err.hidden = false;
  }

  /* 把每一步结果写到登录卡片的暗色日志里，方便排查 */
  var LOG_KEYS = [];
  function log(msg, level) {
    var box = $('loginLog');
    if (!box) return;
    box.classList.add('show');
    var d = new Date();
    var ts = d.toTimeString().slice(0, 8);
    var span = document.createElement('div');
    var cls = level === 'err' ? 'log-err' : level === 'ok' ? 'log-ok' : '';
    span.className = cls;
    span.textContent = '[' + ts + '] ' + msg;
    box.appendChild(span);
    box.scrollTop = box.scrollHeight;
  }
  function clearLog() {
    var box = $('loginLog');
    if (box) { box.innerHTML = ''; box.classList.remove('show'); }
  }

  /* ---------------- Markdown 预览 ---------------- */
  var md = null;
  try {
    if (window.markdownit) {
      // v1.2 安全加固：html:false 防止恶意 Markdown 注入脚本窃取 localStorage 中的 PAT
      md = window.markdownit({ html: false, linkify: true });
      if (window.mathPlugin) {
        md.use(window.mathPlugin);
        window.mathPlugin.setOptions({ throwOnError: false, macros: H.macros || {}, output: 'htmlAndMathml' });
      }
    }
  } catch (e) { md = null; }

  function renderPreview() {
    var el = $('preview');
    if (!el) return;
    if (!md) { el.innerHTML = '<p style="color:var(--admin-muted)">预览不可用（markdown-it 未加载），编辑与保存不受影响。</p>'; return; }
    try { el.innerHTML = md.render($('fBody').value || ''); }
    catch (e) { el.innerHTML = '<p style="color:#c00">预览出错：' + escapeHtml(e.message) + '</p>'; }
  }

  /* ---------------- front-matter ---------------- */
  function buildFile() {
    var tags = Array.from(state.tags).filter(Boolean);
    var cover = ($('fCover').value || '').trim();
    var lines = ['---'];
    lines.push('title: "' + String($('fTitle').value || '').replace(/"/g, '\\"') + '"');
    lines.push('date: ' + ($('fDate').value || today()));
    lines.push('tags: [' + tags.map(function (t) { return '"' + String(t).replace(/"/g, '\\"') + '"'; }).join(', ') + ']');
    lines.push('summary: "' + String($('fSummary').value || '').replace(/"/g, '\\"') + '"');
    lines.push('slug: "' + String($('fSlug').value || '').trim().replace(/"/g, '\\"') + '"');
    if (cover) lines.push('cover: "' + cover.replace(/"/g, '\\"') + '"');
    lines.push('draft: ' + ($('fDraft').checked ? 'true' : 'false'));
    lines.push('---', '');
    return lines.join('\n') + ($('fBody').value || '').replace(/^\s+/, '');
  }

  function parseFile(text) {
    var out = { title: '', date: '', tags: '', summary: '', slug: '', draft: false, cover: '', body: text };
    var m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (!m) return out;
    var fm = m[1]; out.body = text.slice(m[0].length);
    function get(key) {
      var r = new RegExp('^' + key + ':\\s*(.*)$', 'm').exec(fm);
      return r ? String(r[1]).trim().replace(/^["']|["']$/g, '') : '';
    }
    out.title = get('title'); out.date = get('date'); out.summary = get('summary'); out.slug = get('slug'); out.cover = get('cover');
    out.draft = /draft:\\s*true/i.test(fm);
    var t = /tags:\\s*\[(.*?)\]/s.exec(fm);
    out.tags = t ? t[1].split(',').map(function (s) { return s.trim().replace(/^["']|["']$/g, ''); }).filter(Boolean).join(', ') : '';
    return out;
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function fileName() {
    var slug = ($('fSlug').value || '').trim();
    if (!slug) slug = String($('fTitle').value || 'untitled').trim().toLowerCase().replace(/\s+/g, '-').replace(/[\\\\/:*?"<>|#]+/g, '');
    if (!slug) slug = 'untitled';
    if (state.mode === 'pages') return slug + '.md';
    var prefix = $('fDraft').checked ? '_draft-' : '';
    return prefix + ($('fDate').value || today()) + '-' + slug + '.md';
  }

  function currentDir() { return state.mode === 'pages' ? H.pagesDir : H.postsDir; }

  function setStatus(id, msg, isError) {
    var el = $(id || 'status');
    el.textContent = msg || '';
    el.className = 'status' + (isError ? ' error' : msg ? ' success' : '');
  }

  /* ---------------- 标签 ---------------- */
  function renderTags() {
    var input = $('tagInput');
    var chips = Array.from(state.tags).map(function (t) {
      return '<span class="tag-chip">' + escapeHtml(t) + '<button type="button" data-tag="' + escapeHtml(t) + '">×</button></span>';
    }).join('');
    $('tagBox').innerHTML = chips;
    $('tagBox').appendChild(input);
    input.value = '';
  }
  function addTag(name) {
    name = String(name).trim(); if (!name) return;
    state.tags.add(name); renderTags(); state.dirty = true; renderSuggestions();
  }
  function removeTag(name) { state.tags.delete(name); renderTags(); state.dirty = true; renderSuggestions(); }
  function renderSuggestions() {
    var suggestions = state.allTags.filter(function (t) { return !state.tags.has(t); }).slice(0, 12);
    var box = $('tagSuggestions');
    if (!box) return;
    if (!suggestions.length) {
      var hint = box.getAttribute('data-empty') || '暂无建议标签';
      box.innerHTML = '<span class="tag-hint">' + escapeHtml(hint) + '</span>';
      return;
    }
    box.innerHTML = '建议：' + suggestions.map(function (t) {
      return '<button type="button" class="suggest" data-add="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    }).join('');
  }

  /* ---------------- 列表 ---------------- */
  async function loadList() {
    var ul = $('postList');
    ul.innerHTML = '<li class="empty">加载中…</li>';
    try {
      var items = await window.GH.listDir(currentDir());
      state.list = items.filter(function (f) { return f.type === 'file' && /\.md$/i.test(f.name); }).map(function (f) {
        return { name: f.name, path: f.path, sha: f.sha, size: f.size };
      }).sort(function (a, b) { return b.name.localeCompare(a.name); });
      renderList();
      $('sideMeta').textContent = H.owner + '/' + H.repo + ' · ' + (state.mode === 'pages' ? '页面 ' : '') + state.list.length + ' 个';
      if (state.mode === 'articles') collectAllTags();
    } catch (e) {
      ul.innerHTML = '<li class="empty">加载失败：' + escapeHtml(e.message) + '</li>';
    }
  }
  function renderList() {
    var ul = $('postList');
    var q = ($('listSearch').value || '').trim().toLowerCase();
    var filtered = q ? state.list.filter(function (f) { return f.name.toLowerCase().includes(q); }) : state.list;
    if (!filtered.length) { ul.innerHTML = '<li class="empty">还没有内容</li>'; return; }
    ul.innerHTML = '';
    filtered.forEach(function (f) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.textContent = f.name; a.onclick = function () { openFile(f); };
      if (state.current && state.current.path === f.path) li.className = 'active';
      li.appendChild(a); ul.appendChild(li);
    });
  }
  async function collectAllTags() {
    var set = new Set();
    for (var i = 0; i < Math.min(state.list.length, 50); i++) {
      try {
        var r = await window.GH.read(state.list[i].path);
        var p = parseFile(r.text);
        if (p.tags) p.tags.split(/[,，]/).forEach(function (t) { if (t.trim()) set.add(t.trim()); });
      } catch (e) {}
    }
    state.allTags = Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'zh'); });
    renderSuggestions();
  }
  async function openFile(f) {
    if (state.dirty && !confirm('有未保存的修改，确定要切换吗？')) return;
    setStatus('status', '读取中…');
    try {
      var r = await window.GH.read(f.path);
      fill(r.text);
      state.current = { path: f.path, sha: r.sha };
      state.dirty = false;
      setStatus('status', '已载入 ' + f.name + '（保存后约 1~3 分钟生效）');
      renderList();
    } catch (e) { setStatus('status', '读取失败：' + e.message, true); }
  }
  function fill(text) {
    var d = parseFile(text || '');
    $('fTitle').value = d.title;
    $('fDate').value = d.date || today();
    $('fSummary').value = d.summary;
    $('fSlug').value = d.slug;
    $('fCover').value = d.cover;
    $('fDraft').checked = d.draft;
    $('fBody').value = d.body;
    state.tags = new Set(d.tags ? d.tags.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : []);
    renderTags(); renderPreview();
  }
  function newFile() {
    state.current = null;
    $('fTitle').value = '';
    $('fDate').value = today();
    $('fSummary').value = '';
    $('fSlug').value = state.mode === 'pages' ? 'new-page' : '';
    $('fCover').value = '';
    $('fDraft').checked = false;
    $('fBody').value = state.mode === 'pages'
      ? '## 小标题\n\n页面正文……\n'
      : '## 小标题\n\n正文……\n\n行间公式：\n\n$$\nE = mc^2\n$$\n';
    state.tags = new Set();
    renderTags();
    state.dirty = false;
    renderPreview();
    setStatus('status', state.mode === 'pages' ? '新建页面：填写标题与 slug 后保存' : '新建文章：填写标题与 slug 后保存');
    renderList();
  }

  async function save(isDraft) {
    if (!$('fTitle').value.trim()) { setStatus('status', '标题不能为空', true); return; }
    if (isDraft !== undefined) $('fDraft').checked = !!isDraft;
    var name = fileName();
    var path = currentDir() + '/' + name;
    var oldPath = state.current ? state.current.path : null;
    setStatus('status', '提交中…');
    try {
      var res;
      if (oldPath && oldPath === path) {
        res = await window.GH.save(path, buildFile(), state.current.sha, '更新：' + $('fTitle').value);
      } else {
        if (oldPath) await window.GH.remove(oldPath, state.current.sha, '重命名/移动：' + oldPath);
        res = await window.GH.save(path, buildFile(), null, '新增：' + $('fTitle').value);
      }
      state.current = { path: path, sha: res.sha };
      state.dirty = false;
      setStatus('status', '✅ 已提交到 GitHub，约 1~3 分钟后线上生效');
      await loadList();
    } catch (e) {
      var tip = e.status === 409 ? '远端已变化，请刷新列表后重试（409）'
        : e.status === 401 || e.status === 403 ? 'Token 无效或权限不足（' + e.status + '）'
        : e.message;
      setStatus('status', '保存失败：' + tip, true);
    }
  }
  async function del() {
    if (!state.current) { setStatus('status', '请先选择一项', true); return; }
    if (!confirm('确定删除 ' + state.current.path + ' 吗？此操作会直接提交到 GitHub。')) return;
    try {
      await window.GH.remove(state.current.path, state.current.sha, '删除：' + state.current.path);
      state.current = null; newFile();
      setStatus('status', '✅ 已删除，约 2 分钟后线上生效');
      await loadList();
    } catch (e) { setStatus('status', '删除失败：' + e.message, true); }
  }

  /* ---------------- 媒体库 ---------------- */
  function imageUrl(name) { return String(H.base || '/').replace(/\/$/, '') + '/images/' + name; }
  async function loadMedia() {
    var grid = $('mediaGrid');
    grid.innerHTML = '<div class="empty">加载中…</div>';
    try {
      var items = await window.GH.listDir(H.imagesDir);
      state.images = items.filter(function (f) { return f.type === 'file' && /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name); });
      renderMedia();
    } catch (e) { grid.innerHTML = '<div class="empty">加载失败：' + escapeHtml(e.message) + '</div>'; }
  }
  function renderMedia() {
    var grid = $('mediaGrid');
    if (!state.images.length) { grid.innerHTML = '<div class="empty">还没有图片，点击上方上传</div>'; return; }
    grid.innerHTML = '';
    state.images.forEach(function (img) {
      var div = document.createElement('div');
      div.className = 'media-item';
      div.title = '点击选择：' + img.name;
      div.innerHTML = '<img class="media-thumb" src="' + imageUrl(img.name) + '" alt="" loading="lazy"><div class="media-name">' + escapeHtml(img.name) + '</div>';
      div.onclick = function () { onPickImage('images/' + img.name); };
      grid.appendChild(div);
    });
  }
  function arrToB64(buffer) {
    var bytes = new Uint8Array(buffer);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  async function uploadImage(file) {
    setStatus('uploadStatus', '上传 ' + file.name + '…');
    try {
      var buf = await file.arrayBuffer();
      var path = H.imagesDir + '/' + file.name;
      var sha = null;
      try { var r = await window.GH.read(path); sha = r.sha; } catch (e) {}
      await window.GH.saveBinary(path, arrToB64(buf), sha, (sha ? '更新图片：' : '新增图片：') + file.name);
      setStatus('uploadStatus', '✅ ' + file.name + ' 已上传', false);
      await loadMedia();
    } catch (e) { setStatus('uploadStatus', '上传失败：' + e.message, true); }
  }
  var pickTarget = 'cover';
  function onPickImage(path) {
    if (pickTarget === 'cover') $('fCover').value = path;
    else $('sBanner').value = path;
    state.dirty = true;
    switchTab(state.mode === 'pages' ? 'pages' : 'articles');
    setStatus('status', '已选择图片：' + path, false);
  }

  /* ---------------- 站点设置 ---------------- */
  async function loadSettings() {
    try {
      var r = await window.GH.read(H.siteConfigPath);
      state.settings = JSON.parse(r.text);
      state.settingsSha = r.sha;
    } catch (e) {
      state.settings = { site: {}, nav: [], social: [] };
      state.settingsSha = '';
    }
    var s = state.settings.site || {};
    $('sTitle').value = s.title || '';
    $('sSubtitle').value = s.subtitle || '';
    $('sDesc').value = s.description || '';
    $('sAuthor').value = s.author || '';
    $('sCopyright').value = s.copyright || '';
    $('sBanner').value = s.banner || '';
    $('sNav').value = JSON.stringify(state.settings.nav || [], null, 2);
    $('sSocial').value = JSON.stringify(state.settings.social || [], null, 2);
  }
  async function saveSettings(ev) {
    ev.preventDefault();
    setStatus('settingsStatus', '保存中…');
    try {
      var site = {
        title: $('sTitle').value.trim(),
        subtitle: $('sSubtitle').value.trim(),
        description: $('sDesc').value.trim(),
        author: $('sAuthor').value.trim(),
        copyright: $('sCopyright').value.trim(),
      };
      if ($('sBanner').value.trim()) site.banner = $('sBanner').value.trim();
      var nav = JSON.parse($('sNav').value);
      var social = JSON.parse($('sSocial').value);
      var payload = JSON.stringify({ site: site, nav: nav, social: social }, null, 2) + '\n';
      await window.GH.save(H.siteConfigPath, payload, state.settingsSha || undefined, '更新站点设置');
      setStatus('settingsStatus', '✅ 站点设置已保存，约 1~3 分钟后线上生效', false);
    } catch (e) {
      setStatus('settingsStatus', '保存失败：' + (e.message || 'JSON 格式错误'), true);
    }
  }

  /* ---------------- 信任状态徽章 ---------------- */
  function refreshTrustBadge() {
    var el = $('trustInfo');
    if (!el) return;
    var info = window.GH && window.GH.trustInfo ? window.GH.trustInfo() : { active: false };
    if (info.active) {
      el.hidden = false;
      el.classList.remove('expired');
      el.textContent = '🔒 信任此电脑 · 剩余 ' + info.remainingDays + ' 天';
    } else {
      el.hidden = false;
      el.classList.add('expired');
      el.textContent = '🔓 未启用长期信任（每次登录需要重新输入）';
    }
  }

  /* ---------------- 常用符号工具栏 ---------------- */
  function isInsideMath(text, pos) {
    var count = 0;
    for (var i = 0; i < pos; i++) {
      if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) count++;
    }
    return count % 2 === 1;
  }
  function insertAtCursor(textarea, text, cursorOffset) {
    textarea.focus();
    var start = textarea.selectionStart, end = textarea.selectionEnd;
    var v = textarea.value;
    textarea.value = v.slice(0, start) + text + v.slice(end);
    var pos = start + (cursorOffset !== undefined ? cursorOffset : text.length);
    textarea.setSelectionRange(pos, pos);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function insertSymbol(btn) {
    var ta = $('fBody'); if (!ta) return;
    var ins = btn.getAttribute('data-insert') || '';
    var wrap = btn.getAttribute('data-wrap') || '';
    var start = ta.selectionStart, end = ta.selectionEnd;
    var selected = ta.value.slice(start, end) || '';
    var text = ins, cursorOffset;

    if (wrap) {
      var placeholders = wrap.match(/\{[^}]*\}/g) || [];
      if (selected && placeholders.length) {
        var used = false;
        text = ins + wrap.replace(/\{[^}]*\}/g, function (m) { return used ? m : (used = true, selected); });
        var remaining = text.match(/\{[^}]*\}/);
        if (remaining) cursorOffset = text.indexOf(remaining[0]) + 1;
      } else {
        text = ins + wrap;
        var first = text.match(/\{[^}]*\}/);
        if (first) cursorOffset = text.indexOf(first[0]) + 1;
      }
    }

    // LaTeX 命令如果不在 $...$ 内，自动包裹，避免裸字出现在正文
    if (/^\\[a-zA-Z]+/.test(text) && !isInsideMath(ta.value, start)) {
      text = '$' + text + '$';
      cursorOffset = cursorOffset !== undefined ? cursorOffset + 1 : text.length - 1;
    }

    insertAtCursor(ta, text, cursorOffset);
  }

  /* ---------------- 导出 PDF ---------------- */
  function exportArticlePdf() {
    var preview = $('preview');
    var title = ($('fTitle').value || '').trim() || '未命名文章';
    if (!preview || !preview.innerHTML.trim()) {
      alert('预览为空，请先写一些内容再导出。');
      return;
    }
    // 临时插入打印用的标题与元信息（打印样式下显示）
    var titleEl = document.createElement('div');
    titleEl.className = 'pdf-title';
    titleEl.textContent = title;
    var metaEl = document.createElement('div');
    metaEl.className = 'pdf-meta';
    var date = $('fDate').value || new Date().toISOString().slice(0, 10);
    var author = (H.config && H.config.author) || '';
    var parts = [date];
    if (author) parts.push(author);
    parts.push(window.location.origin);
    metaEl.textContent = parts.join(' · ');

    preview.insertBefore(metaEl, preview.firstChild);
    preview.insertBefore(titleEl, preview.firstChild);
    // 隐藏主体上的非打印元素
    document.body.classList.add('printing');
    var cleanup = function () {
      document.body.classList.remove('printing');
      if (titleEl.parentNode) titleEl.parentNode.removeChild(titleEl);
      if (metaEl.parentNode) metaEl.parentNode.removeChild(metaEl);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(function () { window.print(); }, 50);
  }

  /* ---------------- 拖拽上传 ---------------- */
  function isImageFile(f) { return /^image\/(jpe?g|png|webp|gif|svg\+xml)$/i.test(f.type); }
  function bindDropzone() {
    var dz = $('dropzone');
    if (!dz) return;
    var prevent = function (e) { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { prevent(e); dz.classList.add('drag'); });
    });
    ['dragleave', 'dragend', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { prevent(e); dz.classList.remove('drag'); });
    });
    dz.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      Array.prototype.forEach.call(files, function (f) {
        if (!isImageFile(f)) {
          setStatus('uploadStatus', '跳过非图片：' + f.name, true);
          return;
        }
        if (f.size > 5 * 1024 * 1024) {
          setStatus('uploadStatus', '跳过过大（>5MB）：' + f.name, true);
          return;
        }
        uploadImage(f);
      });
    });
  }

  /* ---------------- 正文插图上传 ---------------- */
  async function uploadInlineImage(file) {
    setStatus('status', '上传 ' + file.name + '…');
    try {
      var buf = await file.arrayBuffer();
      var path = H.imagesDir + '/' + file.name;
      var sha = null;
      try { var r = await window.GH.read(path); sha = r.sha; } catch (e) {}
      await window.GH.saveBinary(path, arrToB64(buf), sha, (sha ? '更新图片：' : '新增图片：') + file.name);
      await loadMedia();
      return 'images/' + file.name;
    } catch (e) { setStatus('status', '上传失败：' + e.message, true); throw e; }
  }
  async function insertInlineImage(file) {
    var path = await uploadInlineImage(file);
    var alt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    insertAtCursor($('fBody'), '![' + alt + '](' + path + ')');
    setStatus('status', '✅ 已插入图片：' + path, false);
    state.dirty = true;
    renderPreview();
  }
  function bindInlineImageDrop() {
    var ta = $('fBody'); if (!ta) return;
    var prevent = function (e) { e.preventDefault(); e.stopPropagation(); };
    ta.addEventListener('dragover', prevent);
    ta.addEventListener('drop', function (e) {
      prevent(e);
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      Array.prototype.forEach.call(files, function (f) {
        if (!isImageFile(f)) { setStatus('status', '跳过非图片：' + f.name, true); return; }
        if (f.size > 5 * 1024 * 1024) { setStatus('status', '跳过过大（>5MB）：' + f.name, true); return; }
        insertInlineImage(f);
      });
    });
  }

  /* ---------------- 视图切换 ---------------- */
  function switchTab(name) {
    state.mode = name;
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    // 「文章」与「页面」共用 #tab-articles 编辑区，其余各自独立
    ['media', 'settings'].forEach(function (n) {
      var el = $('tab-' + n);
      if (el) el.hidden = n !== name;
    });
    var editor = $('tab-articles');
    if (editor) editor.hidden = !(name === 'articles' || name === 'pages');
    var isEditor = name === 'articles' || name === 'pages';
    $('newBtn').hidden = !isEditor;
    $('listSearch').hidden = !isEditor;
    $('postList').hidden = !isEditor;
    $('sideMeta').hidden = !isEditor;
    $('headerTitle').textContent = name === 'articles' ? '文章管理' : name === 'pages' ? '页面管理' : name === 'media' ? '媒体库' : '站点设置';
    $('sideTitle').textContent = name === 'articles' ? '文章列表' : name === 'pages' ? '页面列表' : '侧边栏';
    if (name === 'articles' || name === 'pages') { loadList(); newFile(); renderSuggestions(); }
    if (name === 'media') loadMedia();
    if (name === 'settings') loadSettings();
  }

  function showApp() {
    $('loginView').hidden = true;
    $('appView').hidden = false;
    var editor = $('tab-articles');
    if (editor) editor.hidden = false;
    switchTab('articles');
  }

  /* 捕获未处理异常，避免「点了没反应」的静默卡死 */
  function fatal(msg) {
    var box = $('loginError');
    if (box && $('loginView') && !$('loginView').hidden) {
      box.textContent = '出错了：' + msg;
      box.hidden = false;
    }
    var st = $('status');
    if (st) { st.textContent = '出错了：' + msg; st.className = 'status error'; }
  }
  async function tryAutoLogin() {
    if (!window.GH.getToken()) return;
    try { await window.GH.verify(); showApp(); } catch (e) { window.GH.clearToken(); }
  }

  /* ---------------- 初始化 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('error', function (ev) { fatal(ev.message || '未知错误'); });
    window.addEventListener('unhandledrejection', function (ev) {
      fatal((ev.reason && ev.reason.message) || String(ev.reason));
    });

    tryAutoLogin();

    log('页面就绪，构建版本 ' + ((document.querySelector('.login-version') || {}).textContent || '?').replace('构建版本','').trim());

    // 网络自检：登录前先探测 api.github.com 是否可达，避免卡在「验证中…」
    (function () {
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 8000);
      log('网络自检：探测 https://api.github.com/（8s 超时）…');
      fetch('https://api.github.com/', { method: 'GET', signal: ctl.signal })
        .then(function (res) { clearTimeout(t); return res.status; })
        .catch(function () { clearTimeout(t); return 0; })
        .then(function (st) {
          if (!st) {
            setLoginError('⚠️ 当前浏览器无法访问 api.github.com，登录会卡住。请检查网络/代理，或关闭拦截类浏览器插件后重试。', true);
            log('网络自检：不可达 ❌', 'err');
          } else {
            log('网络自检：可达（HTTP ' + st + '）', 'ok');
          }
        });
    })();

    $('tokenToggle').addEventListener('click', function () {
      var input = $('tokenInput');
      input.type = input.type === 'password' ? 'text' : 'password';
      $('tokenToggle').textContent = input.type === 'password' ? '显示' : '隐藏';
    });

    $('loginForm').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var err = $('loginError'); err.hidden = true; err.textContent = '';
      var pass = $('passInput').value;
      var token = $('tokenInput').value.trim();
      if (!pass || !token) { setLoginError('口令与 Token 都要填'); return; }
      clearLog();
      log('口令长度=' + pass.length + '，Token 长度=' + token.length + '（期望 40）');
      $('loginBtn').disabled = true;
      try {
        $('loginBtn').textContent = '① 校验口令…';
        log('① 开始校验口令');
        var ok;
        try {
          ok = await withTimeout(checkPass(pass), 8000, '口令校验超时（8s）');
        } catch (e) { throw new Error('口令校验失败：' + e.message); }
        if (!ok) { log('① 口令不正确', 'err'); setLoginError('管理口令不正确'); return; }
        log('① 口令正确', 'ok');

        $('loginBtn').textContent = '② 校验 Token…';
        log('② 调用 GitHub /repos/ClouderDream/math-hut 验证 Token（最多 15s）');
        window.GH.setToken(token, $('remember').checked);
        try {
          await withTimeout(window.GH.verify(), 15000, 'Token 校验超时（15s）');
          log('② Token 有效（仓库可访问）', 'ok');
        } catch (e) {
          var status = e.status || 0;
          var tip = status === 401 || status === 403
            ? 'Token 无效或权限不足。请确认：① 没有复制多余空格；② Token 已勾选 repo（Classic）或 Contents 读写（Fine-grained）；③ Token 未过期。'
            : '无法连接 GitHub：' + (e.message || ('HTTP ' + status))
              + '<br>若你用 Edge：edge://settings/privacy → 跟踪防护 → 选「基本」或在例外添加 api.github.com / clouderdream.github.io 后重试。';
          log('② 失败 status=' + status + ' msg=' + (e.message || ''), 'err');
          throw new Error(tip);
        }

        $('loginBtn').textContent = '③ 载入后台…';
        log('③ 进入后台');
        showApp();
      } catch (e) {
        setLoginError(e.message || '登录失败', true);
        window.GH.clearToken();
      } finally { $('loginBtn').disabled = false; $('loginBtn').textContent = '进入后台'; }
    });

    /* 仅测试 Token 是否能访问 api.github.com（不校验口令） */
    $('testTokenBtn').addEventListener('click', async function () {
      var token = $('tokenInput').value.trim();
      var out = $('testResult');
      out.hidden = false;
      out.textContent = '正在请求 https://api.github.com/user …';
      if (!token) { out.textContent = '请先填入 Token。'; return; }
      try {
        var ctl = new AbortController();
        var t = setTimeout(function () { ctl.abort(); }, 12000);
        var res = await fetch('https://api.github.com/user', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' },
          signal: ctl.signal,
        });
        clearTimeout(t);
        var body = '';
        try { body = (await res.json()).login || (await res.clone().text()).slice(0, 200); } catch (e) {}
        out.textContent = 'HTTP ' + res.status + '\nlogin: ' + body + (res.status === 200 ? '\n✅ Token 有效' : '\n❌ 失败：' + (body || ('HTTP ' + res.status)));
      } catch (e) {
        out.textContent = '❌ 请求失败：' + e.message + '\n（典型原因：网络/代理拦截、Edge 跟踪防护、CORS 失败、Token 为空）';
      }
    });

    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(t.dataset.tab); });
    });

    $('newBtn').onclick = newFile;
    $('saveBtn').onclick = function () { save(false); };
    $('saveDraftBtn').onclick = function () { save(true); };
    $('deleteBtn').onclick = del;
    $('logoutBtn').onclick = function () { window.GH.clearToken(); refreshTrustBadge(); location.reload(); };
    $('listSearch').addEventListener('input', renderList);

    $('tagInput').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); addTag($('tagInput').value); }
      if (ev.key === 'Backspace' && !$('tagInput').value && state.tags.size) removeTag(Array.from(state.tags).pop());
    });
    $('tagInput').addEventListener('blur', function () { if ($('tagInput').value.trim()) addTag($('tagInput').value); });
    $('tagSuggestions').addEventListener('click', function (ev) { var btn = ev.target.closest('[data-add]'); if (btn) addTag(btn.dataset.add); });
    $('tagBox').addEventListener('click', function (ev) { var btn = ev.target.closest('[data-tag]'); if (btn) removeTag(btn.dataset.tag); else $('tagInput').focus(); });

    $('pickCoverBtn').onclick = function () { pickTarget = 'cover'; switchTab('media'); };
    $('pickBannerBtn').onclick = function () { pickTarget = 'banner'; switchTab('media'); };
    var clearCoverBtn = $('clearCoverBtn');
    if (clearCoverBtn) clearCoverBtn.onclick = function () { $('fCover').value = ''; state.dirty = true; };

    // 拖拽上传
    bindDropzone();
    bindInlineImageDrop();

    $('inlineImageBtn').addEventListener('click', function () { $('inlineImageInput').click(); });
    $('inlineImageInput').addEventListener('change', function (ev) {
      Array.prototype.forEach.call(ev.target.files || [], function (f) { insertInlineImage(f); });
      ev.target.value = '';
    });

    $('uploadInput').addEventListener('change', function (ev) {
      Array.prototype.forEach.call(ev.target.files || [], function (f) {
        if (!isImageFile(f)) { setStatus('uploadStatus', '跳过非图片：' + f.name, true); return; }
        if (f.size > 5 * 1024 * 1024) { setStatus('uploadStatus', '跳过过大（>5MB）：' + f.name, true); return; }
        uploadImage(f);
      });
      ev.target.value = '';
    });

    // 符号工具栏
    var symbolBar = $('symbolBar');
    if (symbolBar) {
      symbolBar.addEventListener('click', function (ev) {
        var btn = ev.target.closest('.sym');
        if (btn) insertSymbol(btn);
      });
    }

    // 导出 PDF
    var exportBtn = $('exportPdfBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportArticlePdf);

    // 信任徽章
    refreshTrustBadge();
    setInterval(refreshTrustBadge, 60 * 1000);

    $('settingsForm').addEventListener('submit', saveSettings);

    ['fTitle', 'fDate', 'fSummary', 'fSlug', 'fCover', 'fDraft'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener('input', function () { state.dirty = true; });
      el.addEventListener('change', function () { state.dirty = true; });
    });
    var timer = null;
    $('fBody').addEventListener('input', function () {
      state.dirty = true; clearTimeout(timer); timer = setTimeout(renderPreview, 300);
    });

    window.addEventListener('beforeunload', function (ev) { if (state.dirty) { ev.preventDefault(); ev.returnValue = ''; } });
  });
})();
