/**
 * 后台逻辑：登录 → 列表 → 编辑（实时预览）→ 保存 / 删除
 */
(function () {
  var H = window.__HUT__ || {};
  var $ = function (id) { return document.getElementById(id); };

  var state = { list: [], current: null, dirty: false };

  /* ---------------- 口令校验（仅防误操作） ---------------- */
  async function sha256(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function checkPass(pw) {
    var hex = await sha256((H.passSalt || '') + pw);
    return hex === H.passHash;
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
    if (!md) { $('previewTip').textContent = '（预览不可用，编辑与保存不受影响）'; return; }
    try { el.innerHTML = md.render($('fBody').value || ''); }
    catch (e) { el.innerHTML = '<p style="color:#c00">预览出错：' + e.message + '</p>'; }
  }

  /* ---------------- front-matter 拼装 / 解析 ---------------- */
  function buildFile() {
    var fm = [
      '---',
      'title: "' + String($('fTitle').value || '').replace(/"/g, '\\"') + '"',
      'date: ' + ($('fDate').value || new Date().toISOString().slice(0, 10)),
      'tags: [' + String($('fTags').value || '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return '"' + s.replace(/"/g, '\\"') + '"'; }).join(', ') + ']',
      'summary: "' + String($('fSummary').value || '').replace(/"/g, '\\"') + '"',
      'slug: "' + String($('fSlug').value || '').trim() + '"',
      'draft: ' + ($('fDraft').checked ? 'true' : 'false'),
      '---',
      '',
    ].join('\n');
    return fm + ($('fBody').value || '').replace(/^\s+/, '');
  }

  function parseFile(text) {
    var out = { title: '', date: '', tags: '', summary: '', slug: '', draft: false, body: text };
    var m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (!m) return out;
    var fm = m[1];
    out.body = text.slice(m[0].length);
    function get(key) {
      var r = new RegExp('^' + key + ':\\s*(.*)$', 'm').exec(fm);
      if (!r) return '';
      return String(r[1]).trim().replace(/^["']|["']$/g, '');
    }
    out.title = get('title');
    out.date = get('date');
    out.summary = get('summary');
    out.slug = get('slug');
    out.draft = /draft:\s*true/i.test(fm);
    var t = /tags:\s*\[(.*?)\]/s.exec(fm);
    out.tags = t ? t[1].split(',').map(function (s) { return s.trim().replace(/^["']|["']$/g, ''); }).filter(Boolean).join(', ') : '';
    return out;
  }

  /* ---------------- 列表 ---------------- */
  async function loadList() {
    var ul = $('postList');
    ul.innerHTML = '<li class="admin-loading">加载中…</li>';
    try {
      state.list = await window.GH.list();
      ul.innerHTML = '';
      if (!state.list.length) {
        ul.innerHTML = '<li class="admin-empty">还没有文章，点「＋ 新建」</li>';
        return;
      }
      state.list.forEach(function (f) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = 'javascript:void(0)';
        a.textContent = f.name;
        a.onclick = function () { openFile(f); };
        li.appendChild(a);
        if (state.current && state.current.path === f.path) li.className = 'active';
        ul.appendChild(li);
      });
      $('repoInfo').textContent = H.owner + '/' + H.repo + ' · ' + H.branch + ' · ' + state.list.length + ' 篇';
    } catch (e) {
      ul.innerHTML = '<li class="admin-empty">加载失败：' + e.message + '</li>';
    }
  }

  async function openFile(f) {
    if (state.dirty && !confirm('有未保存的修改，确定要切换吗？')) return;
    setStatus('读取中…');
    try {
      var r = await window.GH.read(f.path);
      fill(r.text);
      state.current = { path: f.path, sha: r.sha };
      state.dirty = false;
      setStatus('已载入 ' + f.name + '（记得保存后等待约 2 分钟生效）');
      loadList();
    } catch (e) { setStatus('读取失败：' + e.message, true); }
  }

  function fill(text) {
    var d = parseFile(text || '');
    $('fTitle').value = d.title;
    $('fDate').value = d.date || new Date().toISOString().slice(0, 10);
    $('fTags').value = d.tags;
    $('fSummary').value = d.summary;
    $('fSlug').value = d.slug;
    $('fDraft').checked = d.draft;
    $('fBody').value = d.body;
    renderPreview();
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function newPost() {
    state.current = null;
    $('fTitle').value = '';
    $('fDate').value = today();
    $('fTags').value = '';
    $('fSummary').value = '';
    $('fSlug').value = '';
    $('fDraft').checked = true;
    $('fBody').value = '## 小标题\n\n正文……\n\n行间公式：\n\n$$\nE = mc^2\n$$\n';
    state.dirty = false;
    renderPreview();
    setStatus('新建文章：填写标题与 slug 后保存');
  }

  function fileName() {
    var slug = ($('fSlug').value || '').trim();
    if (!slug) {
      slug = String($('fTitle').value || 'untitled')
        .trim().toLowerCase().replace(/\s+/g, '-')
        .replace(/[\\/:*?"<>|#]+/g, '');
      if (!slug) slug = 'untitled';
    }
    var prefix = $('fDraft').checked ? '_draft-' : '';
    return prefix + ($('fDate').value || today()) + '-' + slug + '.md';
  }

  /* ---------------- 保存 / 删除 ---------------- */
  async function save() {
    if (!$('fTitle').value.trim()) { setStatus('标题不能为空', true); return; }
    var name = fileName();
    var path = H.postsDir + '/' + name;
    var oldPath = state.current ? state.current.path : null;
    setStatus('提交中…');

    try {
      var res;
      if (oldPath && oldPath === path) {
        res = await window.GH.save(path, buildFile(), state.current.sha, '更新文章：' + $('fTitle').value);
      } else {
        if (oldPath) {
          await window.GH.remove(oldPath, state.current.sha, '重命名/移动：' + oldPath);
          res = await window.GH.save(path, buildFile(), null, '新增文章：' + $('fTitle').value);
        } else {
          res = await window.GH.save(path, buildFile(), null, '新增文章：' + $('fTitle').value);
        }
      }
      state.current = { path: path, sha: res.sha };
      state.dirty = false;
      setStatus('✅ 已提交到 GitHub，Actions 构建 + Pages 部署约 1.5~3 分钟后生效。可到 ' +
        'https://github.com/' + H.owner + '/' + H.repo + '/actions 查看进度。');
      loadList();
    } catch (e) {
      var tip = e.status === 409 ? '远端已变化，请刷新列表后重试（409）'
        : e.status === 401 || e.status === 403 ? 'Token 无效或权限不足，请重新登录（' + e.status + '）'
        : e.message;
      setStatus('保存失败：' + tip, true);
    }
  }

  async function del() {
    if (!state.current) { setStatus('请先选择一篇文章', true); return; }
    if (!confirm('确定删除 ' + state.current.path + ' 吗？此操作会直接提交到 GitHub。')) return;
    try {
      await window.GH.remove(state.current.path, state.current.sha, '删除文章：' + state.current.path);
      state.current = null;
      newPost();
      setStatus('✅ 已删除，约 2 分钟后线上生效');
      loadList();
    } catch (e) { setStatus('删除失败：' + e.message, true); }
  }

  function setStatus(msg, isError) {
    var el = $('status');
    el.textContent = msg || '';
    el.className = 'admin-status' + (isError ? ' error' : '');
  }

  /* ---------------- 登录 ---------------- */
  function showApp() {
    $('loginView').hidden = true;
    $('appView').hidden = false;
    loadList();
    newPost();
  }

  async function tryAutoLogin() {
    if (!window.GH.getToken()) return;
    try { await window.GH.verify(); showApp(); } catch (e) { window.GH.clearToken(); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 已存 Token 直接进入
    tryAutoLogin();

    $('loginForm').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var err = $('loginError');
      err.hidden = true;
      var pass = $('passInput').value;
      var token = $('tokenInput').value.trim();
      if (!pass || !token) { err.textContent = '口令与 Token 都要填'; err.hidden = false; return; }

      $('loginBtn').disabled = true;
      $('loginBtn').textContent = '验证中…';
      try {
        var ok = await checkPass(pass);
        if (!ok) throw new Error('口令不正确');
        window.GH.setToken(token, $('remember').checked);
        await window.GH.verify();
        showApp();
      } catch (e) {
        err.textContent = e.message || '登录失败';
        err.hidden = false;
        window.GH.clearToken();
      } finally {
        $('loginBtn').disabled = false;
        $('loginBtn').textContent = '进入后台';
      }
    });

    $('newBtn').onclick = newPost;
    $('saveBtn').onclick = save;
    $('deleteBtn').onclick = del;
    $('logoutBtn').onclick = function () { window.GH.clearToken(); location.reload(); };

    ['fTitle', 'fDate', 'fTags', 'fSummary', 'fSlug', 'fDraft'].forEach(function (id) {
      $(id).addEventListener('input', function () { state.dirty = true; });
      $(id).addEventListener('change', function () { state.dirty = true; });
    });

    var timer = null;
    $('fBody').addEventListener('input', function () {
      state.dirty = true;
      clearTimeout(timer);
      timer = setTimeout(renderPreview, 300);
    });

    window.addEventListener('beforeunload', function (ev) {
      if (state.dirty) { ev.preventDefault(); ev.returnValue = ''; }
    });
  });
})();
