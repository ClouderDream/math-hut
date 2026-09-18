/* 代码块：一键复制 */
(function () {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;

    var block = btn.closest('.code-block');
    if (!block) return;
    var codeEl = block.querySelector('code');
    if (!codeEl) return;

    // 取纯文本（去掉行号伪元素不影响 textContent）
    var lines = Array.prototype.map.call(codeEl.querySelectorAll('.code-line'), function (el) {
      return el.textContent;
    });
    var text = lines.length ? lines.join('\n') : codeEl.textContent;

    var done = function () {
      var old = btn.textContent;
      btn.textContent = '已复制';
      btn.classList.add('done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1600);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
    } else {
      fallback(text, done);
    }
  });

  function fallback(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) {}
    document.body.removeChild(ta);
  }
})();
