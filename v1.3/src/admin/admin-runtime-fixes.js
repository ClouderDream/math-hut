/** 全流程 debug 补丁：输入校验、北京时间日期、移动失败提示。 */
(function () {
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

  document.addEventListener('DOMContentLoaded', function () {
    // 自动登录/首次进入后台后，核心 newFile() 可能使用 UTC 日期；检测空白编辑器并纠正。
    var app = $('appView');
    if (app) {
      new MutationObserver(function () {
        if (!app.hidden) setTimeout(normalizeNewDate, 0);
      }).observe(app, { attributes: true, attributeFilter: ['hidden'] });
    }
    setTimeout(normalizeNewDate, 500);

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
