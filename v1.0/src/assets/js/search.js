/**
 * 全站搜索（零依赖）
 * 中文用 bigram 二元切分 + 词频加权；字段权重 标题/标签 8 : 摘要 3 : 正文 1
 */
(function () {
  var BASE = (function () {
    // 从当前脚本自身位置推断 base，兼容子路径部署
    var s = document.currentScript && document.currentScript.src;
    if (!s) return '/';
    var u = new URL(s, location.href);
    var p = u.pathname;               // /math-hut/assets/js/search.js
    var i = p.indexOf('/assets/');
    return i >= 0 ? p.slice(0, i + 1) : '/';
  })();

  var docs = null;
  var loading = false;
  var MAX = 20;

  /* ---------------- 分词 ---------------- */
  function tokenize(text) {
    var s = String(text || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ');
    var out = [];
    var segs = s.split(' ');
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      if (!seg) continue;
      out.push(seg);                                  // 整词（利于英文精确命中）
      if (seg.length > 2) {
        for (var j = 0; j < seg.length - 1; j++) out.push(seg.slice(j, j + 2)); // bigram
      }
    }
    return out;
  }

  function countTerms(text) {
    var g = tokenize(text), tf = Object.create(null);
    for (var i = 0; i < g.length; i++) tf[g[i]] = (tf[g[i]] || 0) + 1;
    return tf;
  }

  /* ---------------- 打分 ---------------- */
  function search(query) {
    if (!docs) return [];
    var q = tokenize(query).filter(function (x, i, a) { return a.indexOf(x) === i; });
    if (!q.length) return [];

    var W = { title: 8, summary: 3, body: 1 };
    var res = [];
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      var fields = {
        title: (d.title || '') + ' ' + (d.tags || []).join(' '),
        summary: d.summary || '',
        body: d.body || '',
      };
      var score = 0, hit = 0;
      for (var k in W) {
        var tf = countTerms(fields[k]);
        for (var n = 0; n < q.length; n++) {
          if (tf[q[n]]) { score += W[k] * (1 + Math.log(tf[q[n]])); if (k !== 'body') hit++; }
        }
      }
      if (score > 0 && hit >= Math.ceil(q.length * 0.5)) {
        res.push({ doc: d, score: score });
      }
    }
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, MAX).map(function (r) { return r.doc; });
  }

  /* ---------------- 摘要片段 ---------------- */
  function snippet(text, query, len) {
    len = len || 90;
    var t = String(text || '').replace(/\s+/g, ' ');
    var key = query.trim().slice(0, 12);
    var idx = key ? t.toLowerCase().indexOf(key.toLowerCase()) : -1;
    if (idx < 0) {
      for (var i = 0; i < key.length - 1; i++) {
        idx = t.toLowerCase().indexOf(key.slice(i, i + 2).toLowerCase());
        if (idx >= 0) break;
      }
    }
    if (idx < 0) return t.slice(0, len) + (t.length > len ? '…' : '');
    var start = Math.max(0, idx - 30);
    return (start > 0 ? '…' : '') + t.slice(start, start + len) + (t.length > start + len ? '…' : '');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function highlight(text, query) {
    var out = escapeHtml(snippet(text, query));
    var key = escapeHtml(query.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (key) out = out.replace(new RegExp(key, 'gi'), function (m) { return '<mark>' + m + '</mark>'; });
    return out;
  }

  /* ---------------- 渲染 ---------------- */
  function renderResults(container, list, query) {
    if (!list.length) {
      container.innerHTML = '<p class="search-hint">没有找到相关内容，换个关键词试试。</p>';
      return;
    }
    container.innerHTML = list.map(function (d) {
      return '<article class="search-result">' +
        '<h3 class="search-result-title"><a href="' + escapeHtml(d.url) + '">' + escapeHtml(d.title) + '</a></h3>' +
        '<p class="search-result-snippet">' + highlight(d.body || d.summary, query) + '</p>' +
        '<p class="search-result-meta"><time>' + escapeHtml(d.date || '') + '</time>' +
        (d.tags || []).map(function (t) { return '<span class="tag-chip sm">' + escapeHtml(t) + '</span>'; }).join('') +
        '</p></article>';
    }).join('');
  }

  async function ensureIndex() {
    if (docs || loading) return docs;
    loading = true;
    try {
      var res = await fetch(BASE + 'search-index.json');
      docs = await res.json();
    } catch (e) {
      docs = [];
    }
    loading = false;
    return docs;
  }

  /* ---------------- 搜索页 ---------------- */
  var pageInput = document.getElementById('searchInputPage');
  var pageResults = document.getElementById('searchResultsPage');
  var pageHint = document.getElementById('searchHintPage');

  function doSearch(q) {
    if (!pageInput) return;
    pageInput.value = q || '';
    if (!q) { if (pageResults) pageResults.innerHTML = ''; if (pageHint) pageHint.textContent = '输入至少 1 个字符开始搜索。'; return; }
    if (pageHint) pageHint.textContent = '搜索中…';
    return ensureIndex().then(function () {
      var list = search(q);
      if (pageHint) pageHint.textContent = '找到 ' + list.length + ' 条结果（关键词：「' + q + '」）';
      renderResults(pageResults, list, q);
    });
  }

  if (pageInput && pageResults) {
    var timer = null;
    pageInput.addEventListener('input', function () {
      clearTimeout(timer);
      var q = pageInput.value.trim();
      timer = setTimeout(function () { doSearch(q); }, 180);
    });

    // 从 URL ?q= 读取初始查询
    var initial = (new URLSearchParams(location.search)).get('q');
    if (initial) {
      pageInput.value = initial;
      doSearch(initial);
    }
  }

  /* ---------------- 顶部搜索弹层 ---------------- */
  var openBtn = document.getElementById('searchOpen');
  if (openBtn) {
    var overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML =
      '<div class="search-modal">' +
      '<div class="search-box">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input type="search" id="searchInputModal" placeholder="搜索文章…" autocomplete="off">' +
      '<button class="btn sm ghost" id="searchClose" type="button">关闭</button>' +
      '</div>' +
      '<div class="search-modal-body" id="searchResultsModal"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var modalInput = overlay.querySelector('#searchInputModal');
    var modalResults = overlay.querySelector('#searchResultsModal');

    function close() { overlay.classList.remove('open'); document.body.style.overflow = ''; }
    function open() {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { modalInput.focus(); }, 30);
      ensureIndex();
    }

    openBtn.addEventListener('click', open);
    overlay.querySelector('#searchClose').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); open(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
    });

    var mtimer = null;
    modalInput.addEventListener('input', function () {
      clearTimeout(mtimer);
      var q = modalInput.value.trim();
      mtimer = setTimeout(async function () {
        if (!q) { modalResults.innerHTML = '<p class="search-hint">输入关键词开始搜索。</p>'; return; }
        await ensureIndex();
        var list = search(q);
        if (!list.length) {
          modalResults.innerHTML = '<p class="search-hint">没有找到「' + escapeHtml(q) + '」相关内容。</p>';
          return;
        }
        renderResults(modalResults, list, q);
      }, 180);
    });
  }
})();
