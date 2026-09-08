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

  function setLoginError(msg, html) {
    var err = $('loginError');
    err[html ? 'innerHTML' : 'textContent'] = msg;
    err.hidden = false;
  }

  /* ---------------- Markdown 预览 ---------------- */
  var md = null;
  try {
    if (window.markdownit) {
      md = window.markdownit({ html: true, linkify: true });
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
    $('tagSuggestions').innerHTML = suggestions.length
      ? '建议：' + suggestions.map(function (t) {
          return '<button type="button" class="suggest" data-add="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
        }).join('')
      : '';
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

  /* ---------------- 视图切换 ---------------- */
  function switchTab(name) {
    state.mode = name;
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    ['articles', 'pages', 'media', 'settings'].forEach(function (n) {
      var el = n === 'pages' ? $('tab-articles') : $('tab-' + n);
      if (el) el.hidden = !(n === name || (name === 'pages' && n === 'articles'));
    });
    var isEditor = name === 'articles' || name === 'pages';
    $('newBtn').hidden = !isEditor;
    $('listSearch').hidden = !isEditor;
    $('postList').hidden = !isEditor;
    $('sideMeta').hidden = !isEditor;
    $('headerTitle').textContent = name === 'articles' ? '文章管理' : name === 'pages' ? '页面管理' : name === 'media' ? '媒体库' : '站点设置';
    $('sideTitle').textContent = name === 'articles' ? '文章列表' : name === 'pages' ? '页面列表' : '侧边栏';
    if (name === 'articles' || name === 'pages') { loadList(); newFile(); }
    if (name === 'media') loadMedia();
    if (name === 'settings') loadSettings();
  }

  function showApp() {
    $('loginView').hidden = true;
    $('appView').hidden = false;
    switchTab('articles');
  }
  async function tryAutoLogin() {
    if (!window.GH.getToken()) return;
    try { await window.GH.verify(); showApp(); } catch (e) { window.GH.clearToken(); }
  }

  /* ---------------- 初始化 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    tryAutoLogin();

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
      $('loginBtn').disabled = true; $('loginBtn').textContent = '验证中…';
      try {
        var ok = await checkPass(pass);
        if (!ok) { setLoginError('管理口令不正确'); return; }
        window.GH.setToken(token, $('remember').checked);
        try {
          await window.GH.verify();
        } catch (e) {
          var status = e.status || 0;
          var tip = status === 401 || status === 403
            ? 'Token 无效或权限不足。请确认：① 没有复制多余空格；② Token 已勾选 repo（Classic）或 Contents 读写（Fine-grained）；③ Token 未过期。'
            : '无法连接 GitHub 校验 Token：' + (e.message || ('HTTP ' + status));
          throw new Error(tip);
        }
        showApp();
      } catch (e) {
        setLoginError(e.message || '登录失败', true);
        window.GH.clearToken();
      } finally { $('loginBtn').disabled = false; $('loginBtn').textContent = '进入后台'; }
    });

    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(t.dataset.tab); });
    });

    $('newBtn').onclick = newFile;
    $('saveBtn').onclick = function () { save(false); };
    $('saveDraftBtn').onclick = function () { save(true); };
    $('deleteBtn').onclick = del;
    $('logoutBtn').onclick = function () { window.GH.clearToken(); location.reload(); };
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

    $('uploadInput').addEventListener('change', function (ev) {
      var file = ev.target.files[0];
      if (file) uploadImage(file);
      ev.target.value = '';
    });

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
