/** 全流程 debug 补丁：输入校验、北京时间日期、鉴权文案、图片即时预览、移动失败提示。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }

  function shanghaiDate() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      return map.year + '-' + map.month + '-' + map.day;
    } catch (e) {
      return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  }

  function normalizeSummary() {
    var el = $('fSummary');
    if (!el) return;
    var next = String(el.value || '').replace(/\r?\n+/g, ' ').replace(/[\t ]{2,}/g, ' ').trim();
    if (next !== el.value) el.value = next;
  }

  function normalizeNewDate() {
    var title = $('fTitle'), date = $('fDate');
    if (!date || (title && title.value.trim())) return;
    date.value = shanghaiDate();
  }

  function setStatus(msg, error) {
    var el = $('status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status' + (error ? ' error' : ' success');
  }

  function validSlug() {
    var el = $('fSlug');
    if (!el) return true;
    var slug = el.value.trim();
    if (!slug) return true; // 核心逻辑允许标题自动生成 slug
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  function fixLoginCopy() {
    var desc = document.querySelector('.login-desc');
    if (desc) desc.textContent = '管理口令仅在浏览器本地校验；GitHub Token 保存在当前浏览器，并通过 HTTPS 直接发送至 GitHub API，本站没有独立后端接收或保存 Token。';
    var input = $('tokenInput');
    if (input) input.placeholder = 'github_pat_... 或 ghp_...';
    var help = document.querySelector('.login-help');
    if (help) {
      var link = help.querySelector('ol a');
      if (link) {
        link.href = 'https://github.com/settings/personal-access-tokens/new';
        link.textContent = 'GitHub Fine-grained personal access tokens';
      }
      var ol = help.querySelector('ol');
      if (ol) ol.innerHTML = '<li>打开 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub Fine-grained personal access tokens</a></li><li>Expiration 建议 90 天；Repository access 选择 <strong>Only select repositories → math-hut</strong></li><li>Repository permissions 只需设置 <strong>Contents: Read and write</strong>（Metadata 保持只读）</li><li>生成后复制 <code>github_pat_...</code> 粘贴到上方；旧的 Classic PAT 仍可用，但不建议新建高权限 <code>repo</code> Token</li>';
    }

    // 旧核心日志曾按 Classic PAT 假定“期望 40 位”；Fine-grained PAT 长度不同，移除误导文字。
    var log = $('loginLog');
    if (log) {
      new MutationObserver(function () {
        log.querySelectorAll('div').forEach(function (row) {
          if (row.textContent.indexOf('（期望 40）') >= 0) row.textContent = row.textContent.replace('（期望 40）', '（长度因 Token 类型而异）');
        });
      }).observe(log, { childList: true, subtree: true });
    }
  }

  function rawImageUrl(src) {
    var base = String(H.base || '/');
    if (!base.startsWith('/')) base = '/' + base;
    if (!base.endsWith('/')) base += '/';
    var prefix = base + 'images/';
    if (src.indexOf(prefix) !== 0) return '';
    var rel = src.slice(prefix.length);
    return 'https://raw.githubusercontent.com/' + encodeURIComponent(H.owner) + '/' + encodeURIComponent(H.repo) + '/' + encodeURIComponent(H.branch) + '/' + String(H.imagesDir || '').split('/').map(encodeURIComponent).join('/') + '/' + rel.split('/').map(encodeURIComponent).join('/');
  }

  function refreshPreviewImages() {
    var preview = $('preview');
    if (!preview) return;
    preview.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      var raw = rawImageUrl(src);
      if (raw && img.dataset.hutRaw !== raw) {
        img.dataset.hutRaw = raw;
        img.src = raw; // 新上传图片无需等待 Pages 部署即可在后台预览
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fixLoginCopy();

    // 自动登录/首次进入后台后，核心 newFile() 可能使用 UTC 日期；检测空白编辑器并纠正。
    var app = $('appView');
    if (app) {
      new MutationObserver(function () {
        if (!app.hidden) setTimeout(normalizeNewDate, 0);
      }).observe(app, { attributes: true, attributeFilter: ['hidden'] });
    }
    setTimeout(normalizeNewDate, 500);

    // 后台预览中的新图片改走 GitHub raw，避免等待 Pages 构建 1~3 分钟。
    var preview = $('preview');
    if (preview) {
      new MutationObserver(function () { setTimeout(refreshPreviewImages, 0); }).observe(preview, { childList: true, subtree: true });
      refreshPreviewImages();
    }

    // 捕获阶段先规范字段；校验不通过则阻止核心保存处理器执行。
    document.addEventListener('click', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('#saveBtn,#saveDraftBtn,#newBtn,.tab[data-tab="articles"],.tab[data-tab="pages"]') : null;
      if (!target) return;
      if (target.id === 'saveBtn' || target.id === 'saveDraftBtn') {
        normalizeSummary();
        if (!validSlug()) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          setStatus('保存失败：slug 仅允许小写英文字母、数字和连字符，例如 linear-algebra。', true);
          if (window.HUTProgress) window.HUTProgress.error('slug 格式不正确');
          var slug = $('fSlug'); if (slug) slug.focus();
          return;
        }
      } else {
        setTimeout(normalizeNewDate, 0);
      }
    }, true);

    // 安全重命名采用“先写新文件、再删旧文件”。若删除旧文件失败，提醒用户处理重复文件。
    window.addEventListener('hut:move-warning', function (ev) {
      var d = ev.detail || {};
      setStatus('⚠️ 新文件已安全保存，但旧文件未能删除：' + (d.oldPath || '未知路径') + '。请刷新列表后删除重复旧文件。', false);
      if (window.HUTProgress) window.HUTProgress.done('新文件已保存；旧文件待清理');
    });
  });
})();
