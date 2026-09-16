/** OCR 导入工作区：手写中文 + 数学公式图片/PDF → Mathpix Markdown → 初排版 → 插入文章。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var state = { file: null, objectUrl: '', raw: '', formatted: '', busy: false };
  var KEY_ID = 'hut_ocr_mathpix_app_id';
  var KEY_SECRET = 'hut_ocr_mathpix_app_key';

  function addStyle() {
    if ($('ocrWorkspaceStyle')) return;
    var s = document.createElement('style');
    s.id = 'ocrWorkspaceStyle';
    s.textContent = `
      .admin-app.admin-ocr-mode{grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important;grid-template-areas:"header" "main"!important}
      .admin-app.admin-ocr-mode .admin-side{display:none!important}
      .ocr-page{max-width:1600px;margin:0 auto;display:grid;gap:16px}
      .ocr-hero,.ocr-card{border:1px solid var(--admin-border);background:var(--admin-surface);border-radius:12px;padding:18px}
      .ocr-hero{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .ocr-hero h3,.ocr-card h4{margin:0 0 6px}.ocr-hero p,.ocr-card p{margin:0;color:var(--admin-muted)}
      .ocr-settings{display:grid;grid-template-columns:minmax(160px,.7fr) minmax(260px,1fr) auto;gap:12px;align-items:end;margin-top:14px}
      .ocr-settings .field{margin:0}.ocr-settings .btn{white-space:nowrap}
      .ocr-warning{margin-top:12px;padding:10px 12px;border-left:3px solid #b7863f;background:rgba(183,134,63,.08);font-size:12px;line-height:1.7;color:var(--admin-muted)}
      .ocr-work{display:grid;grid-template-columns:minmax(300px,.78fr) minmax(420px,1.22fr);gap:16px;min-height:560px}
      .ocr-drop{position:relative;min-height:250px;border:1.5px dashed var(--admin-border);border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:22px;cursor:pointer;background:var(--admin-bg);overflow:hidden}
      .ocr-drop.drag{border-color:var(--admin-accent);background:rgba(52,64,107,.06)}
      .ocr-drop img{max-width:100%;max-height:520px;object-fit:contain;border-radius:6px}.ocr-file-meta{margin-top:12px;font-size:12px;color:var(--admin-muted);word-break:break-all}
      .ocr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.ocr-actions .btn{min-width:110px}
      .ocr-progress{height:7px;background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:999px;overflow:hidden;margin-top:12px}.ocr-progress>i{display:block;height:100%;width:0;background:var(--admin-accent);transition:width .25s ease}
      .ocr-status{min-height:22px;margin-top:8px;font-size:12px;color:var(--admin-muted)}
      .ocr-result-card{display:flex;flex-direction:column;min-width:0}.ocr-result-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.ocr-result-tabs{display:flex;gap:6px}.ocr-mini-tab{border:1px solid var(--admin-border);background:transparent;border-radius:999px;padding:6px 10px;cursor:pointer}.ocr-mini-tab.active{background:#181816;color:#fff;border-color:#181816}
      .ocr-result-area{display:grid;grid-template-columns:1fr;min-height:430px;flex:1}.ocr-result-area textarea{width:100%;min-height:430px;resize:vertical;border:1px solid var(--admin-border);border-radius:8px;padding:14px;background:var(--admin-bg);color:inherit;font:13px/1.75 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.ocr-preview{min-height:430px;max-height:650px;overflow:auto;border:1px solid var(--admin-border);border-radius:8px;padding:20px;background:#fff}.ocr-preview img{max-width:100%}
      .ocr-score{font-size:12px;color:var(--admin-muted)}.ocr-score.low{color:#a33}
      @media(max-width:980px){.ocr-settings{grid-template-columns:1fr}.ocr-work{grid-template-columns:1fr}.ocr-drop{min-height:210px}.ocr-preview,.ocr-result-area textarea{min-height:320px}}
      @media(max-width:560px){.ocr-hero{align-items:flex-start;flex-direction:column}.ocr-card,.ocr-hero{padding:14px}.ocr-actions .btn{flex:1 1 42%}.ocr-drop{padding:14px}}
    `;
    document.head.appendChild(s);
  }

  function panelHtml() {
    return '<div class="ocr-page">' +
      '<section class="ocr-hero"><div><h3>OCR 导入 · 手写数学笔记</h3><p>图片或扫描 PDF → 中文/公式识别 → Markdown + LaTeX 初排版 → 人工校对后插入文章。</p></div><button class="btn ghost" type="button" id="ocrBackToArticle">返回文章编辑</button></section>' +
      '<section class="ocr-card"><h4>识别服务</h4><p>当前使用 Mathpix OCR。凭据只保存在本标签页的 sessionStorage，不写入仓库或 localStorage。</p>' +
        '<div class="ocr-settings"><label class="field"><span>Mathpix App ID</span><input id="ocrAppId" autocomplete="off" placeholder="your_app_id"></label><label class="field"><span>Mathpix App Key</span><input id="ocrAppKey" type="password" autocomplete="off" placeholder="仅本次浏览器会话保存"></label><button class="btn ghost" type="button" id="ocrSaveCredential">本次会话记住</button></div>' +
        '<div class="ocr-warning">安全提示：Mathpix 官方建议浏览器应用使用短期 app token 或服务端代理。当前“临时直连”适合你的个人后台快速使用，但 App Key 仍会存在当前页面内存/sessionStorage 中。后续如需更严格隔离，可再接 Cloudflare Worker 代理。识别结果不会自动发布。</div>' +
      '</section>' +
      '<div class="ocr-work">' +
        '<section class="ocr-card"><h4>1. 上传原稿</h4><p>支持 JPG / PNG / WebP / TIFF 与扫描 PDF。手机照片过大时会仅为 OCR 自动缩小副本，不修改原文件。</p>' +
          '<div class="ocr-drop" id="ocrDrop"><div id="ocrDropHint"><strong>拖入文件，或点击选择</strong><br><small>建议单页拍正、光线均匀、公式尽量清晰</small></div><img id="ocrImagePreview" alt="OCR 原稿预览" hidden></div>' +
          '<input id="ocrFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff,application/pdf" hidden>' +
          '<div class="ocr-file-meta" id="ocrFileMeta">尚未选择文件</div>' +
          '<div class="ocr-actions"><button class="btn primary" type="button" id="ocrRecognize">识别并初排版</button><button class="btn ghost" type="button" id="ocrClear">清空</button></div>' +
          '<div class="ocr-progress"><i id="ocrProgressFill"></i></div><div class="ocr-status" id="ocrStatus">等待上传</div>' +
        '</section>' +
        '<section class="ocr-card ocr-result-card"><div class="ocr-result-head"><div><h4>2. 校对与排版</h4><span class="ocr-score" id="ocrScore"></span></div><div class="ocr-result-tabs"><button class="ocr-mini-tab active" type="button" data-ocr-view="edit">Markdown</button><button class="ocr-mini-tab" type="button" data-ocr-view="preview">预览</button></div></div>' +
          '<div class="ocr-result-area"><textarea id="ocrResult" spellcheck="false" placeholder="识别结果会出现在这里。数学公式统一转换为 $...$ / $$...$$；低置信内容请对照原图人工核对。"></textarea><div class="ocr-preview post-body" id="ocrPreview" hidden></div></div>' +
          '<div class="ocr-actions"><button class="btn primary" type="button" id="ocrInsert">插入当前文章</button><button class="btn ghost" type="button" id="ocrReplace">替换当前正文</button><button class="btn ghost" type="button" id="ocrCopy">复制 Markdown</button></div>' +
        '</section>' +
      '</div>' +
    '</div>';
  }

  function inject() {
    var tabs = document.querySelector('.admin-header .tabs');
    if (tabs && !tabs.querySelector('[data-tab="ocr"]')) {
      var b = document.createElement('button');
      b.className = 'tab'; b.dataset.tab = 'ocr'; b.textContent = 'OCR 导入'; b.title = '手写图片 / 扫描 PDF 转 Markdown';
      var media = tabs.querySelector('[data-tab="media"]');
      tabs.insertBefore(b, media || null);
    }
    if (!$('tab-ocr')) {
      var main = $('mainArea'); if (!main) return;
      var panel = document.createElement('div'); panel.id = 'tab-ocr'; panel.hidden = true; panel.innerHTML = panelHtml(); main.appendChild(panel);
    }
    var id = ''; var key = '';
    try { id = sessionStorage.getItem(KEY_ID) || ''; key = sessionStorage.getItem(KEY_SECRET) || ''; } catch (e) {}
    if ($('ocrAppId')) $('ocrAppId').value = id;
    if ($('ocrAppKey')) $('ocrAppKey').value = key;
  }

  function setOcrMode(on) {
    var app = $('appView'); if (!app) return;
    app.classList.toggle('admin-ocr-mode', !!on);
    app.classList.toggle('admin-wide', !!on || (!on && document.querySelector('.tab.active') && ['media','settings','shortcuts'].includes(document.querySelector('.tab.active').dataset.tab)));
    var panel = $('tab-ocr'); if (panel) panel.hidden = !on;
    if (on) {
      ['tab-articles','tab-media','tab-settings','tab-shortcuts'].forEach(function (id) { var el = $(id); if (el) el.hidden = true; });
      document.querySelectorAll('.tab[data-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === 'ocr'); });
      if ($('headerTitle')) $('headerTitle').textContent = 'OCR 导入';
      if ($('newBtn')) $('newBtn').hidden = true;
    }
  }

  function progress(p, text, error) {
    if ($('ocrProgressFill')) $('ocrProgressFill').style.width = Math.max(0, Math.min(100, p)) + '%';
    if ($('ocrStatus')) { $('ocrStatus').textContent = text || ''; $('ocrStatus').style.color = error ? '#a33' : ''; }
    if (window.HUTProgress) {
      if (error) window.HUTProgress.error(text || 'OCR 失败');
      else if (p >= 100) window.HUTProgress.done(text || 'OCR 完成');
      else window.HUTProgress.set(p, text || 'OCR 处理中…');
    }
  }

  function credentials() {
    var appId = ($('ocrAppId') && $('ocrAppId').value || '').trim();
    var appKey = ($('ocrAppKey') && $('ocrAppKey').value || '').trim();
    if (!appId || !appKey) throw new Error('请先填写 Mathpix App ID 和 App Key。');
    return { appId: appId, appKey: appKey };
  }

  function setFile(file) {
    if (!file) return;
    var ok = /^image\//.test(file.type) || /\.pdf$/i.test(file.name || '');
    if (!ok) { progress(0, '仅支持图片或 PDF。', true); return; }
    state.file = file;
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    var img = $('ocrImagePreview'), hint = $('ocrDropHint');
    if (/^image\//.test(file.type)) { img.src = state.objectUrl; img.hidden = false; if (hint) hint.hidden = true; }
    else { img.hidden = true; img.removeAttribute('src'); if (hint) { hint.hidden = false; hint.innerHTML = '<strong>PDF 已选择</strong><br><small>识别时将按文档布局处理全部页面</small>'; } }
    if ($('ocrFileMeta')) $('ocrFileMeta').textContent = file.name + ' · ' + (file.size / 1024 / 1024).toFixed(2) + ' MB';
    progress(0, '文件已就绪');
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(); var u = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(u); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error('图片读取失败')); };
      img.src = u;
    });
  }

  async function prepareImage(file) {
    if (file.size <= 4 * 1024 * 1024) return file;
    var img = await loadImage(file); var max = 2400, w = img.naturalWidth, h = img.naturalHeight, scale = Math.min(1, max / Math.max(w, h));
    var canvas = document.createElement('canvas'); canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.92); });
    if (!blob) throw new Error('图片压缩失败');
    return new File([blob], (file.name || 'scan').replace(/\.[^.]+$/, '') + '-ocr.jpg', { type: 'image/jpeg' });
  }

  function normalizeMmd(text) {
    var s = String(text || '').replace(/\r\n/g, '\n');
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, function (_, x) { return '\n$$\n' + x.trim() + '\n$$\n'; });
    s = s.replace(/\\\(([\s\S]*?)\\\)/g, function (_, x) { return '$' + x.trim() + '$'; });
    s = s.replace(/\\section\*?\{([^{}]+)\}/g, '## $1');
    s = s.replace(/\\subsection\*?\{([^{}]+)\}/g, '### $1');
    s = s.replace(/\\subsubsection\*?\{([^{}]+)\}/g, '#### $1');
    s = s.replace(/\\title\{([^{}]+)\}/g, '# $1');
    s = s.replace(/\n{4,}/g, '\n\n\n').trim();
    return s;
  }

  async function recognizeImage(file, cred) {
    var upload = await prepareImage(file);
    var form = new FormData();
    form.append('file', upload, upload.name);
    form.append('options_json', JSON.stringify({
      enable_document_layout: true,
      math_inline_delimiters: ['\\(', '\\)'],
      math_display_delimiters: ['\\[', '\\]'],
      rm_spaces: true,
      include_word_data: false,
      include_line_data: true
    }));
    progress(20, '正在识别手写文字与公式…');
    var res = await fetch('https://api.mathpix.com/v3/text', { method: 'POST', headers: { app_id: cred.appId, app_key: cred.appKey }, body: form });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || data.error_info && data.error_info.message || ('Mathpix HTTP ' + res.status));
    progress(82, '识别完成，正在整理 Markdown…');
    return { text: data.text || data.latex_styled || '', confidence: typeof data.confidence === 'number' ? data.confidence : null };
  }

  async function recognizePdf(file, cred) {
    var form = new FormData(); form.append('file', file, file.name);
    form.append('options_json', JSON.stringify({ rm_spaces: true, enable_tables_fallback: true }));
    progress(10, '正在上传 PDF…');
    var res = await fetch('https://api.mathpix.com/v3/pdf', { method: 'POST', headers: { app_id: cred.appId, app_key: cred.appKey }, body: form });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.pdf_id) throw new Error(data.error || data.error_info && data.error_info.message || ('PDF 提交失败 HTTP ' + res.status));
    var id = data.pdf_id, started = Date.now();
    while (true) {
      if (Date.now() - started > 10 * 60 * 1000) throw new Error('PDF 识别超时，请稍后重试。');
      await sleep(1800);
      var st = await fetch('https://api.mathpix.com/v3/pdf/' + encodeURIComponent(id), { headers: { app_id: cred.appId, app_key: cred.appKey } });
      var info = await st.json().catch(function () { return {}; });
      if (info.status === 'error') throw new Error(info.error || 'PDF 识别失败');
      var pct = Number(info.percent_done || 0); progress(20 + Math.min(65, pct * .65), 'PDF 识别中 · ' + (info.num_pages_completed || 0) + '/' + (info.num_pages || '?') + ' 页');
      if (info.status === 'completed') break;
    }
    progress(90, '正在获取识别结果…');
    var out = await fetch('https://api.mathpix.com/v3/pdf/' + encodeURIComponent(id) + '.mmd', { headers: { app_id: cred.appId, app_key: cred.appKey } });
    if (!out.ok) throw new Error('PDF 结果下载失败 HTTP ' + out.status);
    return { text: await out.text(), confidence: null };
  }

  function renderPreview() {
    var text = $('ocrResult') ? $('ocrResult').value : '';
    var box = $('ocrPreview'); if (!box) return;
    try {
      var md = window.markdownit ? window.markdownit({ html: false, linkify: true, typographer: false }) : null;
      if (md && window.mdMath) window.mdMath(md, { katex: window.katex, macros: H.macros || {} });
      box.innerHTML = md ? md.render(text) : '<pre>' + esc(text) + '</pre>';
    } catch (e) { box.innerHTML = '<pre>' + esc(text) + '</pre>'; }
  }

  async function runOcr() {
    if (state.busy) return;
    if (!state.file) { progress(0, '请先选择图片或 PDF。', true); return; }
    var cred;
    try { cred = credentials(); } catch (e) { progress(0, e.message, true); return; }
    state.busy = true; if ($('ocrRecognize')) $('ocrRecognize').disabled = true;
    try {
      progress(5, '准备 OCR…');
      var isPdf = /\.pdf$/i.test(state.file.name || '') || state.file.type === 'application/pdf';
      var result = isPdf ? await recognizePdf(state.file, cred) : await recognizeImage(state.file, cred);
      state.raw = result.text || ''; state.formatted = normalizeMmd(state.raw);
      if ($('ocrResult')) $('ocrResult').value = state.formatted;
      if ($('ocrScore')) {
        if (result.confidence == null) { $('ocrScore').textContent = 'PDF：请逐页对照校对'; $('ocrScore').className = 'ocr-score'; }
        else { var pc = Math.round(result.confidence * 100); $('ocrScore').textContent = '识别置信度约 ' + pc + '%'; $('ocrScore').className = 'ocr-score' + (pc < 85 ? ' low' : ''); }
      }
      renderPreview(); progress(100, 'OCR 完成，请对照原稿校对');
    } catch (e) { console.error(e); progress(100, 'OCR 失败：' + (e.message || e), true); }
    finally { state.busy = false; if ($('ocrRecognize')) $('ocrRecognize').disabled = false; }
  }

  function insertIntoArticle(replace) {
    var ta = $('fBody'), src = $('ocrResult'); if (!ta || !src) return;
    var text = src.value.trim(); if (!text) { progress(0, '没有可插入的识别结果。', true); return; }
    if (replace) {
      if (ta.value.trim() && !confirm('将用 OCR 结果替换当前文章正文，是否继续？')) return;
      ta.value = text;
    } else {
      var start = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
      var end = ta.selectionEnd == null ? start : ta.selectionEnd;
      var before = ta.value.slice(0, start), after = ta.value.slice(end);
      var lead = before && !/\n\s*$/.test(before) ? '\n\n' : '';
      var tail = after && !/^\s*\n/.test(after) ? '\n\n' : '';
      ta.value = before + lead + text + tail + after;
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    var articleTab = document.querySelector('.tab[data-tab="articles"]'); if (articleTab) articleTab.click();
    setTimeout(function () { ta.focus(); }, 80);
    if (window.HUTProgress) window.HUTProgress.done(replace ? 'OCR 已替换正文' : 'OCR 已插入正文');
  }

  function clearAll() {
    state.file = null; state.raw = ''; state.formatted = '';
    if (state.objectUrl) { URL.revokeObjectURL(state.objectUrl); state.objectUrl = ''; }
    if ($('ocrFileInput')) $('ocrFileInput').value = '';
    if ($('ocrImagePreview')) { $('ocrImagePreview').hidden = true; $('ocrImagePreview').removeAttribute('src'); }
    if ($('ocrDropHint')) { $('ocrDropHint').hidden = false; $('ocrDropHint').innerHTML = '<strong>拖入文件，或点击选择</strong><br><small>建议单页拍正、光线均匀、公式尽量清晰</small>'; }
    if ($('ocrFileMeta')) $('ocrFileMeta').textContent = '尚未选择文件';
    if ($('ocrResult')) $('ocrResult').value = '';
    if ($('ocrPreview')) $('ocrPreview').innerHTML = '';
    if ($('ocrScore')) $('ocrScore').textContent = '';
    progress(0, '等待上传');
  }

  document.addEventListener('DOMContentLoaded', function () {
    addStyle(); inject();
    document.addEventListener('click', function (ev) {
      var tab = ev.target && ev.target.closest ? ev.target.closest('.tab[data-tab]') : null;
      if (tab) {
        if (tab.dataset.tab === 'ocr') { ev.preventDefault(); setTimeout(function () { setOcrMode(true); }, 0); }
        else setTimeout(function () { setOcrMode(false); }, 0);
      }
      if (ev.target && ev.target.id === 'ocrDrop') $('ocrFileInput').click();
      if (ev.target && ev.target.closest && ev.target.closest('#ocrDrop') && ev.target.id !== 'ocrDrop') $('ocrFileInput').click();
      if (ev.target.id === 'ocrRecognize') runOcr();
      if (ev.target.id === 'ocrClear') clearAll();
      if (ev.target.id === 'ocrInsert') insertIntoArticle(false);
      if (ev.target.id === 'ocrReplace') insertIntoArticle(true);
      if (ev.target.id === 'ocrBackToArticle') { var a = document.querySelector('.tab[data-tab="articles"]'); if (a) a.click(); }
      if (ev.target.id === 'ocrSaveCredential') {
        try { sessionStorage.setItem(KEY_ID, $('ocrAppId').value.trim()); sessionStorage.setItem(KEY_SECRET, $('ocrAppKey').value.trim()); progress(0, 'OCR 凭据已仅在本次标签页会话保存'); } catch (e) { progress(0, '浏览器阻止 sessionStorage：' + e.message, true); }
      }
      if (ev.target.id === 'ocrCopy') {
        var t = $('ocrResult').value || ''; if (!t) return;
        navigator.clipboard.writeText(t).then(function () { progress(0, 'Markdown 已复制'); }).catch(function () { progress(0, '复制失败，请手动复制', true); });
      }
      var mini = ev.target.closest && ev.target.closest('[data-ocr-view]');
      if (mini) {
        document.querySelectorAll('[data-ocr-view]').forEach(function (b) { b.classList.toggle('active', b === mini); });
        var preview = mini.dataset.ocrView === 'preview';
        $('ocrResult').hidden = preview; $('ocrPreview').hidden = !preview; if (preview) renderPreview();
      }
    }, true);
    document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'ocrFileInput') setFile(ev.target.files && ev.target.files[0]); }, true);
    var drop = $('ocrDrop'); if (drop) {
      ['dragenter','dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
      ['dragleave','drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('drag'); }); });
      drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setFile(f); });
    }
    if ($('ocrResult')) $('ocrResult').addEventListener('input', function () { state.formatted = this.value; });
  });
})();