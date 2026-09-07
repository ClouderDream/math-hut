/* 阅读进度条 + 目录高亮 */
(function () {
  var bar = document.getElementById('readProgress');
  var content = document.getElementById('postContent');

  /* ---- 进度条：只在文章页有 #postContent 时启用 ---- */
  if (bar && content) {
    var ticking = false;
    function update() {
      var rect = content.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var pct = total <= 0 ? (rect.bottom <= window.innerHeight ? 100 : 0)
        : Math.min(100, Math.max(0, (-rect.top / total) * 100));
      bar.style.width = pct.toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- 目录当前位置高亮 ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-toc-link]'));
  if (!links.length) return;

  var targets = links.map(function (a) {
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    return { link: a, el: document.getElementById(id) };
  }).filter(function (t) { return t.el; });

  if (!targets.length) return;

  function highlight() {
    var pos = window.scrollY + 160;
    var current = null;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.offsetTop <= pos) current = targets[i];
    }
    targets.forEach(function (t) { t.link.classList.remove('active'); });
    if (current) current.link.classList.add('active');
  }

  var t2 = false;
  window.addEventListener('scroll', function () {
    if (!t2) { t2 = true; requestAnimationFrame(function () { highlight(); t2 = false; }); }
  }, { passive: true });
  highlight();
})();
