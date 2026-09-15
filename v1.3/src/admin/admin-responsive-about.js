/** 后台响应式与“关于”入口修复：不同分辨率稳定布局；页面 Tab 直接作为关于页入口。 */
(function () {
  function $(id) { return document.getElementById(id); }

  function addStyle() {
    if ($('adminResponsiveAboutStyle')) return;
    var s = document.createElement('style');
    s.id = 'adminResponsiveAboutStyle';
    s.textContent = `
      .admin-app,
      .admin-header,
      .admin-main,
      .admin-side,
      .editor-wrap,
      .editor-pane { min-width: 0; }
      .admin-header { min-width: 0; }
      .admin-header .tabs {
        min-width: 0; overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap;
        -webkit-overflow-scrolling: touch; scrollbar-width: thin; overscroll-behavior-x: contain;
      }
      .admin-header .tab {
        flex: 0 0 auto; min-width: max-content; white-space: nowrap;
        word-break: keep-all; writing-mode: horizontal-tb;
      }
      .admin-toolbar,.row-flex,.meta-row,.shortcut-head,.media-toolbar { min-width: 0; }
      .admin-toolbar .title-input,.row-flex input,.meta-row .field,.field-grow { min-width: 0; }

      .admin-app.admin-about-mode {
        grid-template-columns: 1fr !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
        grid-template-areas: "header" "main" !important;
      }
      .admin-app.admin-about-mode .admin-side { display: none !important; }
      .admin-app.admin-about-mode .admin-main { min-width: 0; }

      @media (max-width: 1320px) {
        .admin-app:not(.admin-wide):not(.admin-about-mode) { grid-template-columns: 240px minmax(0, 1fr); }
        .admin-header { padding-left: 18px; padding-right: 18px; gap: 12px; }
        .admin-header .tab { padding: 8px 12px; }
        .admin-main { padding: 24px 22px; }
        .admin-side-head { padding-left: 16px; padding-right: 16px; }
        .admin-list li a { padding-left: 16px; padding-right: 16px; }
      }
      @media (max-width: 1080px) {
        .admin-header { height: auto; min-height: 66px; padding-top: 10px; padding-bottom: 10px; align-items: center; }
        .admin-header h2 { flex: 0 0 auto; }
        .admin-header .tabs { flex: 1 1 auto; margin-left: 8px; }
        .admin-toolbar { gap: 8px; }
        .admin-toolbar .title-input { flex-basis: 100%; }
        .editor-wrap { gap: 14px; }
      }
      @media (max-width: 900px) {
        .admin-body { overflow: hidden; }
        .admin-app:not(.admin-about-mode) {
          grid-template-columns: 1fr !important;
          grid-template-rows: auto auto minmax(0, 1fr) !important;
          grid-template-areas: "header" "side" "main" !important;
          height: 100dvh;
        }
        .admin-app.admin-wide {
          grid-template-rows: auto minmax(0, 1fr) !important;
          grid-template-areas: "header" "main" !important;
        }
        .admin-app.admin-wide .admin-side { display: none !important; }
        .admin-side { max-height: 190px; border-right: 0; border-bottom: 1px solid var(--admin-border); }
        .admin-side-head { padding-top: 12px; padding-bottom: 12px; }
        .admin-side-meta { padding-top: 7px; padding-bottom: 7px; }
        .admin-search { padding-top: 9px; padding-bottom: 9px; }
        .admin-header { position: relative; z-index: 20; }
        .admin-main { padding: 18px 16px; }
      }
      @media (max-width: 720px) {
        .admin-header { display: block; padding: 10px 12px 8px; }
        .admin-header h2 { margin: 0 0 8px; font-size: 16px; }
        .admin-header .tabs {
          display: flex; width: 100%; margin: 0; gap: 6px; padding-bottom: 3px;
        }
        .admin-header .tab { padding: 7px 12px; font-size: 12px; }
        .admin-side { max-height: 165px; }
        .admin-main { padding: 14px 12px 28px; }
        .admin-toolbar { align-items: stretch; }
        .admin-toolbar .title-input { width: 100%; flex: 1 0 100%; }
        .admin-toolbar .btn { flex: 1 1 auto; }
        .meta-row { grid-template-columns: 1fr !important; }
        .row-flex { display: flex; flex-wrap: wrap; gap: 8px; }
        .row-flex > input { flex: 1 1 100%; width: 100%; }
        .editor-wrap { grid-template-columns: 1fr !important; height: auto !important; }
        .editor-pane { min-height: 300px; }
        .symbol-bar { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
        .symbol-bar > * { flex: 0 0 auto; }
      }
      @media (max-width: 480px) {
        .admin-header .tab { padding: 7px 10px; }
        .admin-side-head { padding: 10px 12px; }
        .admin-search { padding: 8px 12px; }
        .admin-list li a { padding: 10px 12px; }
        .admin-main { padding-left: 10px; padding-right: 10px; }
        .btn { padding-left: 14px; padding-right: 14px; }
      }
    `;
    document.head.appendChild(s);
  }

  function renamePagesTab() {
    var tab = document.querySelector('.tab[data-tab="pages"]');
    if (tab) {
      tab.textContent = '关于';
      tab.setAttribute('aria-label', '编辑关于本站');
      tab.title = '编辑关于本站';
    }
  }

  function setAboutMode(on) {
    var app = $('appView');
    if (!app) return;
    app.classList.toggle('admin-about-mode', !!on);
    var active = document.querySelector('.tab.active');
    if (on) {
      if ($('headerTitle')) $('headerTitle').textContent = '关于本站';
      if ($('newBtn')) $('newBtn').hidden = true;
    } else if (active && active.dataset.tab === 'articles') {
      if ($('newBtn')) $('newBtn').hidden = false;
    }
  }

  function openAboutWhenReady() {
    var list = $('postList');
    if (!list) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var tab = document.querySelector('.tab.active');
      if (!tab || tab.dataset.tab !== 'pages') { clearInterval(timer); return; }
      var links = Array.from(list.querySelectorAll('a'));
      var about = links.find(function (a) {
        var raw = ((a.title || '') + ' ' + (a.textContent || '')).toLowerCase();
        return raw.indexOf('about.md') >= 0 || raw.indexOf('关于') >= 0;
      });
      if (about) {
        clearInterval(timer);
        about.click();
        setTimeout(function () {
          if ($('headerTitle')) $('headerTitle').textContent = '关于本站';
        }, 0);
      } else if (tries >= 30) clearInterval(timer);
    }, 100);
  }

  document.addEventListener('DOMContentLoaded', function () {
    addStyle();
    renamePagesTab();
    document.addEventListener('click', function (ev) {
      var tab = ev.target && ev.target.closest ? ev.target.closest('.tab[data-tab]') : null;
      if (!tab) return;
      var isAbout = tab.dataset.tab === 'pages';
      setTimeout(function () {
        setAboutMode(isAbout);
        if (isAbout) openAboutWhenReady();
      }, 0);
    }, true);
    var tabs = document.querySelector('.admin-header .tabs');
    if (tabs) new MutationObserver(renamePagesTab).observe(tabs, { childList: true, subtree: true, characterData: true });
  });
})();
