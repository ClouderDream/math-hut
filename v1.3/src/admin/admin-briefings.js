/** 后台“简报”独立标签：与普通文章共用编辑器，但列表隔离并强制保留科研标签。 */
(function () {
  var H = window.__HUT__ || {};
  var viewMode = 'articles';
  var switching = false;

  function $(id) { return document.getElementById(id); }
  function briefTab() { return document.querySelector('.tab[data-tab="briefings"]'); }
  function articleTab() { return document.querySelector('.tab[data-tab="articles"]'); }

  function rawName(a) {
    return String((a && (a.title || a.textContent)) || '').trim();
  }
  function isBriefAnchor(a) {
    return /research-frontier-daily/i.test(rawName(a));
  }

  function applyListFilter() {
    var list = $('postList');
    if (!list) return;
    list.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a');
      if (!a) { li.hidden = false; return; }
      if (viewMode === 'briefings') li.hidden = !isBriefAnchor(a);
      else if (viewMode === 'articles') li.hidden = isBriefAnchor(a);
      else li.hidden = false;
    });
  }

  function setBriefingChrome() {
    var b = briefTab();
    var a = articleTab();
    if (a) a.classList.remove('active');
    if (b) b.classList.add('active');
    if ($('headerTitle')) $('headerTitle').textContent = '简报管理';
    if ($('sideTitle')) $('sideTitle').textContent = '每日简报';
    if ($('newBtn')) $('newBtn').hidden = false;
    if ($('listSearch')) $('listSearch').hidden = false;
    if ($('postList')) $('postList').hidden = false;
    if ($('sideMeta')) $('sideMeta').hidden = false;
    if ($('tab-articles')) $('tab-articles').hidden = false;
  }

  function activateBriefings() {
    var a = articleTab();
    if (!a) return;
    switching = true;
    a.click(); // 复用核心文章加载/编辑逻辑
    switching = false;
    viewMode = 'briefings';
    setBriefingChrome();
    setTimeout(function () { setBriefingChrome(); applyListFilter(); }, 0);
    setTimeout(function () { setBriefingChrome(); applyListFilter(); }, 250);
  }

  function addTag(name) {
    var box = $('tagBox');
    if (box && box.querySelector('[data-tag="' + name + '"]')) return;
    var input = $('tagInput');
    if (!input) return;
    input.value = name;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  }

  function ensureBriefingTags() {
    if (viewMode !== 'briefings') return;
    addTag('科研前沿');
    addTag('每日简报');
  }

  function setNewBriefDefaults() {
    if (viewMode !== 'briefings') return;
    var date = $('fDate') && $('fDate').value;
    if (!date) return;
    if ($('fTitle')) $('fTitle').value = '科研前沿每日简报 · ' + date;
    if ($('fSlug')) $('fSlug').value = 'research-frontier-daily-' + date;
    if ($('fSummary')) $('fSummary').value = '';
    ensureBriefingTags();
    if ($('fBody')) {
      $('fBody').value = '今天简报聚焦值得继续跟踪的科研与学术前沿。\n\n## 1. 标题\n\n### 摘要\n\n### 为什么重要\n\n### 研究启发\n\n### 来源\n\n## 今日值得继续追踪的 3 个问题\n\n1. \n2. \n3. \n';
      $('fBody').dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var tabs = document.querySelector('.admin-header .tabs');
    if (tabs && !briefTab()) {
      var b = document.createElement('button');
      b.className = 'tab';
      b.dataset.tab = 'briefings';
      b.textContent = '简报';
      var pages = tabs.querySelector('[data-tab="pages"]');
      tabs.insertBefore(b, pages || null);
    }

    var list = $('postList');
    if (list) new MutationObserver(function () { setTimeout(applyListFilter, 0); }).observe(list, { childList: true, subtree: true });

    document.addEventListener('click', function (ev) {
      var tab = ev.target.closest && ev.target.closest('.tab[data-tab]');
      if (tab) {
        if (tab.dataset.tab === 'briefings') {
          ev.preventDefault();
          activateBriefings();
          return;
        }
        if (!switching) viewMode = tab.dataset.tab === 'articles' ? 'articles' : tab.dataset.tab;
        setTimeout(applyListFilter, 0);
      }

      if (ev.target && ev.target.id === 'newBtn' && viewMode === 'briefings') {
        setTimeout(setNewBriefDefaults, 0);
      }
    });

    // 保存按钮的核心 onclick 在 target 阶段执行，因此捕获阶段先补齐简报固定标签。
    document.addEventListener('click', function (ev) {
      if (viewMode !== 'briefings') return;
      var target = ev.target && ev.target.closest ? ev.target.closest('#saveBtn,#saveDraftBtn') : null;
      if (target) ensureBriefingTags();
    }, true);

    // 普通“文章”列表默认不再混入每日简报。
    setTimeout(applyListFilter, 300);
  });
})();
