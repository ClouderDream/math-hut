/* 移动端菜单开合 */
(function () {
  var btn = document.getElementById('menuToggle');
  var nav = document.getElementById('siteNav');
  if (!btn || !nav) return;

  var BREAKPOINT = 860;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    document.body.classList.toggle('mobile-menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    btn.textContent = open ? '×' : '☰';
  }

  btn.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  // 点击导航项后自动收起
  nav.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) setOpen(false);
  });

  // Esc 关闭菜单
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });

  // 从手机宽度切回桌面时恢复页面滚动，避免残留状态
  window.addEventListener('resize', function () {
    if (window.innerWidth > BREAKPOINT && nav.classList.contains('open')) setOpen(false);
  });

  // BFCache / 页面恢复时确保菜单状态干净
  window.addEventListener('pageshow', function () {
    if (!nav.classList.contains('open')) document.body.classList.remove('mobile-menu-open');
  });
})();
