/* 主题切换：记住用户选择，并同步到 <html data-theme> */
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function apply(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
  }

  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
  }

  // 用户没手动选过时，跟随系统变化
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSys = function (e) {
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (err) {}
      if (!saved) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
    else if (mq.addListener) mq.addListener(onSys);
  } catch (e) {}
})();
